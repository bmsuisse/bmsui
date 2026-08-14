from typing import get_args

import pytest

from bmsdna.datagrid.filters import (
    CompositeFilterDescriptor,
    FilterDescriptor,
    FilterOperator,
    SortDescriptor,
)
from bmsdna.datagrid.meili import (
    UnsupportedOperatorError,
    _field_ref,
    _quote,
    build_filter_expr,
    build_search_params,
    build_sort,
)

# Every operator this module either renders or explicitly rejects (via
# UnsupportedOperatorError). Kept in sync with test coverage below by
# test_every_filteroperator_is_handled, guarding against a new operator being
# added to filters.py's Literal with no matching branch (or test) here.
_HANDLED_OR_REJECTED_OPERATORS = {
    "eq",
    "neq",
    "lt",
    "lte",
    "gt",
    "gte",
    "in",
    "notIn",
    "between",
    "isNull",
    "isNotNull",
    "isEmpty",
    "isNotEmpty",
    "contains",
    "doesNotContain",
    "startsWith",
    "endsWith",
}


def test_every_filteroperator_is_handled():
    assert _HANDLED_OR_REJECTED_OPERATORS == set(get_args(FilterOperator))


class TestQuote:
    def test_none(self):
        assert _quote(None) == "null"

    def test_bool(self):
        assert _quote(True) == "true"
        assert _quote(False) == "false"

    def test_int(self):
        assert _quote(42) == "42"

    def test_float(self):
        assert _quote(1.5) == "1.5"

    def test_bool_before_int_int_subclass(self):
        # bool is a subclass of int in Python; True must render as `true`,
        # never as the number `1`.
        assert _quote(True) != "1"

    def test_plain_string(self):
        assert _quote("active") == '"active"'

    def test_string_with_embedded_double_quote(self):
        assert _quote('He said "hi"') == '"He said \\"hi\\""'

    def test_string_with_backslash(self):
        assert _quote("C:\\path") == '"C:\\\\path"'

    def test_string_with_backslash_and_quote_together(self):
        assert _quote('a\\b"c') == '"a\\\\b\\"c"'

    def test_string_with_parens(self):
        # Parens aren't special to the quoting itself, but must round-trip
        # untouched inside the quotes.
        assert _quote("(a AND b)") == '"(a AND b)"'


class TestFieldRef:
    def test_bare_identifier(self):
        assert _field_ref("status") == "status"

    def test_dotted_path(self):
        assert _field_ref("c.customer_name") == "c.customer_name"

    def test_prequalified_list_path(self):
        assert _field_ref(["c", "customer_name"]) == "c.customer_name"

    def test_backtick_quotes_field_with_space(self):
        assert _field_ref("weird field") == "`weird field`"

    def test_backtick_quotes_field_with_parens(self):
        assert _field_ref("weird(field)") == "`weird(field)`"

    def test_escapes_embedded_backtick(self):
        assert _field_ref("weird`field") == "`weird\\`field`"


class TestBuildFilterExpr:
    def test_none_filter_returns_none(self):
        assert build_filter_expr(None) is None

    def test_eq(self):
        assert build_filter_expr(FilterDescriptor(field="status", operator="eq", value="active")) == (
            'status = "active"'
        )

    def test_neq(self):
        assert build_filter_expr(FilterDescriptor(field="status", operator="neq", value="active")) == (
            'status != "active"'
        )

    @pytest.mark.parametrize(
        ("operator", "symbol"),
        [("lt", "<"), ("lte", "<="), ("gt", ">"), ("gte", ">=")],
    )
    def test_comparison_operators(self, operator, symbol):
        assert build_filter_expr(FilterDescriptor(field="age", operator=operator, value=18)) == (
            f"age {symbol} 18"
        )

    def test_in(self):
        assert build_filter_expr(FilterDescriptor(field="status", operator="in", value=["a", "b"])) == (
            'status IN ["a", "b"]'
        )

    def test_notin(self):
        assert build_filter_expr(FilterDescriptor(field="status", operator="notIn", value=["a", "b"])) == (
            'NOT status IN ["a", "b"]'
        )

    def test_between(self):
        assert build_filter_expr(FilterDescriptor(field="price", operator="between", value=[100, 200])) == (
            "price 100 TO 200"
        )

    def test_between_is_order_independent(self):
        # Meilisearch's `field a TO b` range is not symmetric either — a
        # reversed [max, min], e.g. from a hand-built or restored filter,
        # must render the same as if it had been given in order.
        assert build_filter_expr(FilterDescriptor(field="price", operator="between", value=[200, 100])) == (
            "price 100 TO 200"
        )

    def test_between_requires_two_elements(self):
        with pytest.raises(ValueError, match="between"):
            build_filter_expr(FilterDescriptor(field="price", operator="between", value=[100]))

    def test_in_with_empty_value_list_raises(self):
        # No Meilisearch boolean literal to fall back to for "always false" —
        # raise rather than send a possibly-invalid `field IN []`.
        with pytest.raises(ValueError, match="empty value list"):
            build_filter_expr(FilterDescriptor(field="status", operator="in", value=[]))

    def test_notin_with_empty_value_list_matches_non_null_rows(self):
        assert build_filter_expr(FilterDescriptor(field="status", operator="notIn", value=[])) == (
            "status IS NOT NULL"
        )

    @pytest.mark.parametrize("operator", ["eq", "neq", "in", "notIn"])
    def test_ignore_case_raises_unsupported(self, operator):
        # Meilisearch's filter DSL has no case-insensitive comparison
        # operator; silently ignoring ignoreCase here would make the same
        # FilterDescriptor match differently across DataSource modes.
        value = ["a"] if operator in ("in", "notIn") else "a"
        with pytest.raises(UnsupportedOperatorError):
            build_filter_expr(FilterDescriptor(field="name", operator=operator, value=value, ignoreCase=True))

    @pytest.mark.parametrize("operator", ["eq", "neq"])
    def test_ignore_case_does_not_raise_for_a_non_string_value(self, operator):
        # ignoreCase has nothing to case-fold for a numeric value — sql.py
        # and evaluateFilter both simply ignore the flag in that case, so
        # raising here would reject a filter the other two engines handle
        # identically (by ignoring ignoreCase, not by mismatching).
        assert build_filter_expr(
            FilterDescriptor(field="age", operator=operator, value=30, ignoreCase=True)
        ) is not None

    def test_ignore_case_does_not_raise_for_in_with_only_non_string_values(self):
        assert build_filter_expr(
            FilterDescriptor(field="age", operator="in", value=[30, 40], ignoreCase=True)
        ) is not None

    def test_ignore_case_raises_for_in_with_a_mix_of_string_and_non_string_values(self):
        # At least one element is a string, so ignoreCase would matter for
        # that element — Meilisearch still has no way to honor it.
        with pytest.raises(UnsupportedOperatorError):
            build_filter_expr(
                FilterDescriptor(field="x", operator="in", value=[30, "ABC"], ignoreCase=True)
            )

    def test_is_null(self):
        assert build_filter_expr(FilterDescriptor(field="deleted_at", operator="isNull")) == (
            "deleted_at IS NULL"
        )

    def test_is_not_null(self):
        assert build_filter_expr(FilterDescriptor(field="deleted_at", operator="isNotNull")) == (
            "deleted_at IS NOT NULL"
        )

    def test_is_empty(self):
        # ORs in IS NULL too: evaluateFilter/sql.py both treat a null value as
        # "empty", and Meilisearch's own IS EMPTY isn't guaranteed to agree
        # (it's documented against empty strings/arrays, not necessarily a
        # missing/null attribute).
        assert build_filter_expr(FilterDescriptor(field="tags", operator="isEmpty")) == (
            "(tags IS NULL OR tags IS EMPTY)"
        )

    def test_is_not_empty(self):
        assert build_filter_expr(FilterDescriptor(field="tags", operator="isNotEmpty")) == (
            "(tags IS NOT NULL AND tags IS NOT EMPTY)"
        )

    @pytest.mark.parametrize("operator", ["contains", "doesNotContain", "startsWith", "endsWith"])
    def test_unsupported_operators_raise(self, operator):
        with pytest.raises(UnsupportedOperatorError):
            build_filter_expr(FilterDescriptor(field="name", operator=operator, value="a"))

    def test_prequalified_field_path(self):
        assert build_filter_expr(
            FilterDescriptor(field=["c", "customer_name"], operator="eq", value="Acme")
        ) == 'c.customer_name = "Acme"'

    def test_top_level_and(self):
        filter_ = CompositeFilterDescriptor(
            logic="and",
            filters=[
                FilterDescriptor(field="status", operator="eq", value="active"),
                FilterDescriptor(field="age", operator="gte", value=18),
            ],
        )
        assert build_filter_expr(filter_) == 'status = "active" AND age >= 18'

    def test_top_level_or(self):
        filter_ = CompositeFilterDescriptor(
            logic="or",
            filters=[
                FilterDescriptor(field="status", operator="eq", value="active"),
                FilterDescriptor(field="status", operator="eq", value="pending"),
            ],
        )
        assert build_filter_expr(filter_) == 'status = "active" OR status = "pending"'

    def test_two_levels_of_nesting_parenthesizes_composite_children(self):
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
        assert build_filter_expr(filter_) == (
            '(status = "active" AND age >= 18) OR (status = "pending" AND age < 10)'
        )

    def test_leaf_children_are_not_individually_parenthesized(self):
        filter_ = CompositeFilterDescriptor(
            logic="and",
            filters=[
                FilterDescriptor(field="a", operator="eq", value=1),
                FilterDescriptor(field="b", operator="eq", value=2),
            ],
        )
        assert build_filter_expr(filter_) == "a = 1 AND b = 2"

    def test_empty_composite_raises(self):
        with pytest.raises(ValueError, match="empty composite"):
            build_filter_expr(CompositeFilterDescriptor(logic="and", filters=[]))

    def test_a_bare_filterdescriptor_is_accepted_at_the_top_level(self):
        # build_filter_expr's signature accepts a leaf directly, not just a composite.
        assert build_filter_expr(FilterDescriptor(field="x", operator="isNull")) == "x IS NULL"


class TestBuildSort:
    def test_empty(self):
        assert build_sort([]) == []

    def test_single(self):
        assert build_sort([SortDescriptor(field="created_at", dir="desc")]) == ["created_at:desc"]

    def test_multiple_preserves_order(self):
        result = build_sort(
            [SortDescriptor(field="status", dir="asc"), SortDescriptor(field="created_at", dir="desc")]
        )
        assert result == ["status:asc", "created_at:desc"]


class TestBuildSearchParams:
    def test_no_filter_no_sort(self):
        assert build_search_params(None, [], 0, 20) == {"offset": 0, "limit": 20}

    def test_with_filter_and_sort(self):
        filter_ = FilterDescriptor(field="status", operator="eq", value="active")
        params = build_search_params(filter_, [SortDescriptor(field="age", dir="asc")], 40, 20)
        assert params == {
            "offset": 40,
            "limit": 20,
            "filter": 'status = "active"',
            "sort": ["age:asc"],
        }

    def test_ready_to_spread_into_index_search(self):
        params = build_search_params(None, [], 0, 10)

        def fake_search(q, **kwargs):
            return q, kwargs

        assert fake_search("hello", **params) == ("hello", {"offset": 0, "limit": 10})
