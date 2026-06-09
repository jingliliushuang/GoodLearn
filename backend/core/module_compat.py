"""Compatibility layer: preprocess/process/judge vs dataset.py/methods/metrics.py."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Any, Callable

from core.utils import get_knowledge_root, get_project_root


def safe_node_path(project_root: Path, node_path: str) -> Path:
    if not node_path:
        raise ValueError("node_path 不能为空")

    normalized = node_path.replace("\\", "/").strip("/")
    if ".." in normalized.split("/"):
        raise ValueError("非法 node_path")

    knowledge_root = (project_root / "knowledge").resolve()
    target = (knowledge_root / normalized).resolve()

    if not str(target).startswith(str(knowledge_root)):
        raise ValueError("node_path 超出 knowledge 目录")

    return target


def node_path_from_dir(node_dir: Path) -> str:
    knowledge_root = get_knowledge_root().resolve()
    return node_dir.resolve().relative_to(knowledge_root).as_posix()


def get_node_dir_from_path(node_path: str) -> Path:
    return safe_node_path(get_project_root(), node_path)


def split_node_path(node_path: str) -> tuple[str, str]:
    parts = node_path.replace("\\", "/").strip("/").split("/")
    if len(parts) < 2:
        raise ValueError(f"非法 node_path: {node_path}")
    return parts[0], parts[-1]


def resolve_process_dir(node_dir: Path, method_id: str) -> Path:
    process_path = node_dir / "process" / method_id
    if process_path.is_dir() and (process_path / "model.py").exists():
        return process_path
    return node_dir / "methods" / method_id


def _load_callable(module_path: Path, fn_name: str, module_label: str) -> Callable[..., Any]:
    if not module_path.exists():
        raise FileNotFoundError(f"模块不存在: {module_path}")
    spec = importlib.util.spec_from_file_location(module_label, str(module_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"无法加载: {module_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    fn = getattr(module, fn_name, None)
    if not callable(fn):
        raise AttributeError(f"{module_path.name} 缺少 {fn_name}()")
    return fn


def _read_module_meta(module_dir: Path, module_id: str) -> dict[str, Any]:
    meta_path = module_dir / "metadata.json"
    if meta_path.exists():
        with open(meta_path, encoding="utf-8") as f:
            return json.load(f)
    return {"id": module_id, "title": module_id}


def _scan_stage_dir(node_dir: Path, stage: str, code_file: str) -> list[dict[str, Any]]:
    stage_dir = node_dir / stage
    if not stage_dir.is_dir():
        return []
    modules: list[dict[str, Any]] = []
    for item in sorted(stage_dir.iterdir()):
        if not item.is_dir() or item.name.startswith("_"):
            continue
        if not (item / code_file).exists():
            continue
        meta = _read_module_meta(item, item.name)
        modules.append(
            {
                "id": meta.get("id", item.name),
                "title": meta.get("title", item.name),
                "description": meta.get("description", ""),
                "source": stage,
                "path": item.as_posix(),
            }
        )
    return modules


def _legacy_preprocess_modules(node_dir: Path) -> list[dict[str, Any]]:
    exp_path = node_dir / "experiment.json"
    if exp_path.exists():
        with open(exp_path, encoding="utf-8") as f:
            exp = json.load(f)
        methods = (
            exp.get("stages", {})
            .get("dataset_generation", {})
            .get("methods", [])
        )
        if methods:
            return [
                {
                    "id": m.get("id", ""),
                    "title": m.get("title", m.get("id", "")),
                    "description": m.get("description", ""),
                    "source": "dataset.py",
                    "params_schema": m.get("params_schema", []),
                    "legacy": True,
                }
                for m in methods
                if m.get("id")
            ]
    if (node_dir / "dataset.py").exists():
        return [
            {
                "id": "default_degrade",
                "title": "dataset.degrade (兼容)",
                "description": "使用节点 dataset.py 的 degrade() 接口",
                "source": "dataset.py",
                "legacy": True,
            }
        ]
    return []


def _legacy_process_modules(node_dir: Path) -> list[dict[str, Any]]:
    methods_dir = node_dir / "methods"
    if not methods_dir.is_dir():
        return []
    modules: list[dict[str, Any]] = []
    for item in sorted(methods_dir.iterdir()):
        if not item.is_dir() or item.name.startswith("_"):
            continue
        if not (item / "model.py").exists():
            continue
        if (node_dir / "process" / item.name).exists():
            continue
        meta = _read_module_meta(item, item.name)
        modules.append(
            {
                "id": meta.get("id", item.name),
                "title": meta.get("title", item.name),
                "description": meta.get("description", ""),
                "source": "methods",
                "available": meta.get("available", False),
                "legacy": True,
            }
        )
    return modules


def _legacy_judge_modules(node_dir: Path) -> list[dict[str, Any]]:
    exp_path = node_dir / "experiment.json"
    if exp_path.exists():
        with open(exp_path, encoding="utf-8") as f:
            exp = json.load(f)
        metrics = (
            exp.get("stages", {})
            .get("evaluation", {})
            .get("metrics", [])
        )
        if metrics:
            return [
                {
                    "id": m.get("id", ""),
                    "title": m.get("title", m.get("id", "")),
                    "description": m.get("description", ""),
                    "source": "metrics.py",
                    "legacy": True,
                }
                for m in metrics
                if m.get("id") and m.get("id") != "runtime_ms"
            ]
    if (node_dir / "metrics.py").exists():
        return [
            {"id": "mse", "title": "MSE", "source": "metrics.py", "legacy": True},
            {"id": "psnr", "title": "PSNR", "source": "metrics.py", "legacy": True},
            {"id": "ssim", "title": "SSIM", "source": "metrics.py", "legacy": True},
        ]
    return []


def list_node_modules(node_path: str) -> dict[str, Any]:
    node_dir = get_node_dir_from_path(node_path)
    preprocess = _scan_stage_dir(node_dir, "preprocess", "module.py")
    process = _scan_stage_dir(node_dir, "process", "model.py")
    judge = _scan_stage_dir(node_dir, "judge", "module.py")

    legacy_preprocess = _legacy_preprocess_modules(node_dir) if not preprocess else []
    legacy_process = _legacy_process_modules(node_dir)
    legacy_judge = _legacy_judge_modules(node_dir) if not judge else []

    seen_process = {m["id"] for m in process}
    for m in legacy_process:
        if m["id"] not in seen_process:
            process.append(m)

    compat_mode = bool(legacy_preprocess or legacy_process or legacy_judge)
    if not preprocess and legacy_preprocess:
        preprocess = legacy_preprocess
    if not judge and legacy_judge:
        judge = legacy_judge

    return {
        "node_path": node_path,
        "preprocess": preprocess,
        "process": process,
        "judge": judge,
        "compat_mode": compat_mode,
        "has_preprocess": bool(preprocess),
        "has_process": bool(process),
        "has_judge": bool(judge),
    }


def node_module_flags(node_dir: Path) -> dict[str, bool]:
    mods = list_node_modules(
        node_dir.resolve().relative_to(get_project_root() / "knowledge").as_posix()
    )
    return {
        "has_preprocess": mods["has_preprocess"],
        "has_process": mods["has_process"],
        "has_judge": mods["has_judge"],
        "compat_mode": mods["compat_mode"],
    }


def run_preprocess(
    node_dir: Path,
    module_id: str,
    input_data: Any,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params = params or {}
    module_path = node_dir / "preprocess" / module_id / "module.py"
    if module_path.exists():
        fn = _load_callable(module_path, "generate", f"preprocess_{module_id}")
        result = fn(input_data, **params)
        if isinstance(result, dict):
            return result
        return {
            "clean": input_data,
            "degraded": result,
            "visualization": result,
            "metadata": {"module": module_id, "params": params},
        }

    dataset_path = node_dir / "dataset.py"
    if not dataset_path.exists():
        raise FileNotFoundError(f"未找到 preprocess/{module_id} 或 dataset.py")

    degrade_fn = _load_callable(dataset_path, "degrade", f"dataset_{node_dir.name}")
    degradation = module_id if module_id != "default_degrade" else params.pop("degradation", "gaussian_noise")
    result = degrade_fn(input_data, degradation=degradation, **params)
    if isinstance(result, dict):
        return result
    return {
        "clean": input_data,
        "degraded": result,
        "visualization": result,
        "metadata": {"module": module_id, "degradation": degradation, "params": params},
    }


def run_process(
    node_dir: Path,
    method_id: str,
    input_data: Any,
    process_kwargs: dict[str, Any] | None = None,
) -> tuple[Any, dict[str, Any]]:
    process_kwargs = process_kwargs or {}
    method_dir = resolve_process_dir(node_dir, method_id)
    model_path = method_dir / "model.py"
    process_fn = _load_callable(model_path, "process", f"process_{method_id}")
    result = process_fn(input_data, **process_kwargs)
    if isinstance(result, dict):
        output = result.get("output") or result.get("recovered") or result.get("image")
        return output, result.get("metadata", {})
    return result, {}


def run_judge(
    node_dir: Path,
    metric_id: str,
    reference: Any,
    prediction: Any,
    params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    params = params or {}
    module_path = node_dir / "judge" / metric_id / "module.py"
    if module_path.exists():
        fn = _load_callable(module_path, "evaluate", f"judge_{metric_id}")
        return fn(reference, prediction, **params)

    metrics_path = node_dir / "metrics.py"
    if not metrics_path.exists():
        raise FileNotFoundError(f"未找到 judge/{metric_id} 或 metrics.py")
    evaluate_fn = _load_callable(metrics_path, "evaluate", f"metrics_{node_dir.name}")
    return evaluate_fn(reference, prediction, metrics=[metric_id], **params)


def sync_method_dirs(node_dir: Path, method_id: str) -> None:
    """Keep methods/ and process/ in sync after add/import."""
    methods_dir = node_dir / "methods" / method_id
    process_dir = node_dir / "process" / method_id
    if methods_dir.exists() and not process_dir.exists():
        import shutil
        shutil.copytree(methods_dir, process_dir)
    elif process_dir.exists() and not methods_dir.exists():
        import shutil
        shutil.copytree(process_dir, methods_dir)
