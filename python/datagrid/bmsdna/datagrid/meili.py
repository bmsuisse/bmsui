"""Turns the shared filter/sort contract into a Meilisearch filter expression.

Meilisearch's filter DSL is a string ("field = value AND other > 1"), not an
AST like SQL — so unlike `sql.py`, this module can't lean on a query builder
library for safety. Every value that reaches the output string goes through
the single `_quote()` helper below, and every field name through `_field_ref()`
— that's the whole injection-safety story for this module, so both are worth
testing directly against escaping edge cases (embedded quotes, backslashes,
parens), not just through the higher-level `build_filter_expr` happy path.
"""

from __future__ import annotations

import re

from bmsdna.datagrid.filters import (
    CompositeFilterDescriptor,
    FilterDescriptor,
    FilterNode,
    SortDescriptor,
)

# Field names matching this pattern render bare; anything else (spaces,
# punctuation, backticks themselves) gets backtick-quoted by _field_ref.
_BARE_FIELD_PATTERN = re.compile(r"^[A-Za-z0-9_.]+$")

# contains/doesNotContain/startsWith/endsWith have no faithful Meilisearch
# equivalent: Meilisearch's filter DSL has no substring/prefix/suffix
# operator (only exact match, comparisons, IN, and the EMPTY/EXISTS/NULL
# checks below). A sibling repo once mapped `endsWith` to Meilisearch's
# `CONTAINS` operator, which is a different, incorrect match — this module
# raises instead of repeating that mistake. Callers that need substring
# matching should route it through the search engine's own full-text query
# (the `q` argument to `index.search`), not this filter expression.
_UNSUPPORTED_OPERATORS = frozenset(["contains", "doesNotContain", "startsWith", "endsWith"])


class UnsupportedOperatorError(ValueError):
    """Raised when a FilterDescriptor operator has no faithful Meilisearch equivalent."""


def _quote(value: object) -> str:
    """Renders a scalar as a Meilisearch filter literal, escaping strings properly.

    Handles exactly the value shapes a FilterDescriptor.value can carry:
    `None`, `bool`, `int`/`float`, and `str`. `bool` is checked before
    `int`/`float` because `bool` is a subclass of `int` in Python — without
    that ordering, `True` would render as the number `1` instead of `true`.
    """
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    text = str(value)
    escaped = text.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def _field_ref(field: str | list[str]) -> str:
    """Renders a (possibly pre-qualified) field path, backtick-quoting it if needed."""
    name = field if isinstance(field, str) else ".".join(field)
    if _BARE_FIELD_PATTERN.match(name):
        return name
    escaped = name.replace("\\", "\\\\").replace("`", "\\`")
    return f"`{escaped}`"


def _comparable_key(value: object) -> object:
    """Best-effort coercion for comparing two `between` bounds that might be
    mismatched types (e.g. a numeric string "10" vs. an actual int 5) —
    mirrors evaluate.ts's `asFiniteNumber` and sql.py's identical helper.
    Without this, the bound-reordering `except TypeError` below would
    silently give up on exactly the mismatched-type case it's meant to
    guard, since `"10" > 5` raises TypeError in Python even though both
    sides are clearly comparable once coerced.
    """
    if isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return value
    return value


def _ignore_case_matters(node: FilterDescriptor) -> bool:
    """Whether `ignoreCase` would actually change this leaf's rendering.

    Mirrors sql.py's `ignore_case_str`/`ignore_case_list` type-gating: a
    numeric eq (`{operator: "eq", value: 30, ignoreCase: true}`) has nothing
    for case-folding to apply to, so `ignoreCase` being set is a no-op there
    on every engine — raising for it here would reject a filter that client
    mode and sql.py both handle identically (by ignoring the flag).
    """
    if node.operator in ("eq", "neq"):
        return isinstance(node.value, str)
    if node.operator in ("in", "notIn"):
        return isinstance(node.value, list) and any(isinstance(v, str) for v in node.value)
    return False


def _render_leaf(node: FilterDescriptor) -> str:
    if node.operator in _UNSUPPORTED_OPERATORS:
        raise UnsupportedOperatorError(
            f"Meilisearch has no filter-expression equivalent for operator {node.operator!r}; "
            "route substring/prefix/suffix matching through the engine's own text search (`q`) instead."
        )
    if node.ignore_case and _ignore_case_matters(node):
        # Meilisearch's filter DSL has no case-insensitive comparison
        # operator (unlike SQL's ILIKE/LOWER(...) — see sql.py) — string
        # equality/IN in a Meilisearch filter is always exact-match. Silently
        # dropping ignoreCase here would make the same FilterDescriptor match
        # different rows in client mode (case-insensitive) vs. this engine
        # (case-sensitive), so this raises the same way the four unsupported
        # substring operators above do, rather than mismapping.
        raise UnsupportedOperatorError(
            f"Meilisearch has no case-insensitive filter-expression equivalent for ignoreCase + {node.operator!r}."
        )

    field = _field_ref(node.field)
    op = node.operator

    if op == "isNull":
        return f"{field} IS NULL"
    if op == "isNotNull":
        return f"{field} IS NOT NULL"
    if op == "isEmpty":
        # OR in IS NULL: evaluateFilter/sql.py both treat a null/undefined
        # value as "empty" too (see evaluate.ts's isEmptyValue), but
        # Meilisearch's own IS EMPTY is documented against empty strings/
        # arrays, not necessarily a missing/null attribute — don't assume
        # they coincide.
        return f"({field} IS NULL OR {field} IS EMPTY)"
    if op == "isNotEmpty":
        return f"({field} IS NOT NULL AND {field} IS NOT EMPTY)"

    if op == "eq":
        return f"{field} = {_quote(node.value)}"
    if op == "neq":
        return f"{field} != {_quote(node.value)}"

    if op == "lt":
        return f"{field} < {_quote(node.value)}"
    if op == "lte":
        return f"{field} <= {_quote(node.value)}"
    if op == "gt":
        return f"{field} > {_quote(node.value)}"
    if op == "gte":
        return f"{field} >= {_quote(node.value)}"

    if op == "between":
        if not (isinstance(node.value, list) and len(node.value) == 2):
            raise ValueError(f"'between' requires a 2-element [min, max] value, got {node.value!r}")
        low, high = node.value
        try:
            # Order-independent, matching evaluateFilter/sql.py's `between` —
            # Meilisearch's `field a TO b` range filter is not symmetric
            # either, so a reversed [max, min] would otherwise match nothing.
            if _comparable_key(low) > _comparable_key(high):  # ty: ignore[unsupported-operator]
                low, high = high, low
        except TypeError:
            pass  # genuinely incomparable even after coercion — leave order as given
        return f"{field} {_quote(low)} TO {_quote(high)}"

    if op == "in":
        values = node.value if isinstance(node.value, list) else []
        if not values:
            # Matches sql.py/evaluateFilter: `in` against an empty candidate
            # list is always false. Meilisearch's filter DSL has no boolean
            # literal to fall back to (see _render's empty-composite guard
            # below), so this raises rather than sending a possibly-invalid
            # or engine-dependent `field IN []` filter string.
            raise ValueError("'in' with an empty value list has no Meilisearch filter-expression equivalent")
        return f"{field} IN [{', '.join(_quote(v) for v in values)}]"
    if op == "notIn":
        if not isinstance(node.value, list):
            # Missing/malformed value (not even an empty list): evaluateFilter
            # requires Array.isArray(value) and is false (never a match) for
            # anything else — a different case from an explicit empty list
            # below, which is true for any non-null value. Meilisearch has no
            # boolean-literal filter to render "never matches" as (the same
            # reason build_filter_expr raises on an empty composite), so this
            # raises too rather than conflating it with the empty-list case.
            raise ValueError(f"'notIn' requires a list value, got {node.value!r}")
        values = node.value
        if not values:
            # Matches sql.py/evaluateFilter: `notIn` against an empty
            # candidate list is true for any non-null row value.
            return f"{field} IS NOT NULL"
        return f"NOT {field} IN [{', '.join(_quote(v) for v in values)}]"

    raise ValueError(f"unknown filter operator: {op!r}")  # pragma: no cover - FilterOperator is exhaustive


def _render(node: FilterNode) -> str:
    if isinstance(node, FilterDescriptor):
        return _render_leaf(node)

    if not node.filters:
        raise ValueError(
            f"cannot render an empty composite filter (logic={node.logic!r}): "
            "Meilisearch's filter DSL has no boolean-literal equivalent of an "
            "always-true/always-false condition to fall back to."
        )

    joiner = " AND " if node.logic == "and" else " OR "
    parts = [
        f"({_render(child)})" if isinstance(child, CompositeFilterDescriptor) else _render(child)
        for child in node.filters
    ]
    return joiner.join(parts)


def build_filter_expr(filter: CompositeFilterDescriptor | FilterDescriptor | None) -> str | None:
    """Renders a filter tree as a Meilisearch filter expression string, or None for "no filter"."""
    if filter is None:
        return None
    return _render(filter)


def build_sort(sort: list[SortDescriptor]) -> list[str]:
    """Renders a sort list as Meilisearch's `"attribute:asc"` / `"attribute:desc"` strings."""
    return [f"{s.field}:{s.dir}" for s in sort]


def build_search_params(
    filter: FilterNode | None,
    sort: list[SortDescriptor],
    offset: int,
    limit: int,
) -> dict:
    """Builds the kwargs dict for `index.search(q, **params)`: filter/sort/offset/limit."""
    params: dict[str, object] = {"offset": offset, "limit": limit}
    expr = build_filter_expr(filter)
    if expr is not None:
        params["filter"] = expr
    rendered_sort = build_sort(sort)
    if rendered_sort:
        params["sort"] = rendered_sort
    return params
