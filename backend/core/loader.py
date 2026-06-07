"""Dynamic model loading."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any, Callable

from core.tree import get_method_dir


def load_process_fn(domain_id: str, node_id: str, method_id: str) -> Callable[..., Any]:
    method_dir = get_method_dir(domain_id, node_id, method_id)
    model_path = method_dir / "model.py"
    if not model_path.exists():
        raise FileNotFoundError(f"Model not found: {model_path}")

    spec = importlib.util.spec_from_file_location(
        f"goodlearn_{domain_id}_{node_id}_{method_id}",
        model_path,
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module from {model_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if not hasattr(module, "process"):
        raise AttributeError(f"model.py must define process(): {model_path}")

    return module.process


def load_method_metadata(domain_id: str, node_id: str, method_id: str) -> dict[str, Any]:
    import json

    meta_path = get_method_dir(domain_id, node_id, method_id) / "metadata.json"
    with open(meta_path, encoding="utf-8") as f:
        return json.load(f)


def get_method_readme(domain_id: str, node_id: str, method_id: str) -> str:
    readme_path = get_method_dir(domain_id, node_id, method_id) / "README.md"
    if readme_path.exists():
        return readme_path.read_text(encoding="utf-8")
    return ""
