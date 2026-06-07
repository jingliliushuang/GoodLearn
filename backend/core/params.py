"""Method parameter schema validation and defaults."""

from __future__ import annotations

from typing import Any

from core.loader import load_method_metadata

RESERVED_KWARGS = frozenset({"method_dir", "external_model_root", "weight_path"})

ODD_PARAM_NAMES = frozenset({"ksize", "templateWindowSize", "searchWindowSize", "d"})


def get_params_schema(domain_id: str, node_id: str, method_id: str) -> list[dict[str, Any]]:
    meta = load_method_metadata(domain_id, node_id, method_id)
    schema = meta.get("params_schema", [])
    return schema if isinstance(schema, list) else []


def get_default_params(schema: list[dict[str, Any]]) -> dict[str, Any]:
    defaults: dict[str, Any] = {}
    for field in schema:
        name = field.get("name")
        if not name:
            continue
        if field.get("type") == "readonly":
            defaults[name] = field.get("default")
        elif "default" in field:
            defaults[name] = field["default"]
    return defaults


def validate_params(
    schema: list[dict[str, Any]],
    user_params: dict[str, Any] | None,
) -> dict[str, Any]:
    """Validate user params against schema and return coerced values."""
    user_params = user_params or {}
    if not schema:
        return {}

    schema_by_name = {f["name"]: f for f in schema if f.get("name")}
    result: dict[str, Any] = {}

    for name, field in schema_by_name.items():
        field_type = field.get("type", "number")
        if field_type == "readonly":
            result[name] = field.get("default")
            continue

        if name in user_params:
            raw = user_params[name]
        elif "default" in field:
            raw = field["default"]
        else:
            continue

        if field_type == "boolean":
            result[name] = bool(raw)
            continue

        if field_type == "select":
            options = field.get("options", [])
            if raw not in options:
                raise ValueError(f"参数 {name} 非法：必须为 {options} 之一")
            result[name] = raw
            continue

        if field_type in {"number", "range"}:
            try:
                num = float(raw)
            except (TypeError, ValueError) as exc:
                raise ValueError(f"参数 {name} 非法：必须为数字") from exc

            if "min" in field and num < field["min"]:
                raise ValueError(f"参数 {name} 非法：不能小于 {field['min']}")
            if "max" in field and num > field["max"]:
                raise ValueError(f"参数 {name} 非法：不能大于 {field['max']}")

            if name in ODD_PARAM_NAMES:
                iv = int(num)
                if iv <= 0:
                    raise ValueError(f"参数 {name} 非法：必须为正整数")
                if iv % 2 == 0:
                    raise ValueError(f"参数 {name} 非法：必须为正奇数")
                result[name] = iv
            elif num.is_integer():
                result[name] = int(num)
            else:
                result[name] = num
            continue

        result[name] = raw

    for key in user_params:
        if key in RESERVED_KWARGS:
            raise ValueError(f"参数 {key} 非法：保留字段不可由用户设置")
        if key not in schema_by_name:
            raise ValueError(f"未知参数: {key}")

    return result


def validate_method_params(
    domain_id: str,
    node_id: str,
    method_id: str,
    user_params: dict[str, Any] | None,
) -> dict[str, Any]:
    schema = get_params_schema(domain_id, node_id, method_id)
    return validate_params(schema, user_params)


def merge_process_kwargs(
    runtime_kwargs: dict[str, Any],
    user_params: dict[str, Any],
) -> dict[str, Any]:
    merged = dict(runtime_kwargs)
    for key, value in user_params.items():
        if key not in RESERVED_KWARGS:
            merged[key] = value
    return merged
