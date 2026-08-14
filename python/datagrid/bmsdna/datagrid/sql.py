"""Turns the shared filter/sort contract into a parameterized SQL statement.

Built on `sqlglot` for AST construction so rendering is dialect-aware (e.g.
`"postgres"` vs `"sqlite"`) and so every value goes through sqlglot's own
placeholder machinery rather than raw string interpolation — string-building
SQL by hand around user-supplied filter values is exactly the kind of thing
that turns into a SQL injection bug, so this module never does it.

`FilterDescriptor.field` as a `list[str]` means a pre-qualified column path
(e.g. `["c", "customer_name"]` -> `c.customer_name`, `["s", "c", "col"]` ->
`s.c.col`) — this module never infers joins, callers pre-qualify ambiguous
fields themselves.

Known cross-database caveat: SQLite's `LIKE` is case-insensitive for ASCII by
default, regardless of whether this module emits `LIKE` (ignoreCase=False)
or `ILIKE`/`LOWER(...)` (ignoreCase=True) — that's a property of the SQLite
connection, not of the SQL this module generates. Callers targeting SQLite
who need `contains`/`startsWith`/`endsWith` to actually be case-sensitive
when `ignoreCase` is false must run `PRAGMA case_sensitive_like = ON` on
their connection (see e2e/server/main.py's lifespan for an example).
"""

from __future__ import annotations

import itertools

from sqlglot import exp

from bmsdna.datagrid.filters import (
    CompositeFilterDescriptor,
    FilterDescriptor,
    FilterNode,
    SortDescriptor,
)


class _ParamNamer:
    """Generates unique, stable placeholder names (p0, p1, ...) for one query."""

    def __init__(self) -> None:
        self._counter = itertools.count()

    def next(self) -> str:
        return f"p{next(self._counter)}"


def _field_expr(field: str | list[str]) -> exp.Column:
    """Builds a (possibly pre-qualified) column reference. Never touches user data."""
    if isinstance(field, str):
        return exp.column(field)
    if len(field) == 1:
        return exp.column(field[0])
    if len(field) == 2:
        return exp.column(field[1], table=field[0])
    if len(field) == 3:
        return exp.column(field[2], table=field[1], db=field[0])
    raise ValueError(f"field path too deep (max 3 segments: db.table.column): {field!r}")


def _bind(value: object, params: dict[str, object], namer: _ParamNamer) -> exp.Placeholder:
    """Registers `value` as a query parameter and returns a placeholder referencing it.

    This is the one and only path a `FilterDescriptor.value` takes into the
    generated SQL — it is never interpolated into the SQL string itself.
    """
    name = namer.next()
    params[name] = value
    return exp.Placeholder(this=name)


_LIKE_ESCAPE_CHAR = "\\"


def _escape_like_metacharacters(value: str) -> str:
    """Escapes `%`/`_`/the escape character itself so a literal substring search
    doesn't accidentally use `%`/`_` as LIKE wildcards. Paired with the
    `ESCAPE '\\'` clause `_like()` below appends to every LIKE/ILIKE it builds.
    """
    return (
        value.replace(_LIKE_ESCAPE_CHAR, _LIKE_ESCAPE_CHAR * 2)
        .replace("%", f"{_LIKE_ESCAPE_CHAR}%")
        .replace("_", f"{_LIKE_ESCAPE_CHAR}_")
    )


def _like(
    column: exp.Column,
    pattern: str,
    ignore_case: bool,
    params: dict[str, object],
    namer: _ParamNamer,
) -> exp.Condition:
    """Builds a LIKE/ILIKE predicate with its wildcard-metacharacter escaping declared explicitly."""
    like_cls = exp.ILike if ignore_case else exp.Like
    like = like_cls(this=column, expression=_bind(pattern, params, namer))
    return exp.Escape(this=like, expression=exp.Literal.string(_LIKE_ESCAPE_CHAR))


def _maybe_lower(expr: exp.Expression, apply: bool) -> exp.Expression:
    """Wraps `expr` in LOWER(...) when `apply` — used to honor `ignoreCase` on eq/neq/in/notIn."""
    return exp.Lower(this=expr) if apply else expr


def _comparable_key(value: object) -> object:
    """Best-effort coercion for comparing two `between` bounds that might be
    mismatched types (e.g. a numeric string "10" from a URL/query-string
    round-trip vs. an actual int 5) — mirrors evaluate.ts's `asFiniteNumber`,
    which tries both sides as numbers before falling back to native
    comparison. Without this, `_build_leaf`'s bound-reordering `except
    TypeError` would silently give up on exactly the mismatched-type case
    it's meant to guard, since `"10" > 5` raises TypeError in Python even
    though both sides are clearly comparable once coerced.
    """
    if isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return value
    return value


def _build_condition(
    node: FilterNode,
    params: dict[str, object],
    namer: _ParamNamer,
) -> exp.Condition:
    if isinstance(node, CompositeFilterDescriptor):
        return _build_composite(node, params, namer)
    return _build_leaf(node, params, namer)


def _build_composite(
    node: CompositeFilterDescriptor,
    params: dict[str, object],
    namer: _ParamNamer,
) -> exp.Condition:
    parts = [_build_condition(child, params, namer) for child in node.filters]
    if not parts:
        # An empty AND is vacuously true, an empty OR is vacuously false —
        # mirrors evaluateFilter's treatment of an empty `filters` array.
        return exp.true() if node.logic == "and" else exp.false()
    combine = exp.and_ if node.logic == "and" else exp.or_
    result = parts[0]
    for part in parts[1:]:
        result = combine(result, part)
    return result


def _build_leaf(node: FilterDescriptor, params: dict[str, object], namer: _ParamNamer) -> exp.Condition:
    column = _field_expr(node.field)
    op = node.operator
    ignore_case = node.ignore_case
    # ignoreCase only means anything for string comparisons — matches
    # evaluateFilter's own `typeof rowValue === "string" && typeof target ===
    # "string"` guard on the TS side. Wrapping a numeric bound in LOWER(...)
    # would be meaningless at best and a type error against some drivers at
    # worst, so it's only applied when the value is actually a string.
    ignore_case_str = ignore_case and isinstance(node.value, str)

    if op == "isNull":
        return exp.Is(this=column, expression=exp.Null())
    if op == "isNotNull":
        return exp.not_(exp.Is(this=column, expression=exp.Null()))
    if op == "isEmpty":
        # Known gap: only covers NULL and the empty string. evaluate.ts's
        # isEmptyValue and meili.py's `IS EMPTY` both also treat an empty
        # array as "empty" — for a SQL column holding array/JSON-array data,
        # this branch would disagree with both. A correct array-aware check
        # is dialect-specific (there's no ANSI-SQL "array cardinality"
        # function; Postgres has array_length, SQLite has none built in) and
        # this module has no signal here about whether a given column even
        # holds an array — so this is left NULL/''-only rather than guessing
        # a dialect-specific expression that might not apply.
        return exp.or_(
            exp.Is(this=column, expression=exp.Null()),
            exp.EQ(this=column, expression=exp.Literal.string("")),
        )
    if op == "isNotEmpty":
        # exp.not_() (not the bare exp.Not(this=...) constructor) is required
        # here: it parenthesizes its argument when negating a combination
        # like the OR isEmpty produces above. exp.Not(this=...) does not, and
        # `NOT x IS NULL OR x = ''` means something entirely different from
        # `NOT (x IS NULL OR x = '')` — NOT binds tighter than OR in SQL.
        return exp.not_(_build_leaf(node.model_copy(update={"operator": "isEmpty"}), params, namer))

    if op == "eq":
        return exp.EQ(
            this=_maybe_lower(column, ignore_case_str),
            expression=_maybe_lower(_bind(node.value, params, namer), ignore_case_str),
        )
    if op == "neq":
        return exp.NEQ(
            this=_maybe_lower(column, ignore_case_str),
            expression=_maybe_lower(_bind(node.value, params, namer), ignore_case_str),
        )

    if op == "lt":
        return exp.LT(this=column, expression=_bind(node.value, params, namer))
    if op == "lte":
        return exp.LTE(this=column, expression=_bind(node.value, params, namer))
    if op == "gt":
        return exp.GT(this=column, expression=_bind(node.value, params, namer))
    if op == "gte":
        return exp.GTE(this=column, expression=_bind(node.value, params, namer))

    if op == "between":
        if not (isinstance(node.value, list) and len(node.value) == 2):
            # Malformed input (contract says a 2-element [min, max]) — treat as
            # "matches nothing" rather than raising, mirroring evaluateFilter's
            # isTwoElementArray guard on the TS side.
            return exp.false()
        low, high = node.value
        try:
            # Order-independent, matching evaluateFilter's `between` (see its
            # comment): a hand-built or restored FilterDescriptor might carry
            # its bounds as [larger, smaller], and BETWEEN x AND y in SQL is
            # NOT symmetric — `BETWEEN 45 AND 30` matches nothing, unlike the
            # TS evaluator's deliberately order-independent version of the
            # same operator.
            if _comparable_key(low) > _comparable_key(high):  # ty: ignore[unsupported-operator]
                low, high = high, low
        except TypeError:
            pass  # genuinely incomparable even after coercion — leave order as given
        return exp.Between(
            this=column,
            low=_bind(low, params, namer),
            high=_bind(high, params, namer),
        )

    if op == "in":
        values = node.value if isinstance(node.value, list) else []
        if not values:
            # Matches evaluateFilter: `in` against an empty candidate list is
            # always false, independent of whether the row value is null.
            return exp.false()
        # Unlike eq/neq, `node.value` here is the *list* of candidates, not a
        # single string — ignore_case_str (which checks node.value itself)
        # never applies to in/notIn; check the list's elements instead.
        #
        # Known gap: this drops ignoreCase for the *entire* list if even one
        # element isn't a string (e.g. a hand-built ["ABC", 42] with
        # ignoreCase=True stays case-sensitive here), whereas evaluateFilter's
        # valuesEqual applies ignoreCase per-element. Rendering a genuinely
        # mixed-type IN list with per-element case-folding would need
        # something like `LOWER(col) IN (...) OR col IN (...)` split by
        # element type — judged not worth the complexity for a shape real
        # filter widgets never produce (EnumFilter's options are always
        # uniformly strings).
        ignore_case_list = ignore_case and all(isinstance(v, str) for v in values)
        return exp.In(
            this=_maybe_lower(column, ignore_case_list),
            expressions=[_maybe_lower(_bind(v, params, namer), ignore_case_list) for v in values],
        )
    if op == "notIn":
        if not isinstance(node.value, list):
            # Missing/malformed value (not even an empty list) — matches
            # evaluateFilter's `Array.isArray(value)` guard, which is false
            # (never a match) here. This is a different case from an
            # explicit empty list below, which evaluateFilter (and this
            # branch) both treat as "true for any non-null value" — an
            # earlier version of this code conflated the two.
            return exp.false()
        values = node.value
        if not values:
            # An explicit empty list: matches evaluateFilter, `notIn` is
            # true for any non-null row value, but still false for null
            # (SQL's NOT IN () is, per this contract, "everything not null").
            return exp.not_(exp.Is(this=column, expression=exp.Null()))
        ignore_case_list = ignore_case and all(isinstance(v, str) for v in values)
        return exp.not_(
            exp.In(
                this=_maybe_lower(column, ignore_case_list),
                expressions=[_maybe_lower(_bind(v, params, namer), ignore_case_list) for v in values],
            )
        )

    if op in ("contains", "doesNotContain", "startsWith", "endsWith"):
        if not isinstance(node.value, str):
            # Matches evaluateFilter's stringMatch: a non-string needle never
            # matches (contains/startsWith/endsWith -> false), so its negation
            # (doesNotContain) reduces to "the row value is non-null" rather
            # than interpolating e.g. the literal substring "None" — which is
            # what a naive f-string pattern would do for a `None` value.
            if op == "doesNotContain":
                return exp.not_(exp.Is(this=column, expression=exp.Null()))
            return exp.false()
        escaped = _escape_like_metacharacters(node.value)
        if op == "contains":
            return _like(column, f"%{escaped}%", ignore_case, params, namer)
        if op == "doesNotContain":
            return exp.not_(_like(column, f"%{escaped}%", ignore_case, params, namer))
        if op == "startsWith":
            return _like(column, f"{escaped}%", ignore_case, params, namer)
        return _like(column, f"%{escaped}", ignore_case, params, namer)

    raise ValueError(f"unknown filter operator: {op!r}")  # pragma: no cover - FilterOperator is exhaustive


def _apply_sort(query: exp.Select, sort: list[SortDescriptor]) -> exp.Select:
    for descriptor in sort:
        query = query.order_by(
            exp.Ordered(this=_field_expr(descriptor.field), desc=descriptor.dir == "desc")
        )
    return query


def build_select(
    table: str,
    filter: CompositeFilterDescriptor | None,
    sort: list[SortDescriptor],
    offset: int,
    limit: int,
    dialect: str = "postgres",
) -> tuple[str, dict]:
    """Builds a paginated, filtered, sorted `SELECT * FROM {table}` statement.

    Returns `(sql, params)`; `params` is meant to be passed straight to the
    driver's own parameter-binding (e.g. `cursor.execute(sql, params)`).
    """
    params: dict[str, object] = {}
    namer = _ParamNamer()
    query = exp.select("*").from_(exp.to_table(table))
    if filter is not None:
        query = query.where(_build_condition(filter, params, namer))
    query = _apply_sort(query, sort)
    query = query.offset(offset).limit(limit)
    return query.sql(dialect=dialect), params


def build_count(
    table: str,
    filter: CompositeFilterDescriptor | None,
    dialect: str = "postgres",
) -> tuple[str, dict]:
    """Builds a `SELECT COUNT(*) FROM {table}` statement with the same filter, for total-row-count pagination."""
    params: dict[str, object] = {}
    namer = _ParamNamer()
    query = exp.select(exp.Count(this=exp.Star()).as_("cnt")).from_(exp.to_table(table))
    if filter is not None:
        query = query.where(_build_condition(filter, params, namer))
    return query.sql(dialect=dialect), params
