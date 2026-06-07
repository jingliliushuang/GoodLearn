"""Runtime availability checks for knowledge-tree methods."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path
from typing import Any

from core.tree import get_knowledge_root, get_method_dir
from core.utils import get_external_model_root


def _can_import(module_name: str) -> bool:
    try:
        importlib.import_module(module_name)
        return True
    except ImportError:
        return False


def _has_dnn_superres() -> bool:
    try:
        import cv2

        return hasattr(cv2, "dnn_superres")
    except ImportError:
        return False


def _has_sift() -> bool:
    try:
        import cv2

        return hasattr(cv2, "SIFT_create")
    except ImportError:
        return False


def _has_process_function(model_path: Path) -> bool:
    if not model_path.exists():
        return False
    spec = importlib.util.spec_from_file_location(f"check_{model_path.stem}", model_path)
    if spec is None or spec.loader is None:
        return False
    module = importlib.util.module_from_spec(spec)
    try:
        spec.loader.exec_module(module)
    except Exception:
        return False
    process = getattr(module, "process", None)
    return callable(process)


def _collect_weight_names(meta: dict[str, Any]) -> list[str]:
    names: list[str] = []
    for item in meta.get("weights", []):
        if item and item not in names:
            names.append(item)
    external = meta.get("external_model")
    if external and external not in names:
        names.append(external)
    return names


def _resolve_weight(method_dir: Path, weight_name: str) -> Path | None:
    local_candidates = [
        method_dir / "weights" / weight_name,
        method_dir / weight_name,
    ]
    for path in local_candidates:
        if path.exists():
            return path

    external_root = get_external_model_root()
    direct = external_root / weight_name
    if direct.exists():
        return direct

    if external_root.is_dir():
        for path in external_root.rglob(weight_name):
            if path.is_file():
                return path
    return None


def _infer_requirements(meta: dict[str, Any], weight_names: list[str]) -> list[str]:
    """Derive runtime requirements from weight suffix and backend type."""
    requirements: set[str] = set()
    backend = meta.get("backend", "")

    if backend == "opencv_dnn_superres":
        if not _has_dnn_superres():
            requirements.add("opencv-contrib-python")

    if backend == "opencv_sift":
        if not _has_sift():
            requirements.add("opencv-contrib-python")

    for weight_name in weight_names:
        suffix = Path(weight_name).suffix.lower()
        if suffix == ".onnx":
            requirements.add("onnxruntime")
        elif suffix in {".pth", ".pt"}:
            requirements.add("torch")
        elif suffix == ".pb":
            if not _has_dnn_superres():
                requirements.add("opencv-contrib-python")

    return sorted(requirements)


def _check_requirements(requirements: list[str]) -> list[str]:
    missing: list[str] = []
    for dep in requirements:
        if dep == "opencv-contrib-python":
            if not _has_dnn_superres() and not _has_sift():
                missing.append(dep)
        elif not _can_import(dep):
            missing.append(dep)
    return missing


def check_method(domain_id: str, node_id: str, method_id: str) -> dict[str, Any]:
    method_dir = get_method_dir(domain_id, node_id, method_id)
    meta_path = method_dir / "metadata.json"

    if not meta_path.exists():
        return {
            "id": method_id,
            "title": method_id,
            "category": "unknown",
            "available": False,
            "reason": "缺少 metadata.json",
            "requirements": [],
            "weights": [],
            "missing_dependencies": [],
            "missing_weights": [],
            "detected_weights": [],
        }

    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)

    if meta.get("available") is False:
        return _build_status(
            meta, method_id, False,
            meta.get("reason", "不可用"),
            meta.get("requirements", []),
            _collect_weight_names(meta), [], [], [],
        )

    weight_names = _collect_weight_names(meta)
    requirements = _infer_requirements(meta, weight_names)
    missing_dependencies: list[str] = []
    missing_weights: list[str] = []
    detected_weights: list[str] = []

    model_path = method_dir / "model.py"
    if not model_path.exists():
        return _build_status(meta, method_id, False, "缺少 model.py", requirements, weight_names,
                           missing_dependencies, missing_weights, detected_weights)

    if not _has_process_function(model_path):
        return _build_status(meta, method_id, False, "model.py 未实现 process()", requirements,
                           weight_names, missing_dependencies, missing_weights, detected_weights)

    for weight_name in weight_names:
        resolved = _resolve_weight(method_dir, weight_name)
        if resolved is not None:
            detected_weights.append(str(resolved))
        else:
            missing_weights.append(weight_name)

    missing_dependencies = _check_requirements(requirements)

    if missing_dependencies:
        dep_msg = ", ".join(missing_dependencies)
        if "opencv-contrib-python" in missing_dependencies:
            reason = f"缺少 opencv-contrib-python，请在项目内后端环境安装 opencv-contrib-python"
        else:
            reason = f"缺少依赖: {dep_msg}"
        return _build_status(meta, method_id, False, reason, requirements, weight_names,
                           missing_dependencies, missing_weights, detected_weights)

    if missing_weights:
        reason = f"缺少权重: {', '.join(missing_weights)}"
        return _build_status(meta, method_id, False, reason, requirements, weight_names,
                           missing_dependencies, missing_weights, detected_weights)

    if not meta.get("inference_enabled", True):
        return _build_status(meta, method_id, False, "推理接口尚未接入", requirements, weight_names,
                           missing_dependencies, missing_weights, detected_weights)

    return _build_status(meta, method_id, True, "", requirements, weight_names,
                       missing_dependencies, missing_weights, detected_weights)


def _build_status(
    meta: dict[str, Any],
    method_id: str,
    available: bool,
    reason: str,
    requirements: list[str],
    weight_names: list[str],
    missing_dependencies: list[str],
    missing_weights: list[str],
    detected_weights: list[str],
) -> dict[str, Any]:
    return {
        "id": meta.get("id", method_id),
        "title": meta.get("title", method_id),
        "category": meta.get("category", "traditional"),
        "description": meta.get("description", ""),
        "backend": meta.get("backend", ""),
        "available": available,
        "reason": reason,
        "requirements": requirements,
        "weights": weight_names,
        "missing_dependencies": missing_dependencies,
        "missing_weights": missing_weights,
        "detected_weights": detected_weights,
        "params_schema": meta.get("params_schema", []) if isinstance(meta.get("params_schema"), list) else [],
    }


def check_node_methods(domain_id: str, node_id: str) -> list[dict[str, Any]]:
    methods_dir = get_knowledge_root() / domain_id / node_id / "methods"
    if not methods_dir.exists():
        return []

    results: list[dict[str, Any]] = []
    for method_dir in sorted(methods_dir.iterdir()):
        if method_dir.is_dir() and (method_dir / "metadata.json").exists():
            results.append(check_method(domain_id, node_id, method_dir.name))
    return results


def scan_all_methods(domain_id: str = "cv") -> list[dict[str, Any]]:
    domain_dir = get_knowledge_root() / domain_id
    if not domain_dir.exists():
        return []

    results: list[dict[str, Any]] = []
    for node_dir in sorted(domain_dir.iterdir()):
        if node_dir.is_dir() and (node_dir / "metadata.json").exists():
            methods_dir = node_dir / "methods"
            if methods_dir.exists():
                results.extend(check_node_methods(domain_id, node_dir.name))
    return results
