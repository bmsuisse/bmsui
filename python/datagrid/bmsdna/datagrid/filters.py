"""Shared filter/sort contract for bmsdna.datagrid.

This mirrors, field-for-field and operator-for-operator, the TypeScript
contract in `@bmsuisse/datagrid` (see `packages/datagrid/src/filter/types.ts`), so
a `GridState` serialized as JSON by the frontend grid in "server" mode can be
parsed directly into these models.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Shared so every model in this module both accepts snake_case/camelCase on the
# way in (`populate_by_name`) and emits camelCase by default on the way out
# (`serialize_by_alias`) — matching the TS contract's field names even when a
# caller forgets to pass `by_alias=True` explicitly on `model_dump()`.
_CAMEL_CASE_IO = ConfigDict(populate_by_name=True, serialize_by_alias=True)

FilterOperator = Literal[
    "eq",
    "neq",
    "lt",
    "lte",
    "gt",
    "gte",
    "in",
    "notIn",
    "contains",
    "doesNotContain",
    "startsWith",
    "endsWith",
    "isEmpty",
    "isNotEmpty",
    "isNull",
    "isNotNull",
    "between",
]

# Operators that never carry a `value` (unary presence/absence checks).
UNARY_OPERATORS: frozenset[FilterOperator] = frozenset(
    ["isEmpty", "isNotEmpty", "isNull", "isNotNull"]
)


class FilterDescriptor(BaseModel):
    """A single leaf filter condition.

    `field` is either a plain field name, or a pre-qualified path (e.g.
    `["c", "customer_name"]` for `c.customer_name` in a join) — callers
    pre-qualify ambiguous fields themselves, this package never infers joins.
    """

    field: str | list[str]
    operator: FilterOperator
    value: object | None = None
    ignore_case: bool = Field(default=False, alias="ignoreCase")

    model_config = _CAMEL_CASE_IO


class CompositeFilterDescriptor(BaseModel):
    """Combines two or more filters (leaf or nested composite) with AND/OR logic."""

    logic: Literal["and", "or"]
    filters: list[FilterDescriptor | CompositeFilterDescriptor]


FilterNode = FilterDescriptor | CompositeFilterDescriptor


class SortDescriptor(BaseModel):
    field: str
    dir: Literal["asc", "desc"]


class GridState(BaseModel):
    """The full sort/filter/pagination state a <DataGrid> tracks and can emit."""

    filter: CompositeFilterDescriptor | None = None
    sort: list[SortDescriptor] = Field(default_factory=list)
    page: int = 0
    page_size: int = Field(default=20, alias="pageSize")

    model_config = _CAMEL_CASE_IO


def is_filter_descriptor(node: FilterNode) -> bool:
    """True for a leaf `FilterDescriptor`, false for a `CompositeFilterDescriptor`."""
    return isinstance(node, FilterDescriptor)


def is_composite(node: FilterNode) -> bool:
    """True for a `CompositeFilterDescriptor`, false for a leaf `FilterDescriptor`."""
    return isinstance(node, CompositeFilterDescriptor)


def field_key(field: str | list[str]) -> str:
    """Renders a `field` (string or pre-qualified path) as a single dotted key."""
    return field if isinstance(field, str) else ".".join(field)


CompositeFilterDescriptor.model_rebuild()
