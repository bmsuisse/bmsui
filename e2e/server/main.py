"""FastAPI harness for the @bmsuisse/datagrid Playwright e2e suite.

Two query routes per entity, exercising the two engines bmsdna.datagrid
supports — never mixed in a single request:

  POST /api/sql/{entity}/query    -> bmsdna.datagrid.sql   against SQLite
  POST /api/meili/{entity}/query  -> bmsdna.datagrid.meili  against Meilisearch

Both take the same body shape (a `GridState`: filter/sort/page/pageSize) so
the demo app can point the same `<DataGrid>` at either one.

If Meilisearch never comes up (e.g. its binary isn't set up, or the SQL-only
half of the suite is what's running), /api/meili degrades to a 501 instead of
the app failing to start.
"""

from __future__ import annotations

import sqlite3
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from bmsdna.datagrid.filters import GridState
from bmsdna.datagrid.meili import build_search_params
from bmsdna.datagrid.sql import build_count, build_select
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from meilisearch.errors import MeilisearchApiError

from load_fixtures import SCHEMAS, load_fixtures
from load_fixtures_meili import connect_meilisearch, load_fixtures_meili

ENTITIES = frozenset(SCHEMAS.keys())


def _require_known_entity(entity: str) -> None:
    if entity not in ENTITIES:
        raise HTTPException(status_code=404, detail=f"unknown entity: {entity!r}")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # SQLite's LIKE is case-insensitive for ASCII by default, regardless of
    # whether bmsdna.datagrid.sql emits LIKE or ILIKE/LOWER(...) — that's a
    # connection-level setting, not something the generated SQL controls (see
    # sql.py's module docstring). Without this, a case-sensitive `contains`
    # filter (ignoreCase=False) would behave case-insensitively here but not
    # against Postgres or the TS client evaluator.
    conn.execute("PRAGMA case_sensitive_like = ON")
    load_fixtures(conn)
    app.state.sqlite_conn = conn

    # Meilisearch takes a moment to come up when started as a fresh process
    # (see packages/datagrid/playwright.config.ts's webServer entries) — poll
    # for it with a short retry loop rather than assuming it's already
    # reachable the instant this app starts.
    client = await connect_meilisearch()
    if client is not None:
        load_fixtures_meili(client)
    app.state.meili_client = client

    yield
    conn.close()


app = FastAPI(lifespan=lifespan)

# The demo app's dev server proxies /api to this app (see
# packages/datagrid/demo/vite.config.ts), so in normal Playwright-driven use
# this is same-origin and CORS is moot — but permissive CORS costs nothing
# here and helps anyone poking at the API directly (curl, a REPL, etc.)
# during local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, object]:
    return {"status": "ok", "meilisearch": app.state.meili_client is not None}


@app.post("/api/sql/{entity}/query")
async def sql_query(entity: str, state: GridState) -> dict[str, object]:
    _require_known_entity(entity)
    conn: sqlite3.Connection = app.state.sqlite_conn

    select_sql, select_params = build_select(
        entity,
        state.filter,
        state.sort,
        offset=state.page * state.page_size,
        limit=state.page_size,
        dialect="sqlite",
    )
    count_sql, count_params = build_count(entity, state.filter, dialect="sqlite")

    rows = [dict(row) for row in conn.execute(select_sql, select_params).fetchall()]
    row_count = conn.execute(count_sql, count_params).fetchone()[0]
    return {"rows": rows, "rowCount": row_count}


@app.post("/api/meili/{entity}/query")
async def meili_query(entity: str, state: GridState) -> dict[str, object]:
    _require_known_entity(entity)
    client = app.state.meili_client
    if client is None:
        raise HTTPException(status_code=501, detail="Meilisearch is not reachable")

    try:
        params = build_search_params(
            state.filter,
            state.sort,
            offset=state.page * state.page_size,
            limit=state.page_size,
        )
    except ValueError as error:
        # Catches both UnsupportedOperatorError (e.g. a `contains`/
        # `startsWith`/`endsWith` filter — meaningful on a string column's
        # default widget, but Meilisearch's filter DSL has no substring/
        # prefix/suffix operator) and the plain ValueErrors meili.py raises
        # for shapes it has no rendering for at all (e.g. `in` with an empty
        # value list, or an empty composite filter) — UnsupportedOperatorError
        # is itself a ValueError subclass, but catching only the narrower
        # type would let those other cases through as an unhandled 500. A
        # 422 with the real reason is far more useful either way.
        raise HTTPException(status_code=422, detail=str(error)) from error

    try:
        result = client.index(entity).search("", params)
    except MeilisearchApiError as error:
        # e.g. sorting/filtering by an attribute that isn't declared
        # filterable/sortable on this index (see load_fixtures_meili.py's
        # INDEX_ATTRIBUTES) — a real Meilisearch-side validation error that
        # build_search_params has no way to catch ahead of time, since it
        # doesn't know the index's configured attributes. Same reasoning as
        # the 422 above: surface the real reason instead of a bare 500.
        raise HTTPException(status_code=422, detail=str(error)) from error

    return {"rows": result["hits"], "rowCount": result["estimatedTotalHits"]}
