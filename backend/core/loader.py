"""Dynamic model loading."""

from __future__ import annotations

import importlib.util
from pathlib import Path
from typing import Any, Callable

from core.module_compat import resolve_process_dir
from core.tree import get_node_dir


def _load_node_callable(domain_id: str, node_id: str, module_name: str, fn_name: str) -> Callable[..., Any]:
    module_path = get_node_dir(domain_id, node_id) / f"{module_name}.py"
    if not module_path.exists():
        raise FileNotFoundError(f"Node module not found: {module_path}")

    spec = importlib.util.spec_from_file_location(
        f"goodlearn_{domain_id}_{node_id}_{module_name}",
        module_path,
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module from {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if not hasattr(module, fn_name):
        raise AttributeError(f"{module_name}.py must define {fn_name}(): {module_path}")

    fn = getattr(module, fn_name)
    if not callable(fn):
        raise TypeError(f"{module_name}.{fn_name} must be callable: {module_path}")

    return fn


def load_degrade_fn(domain_id: str, node_id: str) -> Callable[..., Any] | None:
    try:
        return _load_node_callable(domain_id, node_id, "dataset", "degrade")
    except FileNotFoundError:
        return None


def load_evaluate_fn(domain_id: str, node_id: str) -> Callable[..., Any] | None:
    try:
        return _load_node_callable(domain_id, node_id, "metrics", "evaluate")
    except FileNotFoundError:
        return None


def load_process_fn(domain_id: str, node_id: str, method_id: str) -> Callable[..., Any]:
    node_dir = get_node_dir(domain_id, node_id)
    method_dir = resolve_process_dir(node_dir, method_id)
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

    node_dir = get_node_dir(domain_id, node_id)
    meta_path = resolve_process_dir(node_dir, method_id) / "metadata.json"
    with open(meta_path, encoding="utf-8") as f:
        return json.load(f)


def get_method_readme(domain_id: str, node_id: str, method_id: str) -> str:
    node_dir = get_node_dir(domain_id, node_id)
    readme_path = resolve_process_dir(node_dir, method_id) / "README.md"
    if readme_path.exists():
        return readme_path.read_text(encoding="utf-8")
    return ""
