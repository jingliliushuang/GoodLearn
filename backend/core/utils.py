"""Configuration and path utilities."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import yaml

_CONFIG: dict[str, Any] | None = None


def get_project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_config() -> dict[str, Any]:
    global _CONFIG
    if _CONFIG is None:
        config_path = get_project_root() / "config.yaml"
        with open(config_path, encoding="utf-8") as f:
            _CONFIG = yaml.safe_load(f)
    return _CONFIG


def get_knowledge_root() -> Path:
    return get_project_root() / "knowledge"


def get_runtime_paths() -> dict[str, Path]:
    cfg = load_config()
    return {
        "uploads": Path(cfg["runtime"]["uploads"]),
        "outputs": Path(cfg["runtime"]["outputs"]),
        "temp": Path(cfg["runtime"]["temp"]),
    }


def get_external_model_root() -> Path:
    cfg = load_config()
    return Path(cfg["external_model_root"])


def ensure_runtime_dirs() -> None:
    for path in get_runtime_paths().values():
        path.mkdir(parents=True, exist_ok=True)
