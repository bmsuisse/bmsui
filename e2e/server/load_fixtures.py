"""Loads the hand-editable JSON fixtures into an in-memory SQLite database.

Deliberately does *not* rely on SQLite's loose typing (it happily stores a
string in an INTEGER column with no error) — every column gets an explicit
declared type per fixture, so dates/bools/numbers actually behave as their
types when `bmsdna.datagrid.sql` builds comparisons/BETWEEN/etc. against
them. Runs once at FastAPI startup (see main.py's lifespan).
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Literal

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# entity -> {column: SQLite column type}. Declared explicitly rather than
# inferred from the JSON, so every row is guaranteed to match regardless of
# what any individual fixture row happens to look like.
SCHEMAS: dict[str, dict[str, str]] = {
    "orders": {
        "id": "TEXT PRIMARY KEY",
        "customer_name": "TEXT",
        "status": "TEXT",
        "amount": "REAL",
        "is_paid": "INTEGER",
        "created_at": "TEXT",
    },
    "customers": {
        "id": "TEXT PRIMARY KEY",
        "name": "TEXT",
        "email": "TEXT",
        "since": "TEXT",
        "active": "INTEGER",
    },
}

Entity = Literal["orders", "customers"]


def _coerce(value: object, column_type: str) -> object:
    """Coerces a JSON value to match its declared SQLite column type (mainly bool -> 0/1)."""
    if column_type == "INTEGER" and isinstance(value, bool):
        return int(value)
    return value


def load_fixtures(conn: sqlite3.Connection) -> None:
    """Creates one table per fixture in `SCHEMAS` and loads its rows from `fixtures/{entity}.json`."""
    cursor = conn.cursor()
    for entity, schema in SCHEMAS.items():
        columns_sql = ", ".join(f"{name} {sql_type}" for name, sql_type in schema.items())
        cursor.execute(f"CREATE TABLE {entity} ({columns_sql})")

        rows = json.loads((FIXTURES_DIR / f"{entity}.json").read_text())
        column_names = list(schema.keys())
        placeholders = ", ".join(f":{name}" for name in column_names)
        insert_sql = f"INSERT INTO {entity} ({', '.join(column_names)}) VALUES ({placeholders})"

        coerced_rows = [
            {name: _coerce(row.get(name), schema[name]) for name in column_names} for row in rows
        ]
        cursor.executemany(insert_sql, coerced_rows)
    conn.commit()
