from typing import get_args

import pytest

from bmsdna.datagrid.filters import (
    CompositeFilterDescriptor,
    FilterDescriptor,
    FilterOperator,
    SortDescriptor,
)
from bmsdna.datagrid.sql import build_count, build_select

DIALECTS = ["postgres", "sqlite"]

EVERY_OPERATOR_CASES = [
    ("eq", {"value": "active"}, "x = {p0}", {"p0": "active"}),
    ("neq", {"value": "active"}, "x <> {p0}", {"p0": "active"}),
    ("lt", {"value": 10}, "x < {p0}", {"p0": 10}),
    ("lte", {"value": 10}, "x <= {p0}", {"p0": 10}),
    ("gt", {"value": 10}, "x > {p0}", {"p0": 10}),
    ("gte", {"value": 10}, "x >= {p0}", {"p0": 10}),
    ("in", {"value": ["a", "b"]}, "x IN ({p0}, {p1})", {"p0": "a", "p1": "b"}),
    ("notIn", {"value": ["a", "b"]}, "NOT x IN ({p0}, {p1})", {"p0": "a", "p1": "b"}),
    ("contains", {"value": "corp"}, "x LIKE {p0} ESCAPE '\\'", {"p0": "%corp%"}),
    ("doesNotContain", {"value": "corp"}, "NOT x LIKE {p0} ESCAPE '\\'", {"p0": "%corp%"}),
    ("startsWith", {"value": "corp"}, "x LIKE {p0} ESCAPE '\\'", {"p0": "corp%"}),
    ("endsWith", {"value": "corp"}, "x LIKE {p0} ESCAPE '\\'", {"p0": "%corp"}),
    ("isEmpty", {}, "x IS NULL OR x = ''", {}),
    ("isNotEmpty", {}, "NOT (x IS NULL OR x = '')", {}),
    ("isNull", {}, "x IS NULL", {}),
    ("isNotNull", {}, "NOT x IS NULL", {}),
    ("between", {"value": [1, 10]}, "x BETWEEN {p0} AND {p1}", {"p0": 1, "p1": 10}),
]


def test_every_operator_case_covers_the_full_filteroperator_contract():
    """Guards against a new FilterOperator being added to filters.py without a
    matching branch (and test) landing here — the branch dispatch in sql.py's
    _build_leaf has no static exhaustiveness check tying it to the Literal, so
    a forgotten branch would otherwise only surface as a runtime 500 the first
    time a real request uses it."""
    tested_operators = {case[0] for case in EVERY_OPERATOR_CASES}
    assert tested_operators == set(get_args(FilterOperator))


@pytest.mark.parametrize("dialect", DIALECTS)
@pytest.mark.parametrize(("operator", "kwargs", "expected_where", "expected_params"), EVERY_OPERATOR_CASES)
def test_every_operator(dialect, operator, kwargs, expected_where, expected_params):
    filter_ = FilterDescriptor(field="x", operator=operator, **kwargs)
    sql, params = build_select("t", filter_, [], 0, 10, dialect=dialect)

    placeholder = "%({name})s" if dialect == "postgres" else ":{name}"
    rendered_where = expected_where.format(
        **{name: placeholder.format(name=name) for name in expected_params}
    )
    assert f"WHERE {rendered_where}" in sql
    assert params == expected_params


@pytest.mark.parametrize("dialect", DIALECTS)
def test_ignore_case_uses_case_insensitive_like(dialect):
    filter_ = FilterDescriptor(field="name", operator="contains", value="corp", ignoreCase=True)
    sql, params = build_select("t", filter_, [], 0, 10, dialect=dialect)
    assert params == {"p0": "%corp%"}
    if dialect == "postgres":
        assert "ILIKE" in sql
    else:
        # sqlite has no native ILIKE; sqlglot renders it as LOWER(...) LIKE LOWER(...)
        assert "LOWER(name) LIKE LOWER(" in sql


@pytest.mark.parametrize("dialect", DIALECTS)
def test_two_levels_of_and_or_nesting(dialect):
    # (status = 'active' AND age >= 18) OR (status = 'pending' AND age < 10)
    filter_ = CompositeFilterDescriptor(
        logic="or",
        filters=[
            CompositeFilterDescriptor(
                logic="and",
                filters=[
                    FilterDescriptor(field="status", operator="eq", value="active"),
                    FilterDescriptor(field="age", operator="gte", value=18),
                ],
            ),
            CompositeFilterDescriptor(
                logic="and",
                filters=[
                    FilterDescriptor(field="status", operator="eq", value="pending"),
                    FilterDescriptor(field="age", operator="lt", value=10),
                ],
            ),
        ],
    )
    sql, params = build_select("t", filter_, [], 0, 10, dialect=dialect)

    p = "%({})s".format if dialect == "postgres" else ":{}".format
    expected = (
        f"WHERE (status = {p('p0')} AND age >= {p('p1')}) "
        f"OR (status = {p('p2')} AND age < {p('p3')})"
    )
    assert expected in sql
    assert params == {"p0": "active", "p1": 18, "p2": "pending", "p3": 10}


def test_top_level_and_of_leaf_and_composite():
    filter_ = CompositeFilterDescriptor(
        logic="and",
        filters=[
            FilterDescriptor(field="status", operator="eq", value="active"),
            CompositeFilterDescriptor(
                logic="or",
                filters=[
                    FilterDescriptor(field="age", operator="gte", value=18),
                    FilterDescriptor(field="name", operator="contains", value="ann"),
                ],
            ),
        ],
    )
    sql, params = build_select("t", filter_, [], 0, 10, dialect="postgres")
    assert "WHERE status = %(p0)s AND (age >= %(p1)s OR name LIKE %(p2)s ESCAPE '\\')" in sql
    assert params == {"p0": "active", "p1": 18, "p2": "%ann%"}


def test_empty_and_is_vacuously_true():
    sql, _ = build_select("t", CompositeFilterDescriptor(logic="and", filters=[]), [], 0, 10)
    assert "WHERE TRUE" in sql


def test_empty_or_is_vacuously_false():
    sql, _ = build_select("t", CompositeFilterDescriptor(logic="or", filters=[]), [], 0, 10)
    assert "WHERE FALSE" in sql


def test_no_filter_omits_where_clause():
    sql, params = build_select("t", None, [], 0, 10, dialect="postgres")
    assert "WHERE" not in sql
    assert params == {}


def test_prequalified_field_path_renders_qualified_column():
    filter_ = FilterDescriptor(field=["c", "customer_name"], operator="eq", value="Acme")
    sql, params = build_select("orders", filter_, [], 0, 10, dialect="postgres")
    assert "c.customer_name = %(p0)s" in sql
    assert params == {"p0": "Acme"}


def test_sort_single_column():
    sql, _ = build_select("t", None, [SortDescriptor(field="created_at", dir="desc")], 0, 10)
    assert "ORDER BY created_at DESC" in sql


def test_sort_multiple_columns_preserves_order():
    sql, _ = build_select(
        "t",
        None,
        [SortDescriptor(field="status", dir="asc"), SortDescriptor(field="created_at", dir="desc")],
        0,
        10,
    )
    order_by_index = sql.index("ORDER BY")
    assert sql.index("status") < sql.index("created_at", order_by_index)


def test_pagination_offset_and_limit():
    sql, _ = build_select("t", None, [], 40, 20, dialect="postgres")
    assert "LIMIT 20" in sql
    assert "OFFSET 40" in sql


def test_in_with_empty_value_list_matches_nothing():
    sql, params = build_select("t", FilterDescriptor(field="x", operator="in", value=[]), [], 0, 10)
    assert "WHERE FALSE" in sql
    assert params == {}


def test_notin_with_empty_value_list_matches_non_null_rows():
    sql, params = build_select("t", FilterDescriptor(field="x", operator="notIn", value=[]), [], 0, 10)
    assert "WHERE NOT x IS NULL" in sql
    assert params == {}


def test_notin_with_missing_value_matches_nothing():
    # A missing/malformed value (not even an empty list) is a different case
    # from an explicit empty list above — evaluateFilter's Array.isArray
    # guard is false (never a match) for this, but an earlier version of
    # this code conflated the two and treated both as "IS NOT NULL".
    sql, params = build_select("t", FilterDescriptor(field="x", operator="notIn"), [], 0, 10)
    assert "WHERE FALSE" in sql
    assert params == {}


def test_between_with_malformed_value_matches_nothing():
    sql, params = build_select("t", FilterDescriptor(field="x", operator="between", value=[1]), [], 0, 10)
    assert "WHERE FALSE" in sql
    assert params == {}


def test_between_is_order_independent():
    # SQL's BETWEEN is not symmetric (`BETWEEN 45 AND 30` matches nothing),
    # but evaluateFilter's `between` deliberately is — a FilterDescriptor
    # with inverted bounds must produce the same result on both sides.
    sql, params = build_select("t", FilterDescriptor(field="age", operator="between", value=[45, 30]), [], 0, 10)
    assert "age BETWEEN %(p0)s AND %(p1)s" in sql
    assert params == {"p0": 30, "p1": 45}


def test_between_reorders_mismatched_types_via_numeric_coercion():
    # A numeric string ("10") vs. a real int (5) raises TypeError under a
    # naive Python `>` comparison — the reorder must coerce both sides to
    # numbers first (mirroring evaluateFilter's asFiniteNumber) rather than
    # giving up and leaving the mismatched-type case unswapped.
    sql, params = build_select("t", FilterDescriptor(field="age", operator="between", value=["10", 5]), [], 0, 10)
    assert "age BETWEEN %(p0)s AND %(p1)s" in sql
    assert params == {"p0": 5, "p1": "10"}


def test_between_leaves_genuinely_incomparable_bounds_as_given():
    sql, params = build_select("t", FilterDescriptor(field="x", operator="between", value=["a", 1]), [], 0, 10)
    assert "x BETWEEN %(p0)s AND %(p1)s" in sql
    assert params == {"p0": "a", "p1": 1}


class TestIgnoreCaseBeyondLike:
    def test_applies_to_eq(self):
        # ignoreCase was previously only honored for LIKE-based operators;
        # eq/neq/in/notIn silently stayed case-sensitive, disagreeing with
        # evaluateFilter's valuesEqual (which lowercases both sides for eq
        # too when ignoreCase is set).
        sql, params = build_select(
            "t", FilterDescriptor(field="status", operator="eq", value="ACTIVE", ignoreCase=True), [], 0, 10
        )
        assert "LOWER(status) = LOWER(%(p0)s)" in sql
        assert params == {"p0": "ACTIVE"}

    def test_applies_to_neq(self):
        sql, _ = build_select(
            "t", FilterDescriptor(field="status", operator="neq", value="ACTIVE", ignoreCase=True), [], 0, 10
        )
        assert "LOWER(status) <> LOWER(%(p0)s)" in sql

    def test_applies_to_in(self):
        sql, params = build_select(
            "t",
            FilterDescriptor(field="status", operator="in", value=["A", "B"], ignoreCase=True),
            [],
            0,
            10,
        )
        assert "LOWER(status) IN (LOWER(%(p0)s), LOWER(%(p1)s))" in sql
        assert params == {"p0": "A", "p1": "B"}

    def test_applies_to_notin(self):
        sql, _ = build_select(
            "t",
            FilterDescriptor(field="status", operator="notIn", value=["A", "B"], ignoreCase=True),
            [],
            0,
            10,
        )
        assert "NOT LOWER(status) IN (LOWER(%(p0)s), LOWER(%(p1)s))" in sql

    def test_does_not_apply_to_a_non_string_value(self):
        # ignoreCase is meaningless for a numeric value; LOWER(numeric_column)
        # would be a type error against a real numeric column in most drivers.
        sql, _ = build_select(
            "t", FilterDescriptor(field="age", operator="eq", value=5, ignoreCase=True), [], 0, 10
        )
        assert "LOWER" not in sql

    def test_does_not_apply_to_in_with_only_non_string_values(self):
        sql, _ = build_select(
            "t", FilterDescriptor(field="age", operator="in", value=[5, 10], ignoreCase=True), [], 0, 10
        )
        assert "LOWER" not in sql


class TestLikeMetacharacterEscaping:
    def test_percent_and_underscore_are_escaped_in_contains(self):
        # Without escaping, a literal "_" or "%" in the search text would act
        # as a LIKE wildcard instead of matching itself.
        sql, params = build_select(
            "t", FilterDescriptor(field="sku", operator="contains", value="10_5%off"), [], 0, 10
        )
        assert "LIKE %(p0)s ESCAPE '\\'" in sql
        assert params == {"p0": "%10\\_5\\%off%"}

    def test_backslash_itself_is_escaped(self):
        sql, params = build_select(
            "t", FilterDescriptor(field="path", operator="startsWith", value="C:\\Users"), [], 0, 10
        )
        assert params == {"p0": "C:\\\\Users%"}
        assert "ESCAPE '\\'" in sql


class TestContainsWithNonStringValue:
    def test_contains_with_none_value_matches_nothing(self):
        # An f-string pattern would have rendered `LIKE '%None%'`, matching
        # any row whose value literally contains the text "None".
        sql, params = build_select(
            "t", FilterDescriptor(field="name", operator="contains", value=None), [], 0, 10
        )
        assert "WHERE FALSE" in sql
        assert params == {}

    def test_does_not_contain_with_none_value_matches_non_null_rows(self):
        sql, params = build_select(
            "t", FilterDescriptor(field="name", operator="doesNotContain", value=None), [], 0, 10
        )
        assert "WHERE NOT name IS NULL" in sql
        assert params == {}


class TestBuildCount:
    def test_matches_build_select_where_clause(self):
        filter_ = FilterDescriptor(field="status", operator="eq", value="active")
        _select_sql, select_params = build_select("t", filter_, [], 0, 10, dialect="postgres")
        count_sql, count_params = build_count("t", filter_, dialect="postgres")

        assert "SELECT COUNT(*)" in count_sql
        assert "WHERE status = %(p0)s" in count_sql
        assert count_params == select_params == {"p0": "active"}

    def test_no_filter(self):
        sql, params = build_count("t", None, dialect="sqlite")
        assert sql == "SELECT COUNT(*) AS cnt FROM t"
        assert params == {}
