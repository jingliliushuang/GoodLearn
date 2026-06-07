"""External model path registry."""

from __future__ import annotations

from pathlib import Path

from core.utils import get_external_model_root, load_config


def resolve_external_model(relative_name: str) -> Path | None:
    root = get_external_model_root()
    path = root / relative_name
    return path if path.exists() else None


def list_external_models() -> dict[str, str | None]:
    cfg = load_config()
    models_cfg = cfg.get("external_models", {})
    result: dict[str, str | None] = {}
    for key, filename in models_cfg.items():
        resolved = resolve_external_model(filename)
        result[key] = str(resolved) if resolved else None
    return result


def check_external_models() -> dict[str, bool]:
    cfg = load_config()
    models_cfg = cfg.get("external_models", {})
    return {
        key: resolve_external_model(filename) is not None
        for key, filename in models_cfg.items()
    }
