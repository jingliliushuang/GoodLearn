"""Method template validation and ZIP import."""

from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Any

from core.io_spec import validate_spec_fields
from core.node_generator import _is_leaf_node
from core.packer import _has_function, _read_text
from core.tree import get_node_dir
from core.utils import get_project_root
from core.zip_import import cleanup_temp_dir, create_import_temp_dir, validate_and_extract_zip

METHOD_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")


def validate_method_template(method_path: Path) -> dict[str, Any]:
    """Validate a method folder without executing Python code."""
    errors: list[str] = []
    warnings: list[str] = []
    method_path = Path(method_path).resolve()
    folder_name = method_path.name

    if not METHOD_ID_PATTERN.match(folder_name):
        errors.append(f"方法目录名不安全或不符合规范: {folder_name}")

    meta_path = method_path / "metadata.json"
    if not meta_path.exists():
        errors.append("缺少 metadata.json")
        return {
            "valid": False,
            "errors": errors,
            "warnings": warnings,
            "metadata": {},
        }

    try:
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
    except json.JSONDecodeError:
        errors.append("metadata.json 不是合法 JSON")
        meta = {}

    for key in ("id", "title", "category", "backend"):
        if meta.get(key) in (None, ""):
            errors.append(f"metadata.json 缺少字段: {key}")

    if "available" not in meta:
        errors.append("metadata.json 缺少字段: available")

    method_id = meta.get("id", folder_name)
    if method_id and not METHOD_ID_PATTERN.match(str(method_id)):
        errors.append(f"metadata.id 不符合规范: {method_id}")
    elif method_id and method_id != folder_name:
        warnings.append(f"metadata.id ({method_id}) 与文件夹名 ({folder_name}) 不一致，将以 metadata.id 为准")

    input_spec = meta.get("input_spec")
    output_spec = meta.get("output_spec")
    if not input_spec:
        errors.append("metadata.json 缺少 input_spec")
    else:
        for w in validate_spec_fields(input_spec, "input_spec"):
            if "缺失" in w or "缺少" in w:
                errors.append(w)
            else:
                warnings.append(w)

    if not output_spec:
        errors.append("metadata.json 缺少 output_spec")
    else:
        for w in validate_spec_fields(output_spec, "output_spec"):
            if "缺失" in w or "缺少" in w:
                errors.append(w)
            else:
                warnings.append(w)

    if not (method_path / "README.md").exists():
        errors.append("缺少 README.md")

    if not (method_path / "detail.json").exists():
        warnings.append("缺少 detail.json")

    model_path = method_path / "model.py"
    if not model_path.exists():
        errors.append("缺少 model.py")
    elif not _has_function(_read_text(model_path), "process"):
        errors.append("model.py 缺少 process()")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "metadata": meta,
        "method_id": meta.get("id", folder_name),
    }


def _find_method_root(extract_dir: Path) -> Path | None:
    if (extract_dir / "metadata.json").exists() and (extract_dir / "model.py").exists():
        if not (extract_dir / "methods").is_dir():
            return extract_dir

    candidates: list[Path] = []
    for meta in extract_dir.rglob("metadata.json"):
        parent = meta.parent
        if (parent / "model.py").exists() and not (parent / "methods").is_dir():
            candidates.append(parent)

    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    candidates.sort(key=lambda p: len(p.parts))
    return candidates[0]


def _rel_knowledge_path(full_path: Path) -> str:
    root = get_project_root()
    try:
        return full_path.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        return str(full_path)


def import_method_template(
    archive_path: Path,
    target_domain: str,
    target_node_id: str,
    overwrite: bool = False,
) -> dict[str, Any]:
    node_dir = get_node_dir(target_domain, target_node_id)
    if not node_dir.exists():
        raise FileNotFoundError(f"目标节点不存在: {target_domain}/{target_node_id}")

    if not _is_leaf_node(target_domain, target_node_id):
        raise ValueError(f"节点 {target_node_id} 不是 leaf 节点，无法导入方法模板")

    temp_root = create_import_temp_dir()
    try:
        validate_and_extract_zip(archive_path, temp_root)

        method_root = _find_method_root(temp_root)
        if method_root is None:
            raise ValueError(
                "无法在 zip 中找到有效方法根目录（需含 metadata.json 与 model.py，且不含 methods/）"
            )

        validation = validate_method_template(method_root)
        if not validation["valid"]:
            raise ValueError("方法模板结构校验失败: " + "; ".join(validation["errors"]))

        meta = validation.get("metadata") or {}
        method_id = validation.get("method_id") or meta.get("id")
        if not method_id:
            raise ValueError("无法确定 method_id")

        target_method_dir = node_dir / "methods" / method_id
        if target_method_dir.exists():
            if not overwrite:
                raise FileExistsError(
                    f"目标方法已存在: {target_domain}/{target_node_id}/methods/{method_id}，"
                    "如需覆盖请设置 overwrite=true"
                )
            shutil.rmtree(target_method_dir)

        shutil.copytree(method_root, target_method_dir)

        from core.module_compat import sync_method_dirs
        sync_method_dirs(node_dir, method_id)

        return {
            "success": True,
            "type": "method",
            "domain": target_domain,
            "node_id": target_node_id,
            "method_id": method_id,
            "target_path": _rel_knowledge_path(target_method_dir),
            "input_spec": meta.get("input_spec"),
            "output_spec": meta.get("output_spec"),
            "validation": {
                "valid": validation["valid"],
                "errors": validation.get("errors", []),
                "warnings": validation.get("warnings", []),
            },
        }
    finally:
        cleanup_temp_dir(temp_root)
