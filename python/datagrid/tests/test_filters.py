import pytest
from pydantic import ValidationError

from bmsdna.datagrid.filters import (
    CompositeFilterDescriptor,
    FilterDescriptor,
    GridState,
    SortDescriptor,
    field_key,
    is_composite,
    is_filter_descriptor,
)


def test_leaf_filter_construction() -> None:
    f = FilterDescriptor(field="name", operator="contains", value="a")
    assert f.field == "name"
    assert f.operator == "contains"
    assert f.value == "a"
    assert f.ignore_case is False


def test_leaf_filter_accepts_camel_case_alias() -> None:
    f = FilterDescriptor.model_validate({"field": "name", "operator": "eq", "ignoreCase": True})
    assert f.ignore_case is True


def test_unary_operator_has_no_value() -> None:
    f = FilterDescriptor(field="deleted_at", operator="isNull")
    assert f.value is None


def test_prequalified_field_path() -> None:
    f = FilterDescriptor(field=["c", "customer_name"], operator="eq", value="Acme")
    assert f.field == ["c", "customer_name"]
    assert field_key(f.field) == "c.customer_name"


def test_field_key_plain_string() -> None:
    assert field_key("customer_name") == "customer_name"


def test_composite_filter_nesting() -> None:
    composite = CompositeFilterDescriptor(
        logic="and",
        filters=[
            FilterDescriptor(field="age", operator="gte", value=18),
            CompositeFilterDescriptor(
                logic="or",
                filters=[
                    FilterDescriptor(field="status", operator="eq", value="active"),
                    FilterDescriptor(field="status", operator="eq", value="pending"),
                ],
            ),
        ],
    )
    assert composite.logic == "and"
    assert len(composite.filters) == 2
    assert is_composite(composite.filters[1])
    assert not is_composite(composite.filters[0])
    assert is_filter_descriptor(composite.filters[0])
    assert not is_filter_descriptor(composite.filters[1])


def test_composite_filter_from_json() -> None:
    payload = {
        "logic": "or",
        "filters": [
            {"field": "a", "operator": "eq", "value": 1},
            {"logic": "and", "filters": [{"field": "b", "operator": "isNotNull"}]},
        ],
    }
    composite = CompositeFilterDescriptor.model_validate(payload)
    assert composite.logic == "or"
    assert isinstance(composite.filters[1], CompositeFilterDescriptor)


def test_invalid_operator_rejected() -> None:
    with pytest.raises(ValidationError):
        FilterDescriptor(field="name", operator="bogus")  # type: ignore[arg-type]


def test_sort_descriptor() -> None:
    s = SortDescriptor(field="created_at", dir="desc")
    assert s.dir == "desc"


def test_grid_state_defaults() -> None:
    state = GridState()
    assert state.filter is None
    assert state.sort == []
    assert state.page == 0
    assert state.page_size == 20


def test_grid_state_from_camel_case_json() -> None:
    state = GridState.model_validate(
        {
            "filter": {"logic": "and", "filters": [{"field": "a", "operator": "eq", "value": 1}]},
            "sort": [{"field": "a", "dir": "asc"}],
            "page": 2,
            "pageSize": 50,
        }
    )
    assert state.page_size == 50
    assert state.filter is not None
    assert state.filter.logic == "and"


def test_grid_state_serializes_back_to_camel_case_by_default() -> None:
    """model_dump()/model_dump_json() must round-trip through the same camelCase
    keys the TS contract expects, without callers having to remember `by_alias=True`."""
    state = GridState(page_size=50)
    dumped = state.model_dump()
    assert "pageSize" in dumped
    assert "page_size" not in dumped
    assert dumped["pageSize"] == 50


def test_filter_descriptor_serializes_ignore_case_as_camel_case() -> None:
    f = FilterDescriptor(field="name", operator="contains", value="a", ignore_case=True)
    dumped = f.model_dump()
    assert dumped["ignoreCase"] is True
    assert "ignore_case" not in dumped
