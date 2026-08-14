"""Connects to a local Meilisearch instance and loads the same JSON fixtures
`load_fixtures.py` loads into SQLite — one Meilisearch index per entity, with
`filterableAttributes`/`sortableAttributes` set explicitly at index-creation
time.

Meilisearch requires filterable/sortable attributes to be declared before
`filter`/`sort` will work on a search — this is not optional and not
automatic (an unfilterable/unsortable attribute silently produces an
"invalid_search_filter"/"invalid_search_sort" error from the API instead).
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

import meilisearch
from meilisearch.client import Client
from meilisearch.errors import MeilisearchError

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# Must match the --master-key the Meilisearch binary is started with in
# packages/datagrid/playwright.config.ts's webServer entry — dev-only, fixed,
# never used against a real deployment.
MEILISEARCH_URL = os.environ.get("MEILISEARCH_URL", "http://127.0.0.1:7700")
MEILISEARCH_API_KEY = os.environ.get("MEILISEARCH_API_KEY", "bmsui-datagrid-dev-master-key")

# entity -> (filterable attributes, sortable attributes). Mirrors SCHEMAS in
# load_fixtures.py, but expressed in Meilisearch's own vocabulary rather than
# SQL column types.
INDEX_ATTRIBUTES: dict[str, tuple[list[str], list[str]]] = {
    "orders": (
        ["id", "customer_name", "status", "amount", "is_paid", "created_at"],
        # Must cover every attribute the demo app's columns mark `sortable:
        # true` (see packages/datagrid/demo/src/App.tsx) — is_paid was
        # missing here even though its column is sortable, so sorting by it
        # against this engine raised Meilisearch's own invalid_search_sort
        # error instead of returning results.
        ["customer_name", "status", "amount", "is_paid", "created_at"],
    ),
    "customers": (
        ["id", "name", "email", "since", "active"],
        ["name", "since", "active"],
    ),
}

CONNECT_RETRY_ATTEMPTS = 20
CONNECT_RETRY_DELAY_SECONDS = 0.5


async def connect_meilisearch() -> Client | None:
    """Polls Meilisearch's /health with a short retry loop and returns a connected
    client, or None if it never comes up (the /api/meili routes then 501).

    Meilisearch takes a moment to come up when started as a fresh process
    (see packages/datagrid/playwright.config.ts's webServer entry) — this
    exists so the FastAPI app doesn't just assume it's already reachable the
    instant the app starts.
    """
    client = meilisearch.Client(MEILISEARCH_URL, MEILISEARCH_API_KEY)
    for _attempt in range(CONNECT_RETRY_ATTEMPTS):
        try:
            client.health()
            return client
        except MeilisearchError:
            await asyncio.sleep(CONNECT_RETRY_DELAY_SECONDS)
    return None


def load_fixtures_meili(client: Client) -> None:
    """Creates one Meilisearch index per fixture and loads its rows, waiting for
    every setup task (index creation, attribute config, document import) to
    finish before returning — callers can search immediately afterward."""
    for entity, (filterable, sortable) in INDEX_ATTRIBUTES.items():
        # create_index() enqueues a task rather than raising synchronously —
        # a pre-existing index only surfaces as a *failed* task, discovered
        # by wait_for_task, not as an exception from create_index() itself.
        create_result = client.wait_for_task(client.create_index(entity, {"primaryKey": "id"}).task_uid)
        if create_result.status == "failed" and create_result.error.get("code") != "index_already_exists":
            raise RuntimeError(f"failed to create Meilisearch index {entity!r}: {create_result.error}")

        index = client.index(entity)
        client.wait_for_task(index.update_filterable_attributes(filterable).task_uid)
        client.wait_for_task(index.update_sortable_attributes(sortable).task_uid)

        rows = json.loads((FIXTURES_DIR / f"{entity}.json").read_text())
        client.wait_for_task(index.add_documents(rows).task_uid)
