"""Node export/import and structure validation."""

from __future__ import annotations

import json
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Any

from core.io_spec import validate_spec_fields
from core.tree import get_node_dir
from core.utils import get_exports_dir, get_knowledge_root, get_runtime_paths

WEIGHT_SUFFIXES = {".pth", ".pt", ".onnx", ".pb", ".ckpt", ".safetensors", ".h5"}
BLOCKED_SUFFIXES = {".exe", ".bat", ".cmd", ".ps1", ".sh", ".dll", ".msi"}
EXCLUDE_DIR_NAMES = {
    "__pycache__",
    "runtime",
    "uploads",
    "outputs",
    ".conda",
    "node_modules",
    "weights",
}
EXCLUDE_FILE_SUFFIXES = {".pyc", ".pyo"}


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        return ""


def _has_function(source: str, name: str) -> bool:
    pattern = rf"def\s+{re.escape(name)}\s*\("
    return bool(re.search(pattern, source))


def _infer_domain_from_path(node_path: Path) -> str | None:
    root = get_knowledge_root().resolve()
    try:
        rel = node_path.resolve().relative_to(root)
        if rel.parts:
            return rel.parts[0]
    except ValueError:
        pass
    return None


def patch_node_metadata(
    node_path: Path,
    domain_hint: str | None = None,
) -> list[str]:
    """Fill missing metadata fields in place. Returns warnings."""
    warnings: list[str] = []
    meta_path = node_path / "metadata.json"
    if not meta_path.exists():
        return warnings

    with open(meta_path, encoding="utf-8") as f:
        meta = json.load(f)

    changed = False
    folder_name = node_path.name

    if not meta.get("id"):
        meta["id"] = folder_name
        warnings.append(f"metadata.json 缺少 id，已从文件夹名推断为 {folder_name} 并已写回")
        changed = True

    if not meta.get("domain"):
        inferred = domain_hint or _infer_domain_from_path(node_path)
        if inferred:
            meta["domain"] = inferred
            warnings.append(
                f"metadata.json 缺少 domain，已从路径推断为 {inferred} 并已写回"
            )
            changed = True

    if not meta.get("status"):
        meta["status"] = "draft"
        warnings.append("metadata.json 缺少 status，已补为 draft")
        changed = True

    if changed:
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
            f.write("\n")

    return warnings


def validate_node(node_path: Path, domain_hint: str | None = None) -> dict[str, Any]:
    """Validate node folder structure without executing Python code."""
    errors: list[str] = []
    warnings: list[str] = []
    node_path = Path(node_path).resolve()

    meta_path = node_path / "metadata.json"
    if not meta_path.exists():
        errors.append("缺少 metadata.json")
        return {"valid": False, "errors": errors, "warnings": warnings}

    try:
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
    except json.JSONDecodeError:
        errors.append("metadata.json 不是合法 JSON")
        meta = {}

    for key in ("id", "title", "type"):
        if not meta.get(key):
            if key == "id":
                inferred_id = node_path.name
                if inferred_id:
                    warnings.append(
                        f"metadata.json 缺少 id，可从文件夹名推断为 {inferred_id}（导出前将自动补齐）"
                    )
                else:
                    errors.append("metadata.json 缺少字段: id")
            else:
                errors.append(f"metadata.json 缺少字段: {key}")

    if not meta.get("domain"):
        inferred = domain_hint or _infer_domain_from_path(node_path)
        if inferred:
            warnings.append(
                f"metadata.json 缺少 domain，可从路径推断为 {inferred}（导出前将自动补齐）"
            )
        else:
            errors.append("metadata.json 缺少字段: domain")

    if not (node_path / "content.md").exists() and not (node_path / "README.md").exists():
        warnings.append("缺少 content.md 或 README.md")

    dataset_path = node_path / "dataset.py"
    if not dataset_path.exists():
        errors.append("缺少 dataset.py")
    elif not _has_function(_read_text(dataset_path), "degrade"):
        errors.append("dataset.py 缺少 degrade()")

    metrics_path = node_path / "metrics.py"
    if not metrics_path.exists():
        errors.append("缺少 metrics.py")
    elif not _has_function(_read_text(metrics_path), "evaluate"):
        errors.append("metrics.py 缺少 evaluate()")

    methods_dir = node_path / "methods"
    if not methods_dir.is_dir():
        errors.append("缺少 methods/ 目录")
    else:
        method_dirs = [
            d for d in methods_dir.iterdir()
            if d.is_dir() and d.name not in EXCLUDE_DIR_NAMES and not d.name.startswith("_")
        ]
        if not method_dirs:
            errors.append("methods/ 下至少需要一个方法")
        for method_dir in method_dirs:
            mid = method_dir.name
            if not (method_dir / "metadata.json").exists():
                errors.append(f"方法 {mid} 缺少 metadata.json")
            if not (method_dir / "README.md").exists():
                warnings.append(f"方法 {mid} 缺少 README.md")
            model_path = method_dir / "model.py"
            if not model_path.exists():
                errors.append(f"方法 {mid} 缺少 model.py")
            elif not _has_function(_read_text(model_path), "process"):
                errors.append(f"方法 {mid} 的 model.py 缺少 process()")
            else:
                meta_path = method_dir / "metadata.json"
                if meta_path.exists():
                    try:
                        with open(meta_path, encoding="utf-8") as mf:
                            method_meta = json.load(mf)
                        for w in validate_spec_fields(method_meta.get("input_spec") or {}, f"方法 {mid} input_spec"):
                            warnings.append(w if "缺失" in w or "缺少" in w else w)
                        if not method_meta.get("input_spec"):
                            warnings.append(f"方法 {mid} 缺少 input_spec")
                        if not method_meta.get("output_spec"):
                            warnings.append(f"方法 {mid} 缺少 output_spec")
                        for w in validate_spec_fields(method_meta.get("output_spec") or {}, f"方法 {mid} output_spec"):
                            warnings.append(w)
                    except json.JSONDecodeError:
                        warnings.append(f"方法 {mid} metadata.json 不是合法 JSON")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "node_id": meta.get("id"),
        "title": meta.get("title"),
    }


def _should_exclude_from_export(arcname: str, include_weights: bool) -> bool:
    parts = PurePosixPath(arcname.replace("\\", "/")).parts
    if any(p in EXCLUDE_DIR_NAMES for p in parts):
        return True

    suffix = Path(arcname).suffix.lower()
    if suffix in EXCLUDE_FILE_SUFFIXES:
        return True
    if not include_weights and suffix in WEIGHT_SUFFIXES:
        return True
    if "weights" in parts and not include_weights:
        return True
    return False


def export_node(
    domain_id: str,
    node_id: str,
    include_weights: bool = False,
) -> dict[str, Any]:
    if include_weights:
        raise ValueError("当前版本暂不导出模型权重，请手动管理大模型文件。")

    node_dir = get_node_dir(domain_id, node_id)
    if not node_dir.exists():
        raise FileNotFoundError(f"节点不存在: {domain_id}/{node_id}")

    patch_warnings = patch_node_metadata(node_dir, domain_hint=domain_id)
    validation = validate_node(node_dir, domain_hint=domain_id)
    validation["warnings"] = patch_warnings + validation.get("warnings", [])
    if not validation["valid"]:
        raise ValueError("节点结构校验失败: " + "; ".join(validation["errors"]))

    exports_dir = get_exports_dir()
    exports_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"{domain_id}_{node_id}_{timestamp}.zip"
    zip_path = exports_dir / zip_name

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in node_dir.rglob("*"):
            if not file_path.is_file():
                continue
            arcname = f"{node_id}/{file_path.relative_to(node_dir).as_posix()}"
            if _should_exclude_from_export(arcname, include_weights):
                continue
            zf.write(file_path, arcname)

    return {
        "success": True,
        "export_path": str(zip_path),
        "download_url": f"/outputs/exports/{zip_name}",
        "filename": zip_name,
        "validation": validation,
    }


def _is_safe_zip_member(name: str, dest_dir: Path) -> bool:
    target = (dest_dir / name).resolve()
    return str(target).startswith(str(dest_dir.resolve()))


def _reject_dangerous_file(name: str) -> bool:
    suffix = Path(name).suffix.lower()
    return suffix in BLOCKED_SUFFIXES or suffix in WEIGHT_SUFFIXES


def _find_node_root(extract_dir: Path) -> Path | None:
    if (extract_dir / "metadata.json").exists():
        return extract_dir

    candidates: list[Path] = []
    for meta in extract_dir.rglob("metadata.json"):
        parent = meta.parent
        if (parent / "methods").is_dir():
            candidates.append(parent)

    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]

    candidates.sort(key=lambda p: len(p.parts))
    return candidates[0]


def import_node(
    archive_path: Path,
    target_domain: str,
    overwrite: bool = False,
) -> dict[str, Any]:
    runtime = get_runtime_paths()
    temp_root = runtime["temp"] / f"import_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    temp_root.mkdir(parents=True, exist_ok=True)

    try:
        with zipfile.ZipFile(archive_path, "r") as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue
                name = member.filename.replace("\\", "/")
                if not _is_safe_zip_member(name, temp_root):
                    raise ValueError(f"非法 zip 路径（zip slip）: {name}")
                if _reject_dangerous_file(name):
                    raise ValueError(f"拒绝导入的文件类型: {name}")

            zf.extractall(temp_root)

        node_root = _find_node_root(temp_root)
        if node_root is None:
            raise ValueError("无法在 zip 中找到有效节点根目录（需含 metadata.json 与 methods/）")

        validation = validate_node(node_root)
        if not validation["valid"]:
            raise ValueError("节点结构校验失败: " + "; ".join(validation["errors"]))

        with open(node_root / "metadata.json", encoding="utf-8") as f:
            meta = json.load(f)

        node_id = meta.get("id")
        if not node_id:
            raise ValueError("metadata.json 缺少 id")

        target_dir = get_node_dir(target_domain, node_id)
        if target_dir.exists():
            if not overwrite:
                raise FileExistsError(
                    f"目标节点已存在: {target_domain}/{node_id}，如需覆盖请设置 overwrite=true"
                )
            shutil.rmtree(target_dir)

        shutil.copytree(node_root, target_dir)

        from core.node_generator import register_node_in_domain

        domain_meta_path = get_knowledge_root() / target_domain / "metadata.json"
        with open(domain_meta_path, encoding="utf-8") as f:
            domain_meta = json.load(f)

        existing_ids = {n.get("id") for n in domain_meta.get("nodes", [])}
        if node_id not in existing_ids:
            register_node_in_domain(
                target_domain,
                {
                    "id": node_id,
                    "title": meta.get("title", node_id),
                    "description": meta.get("description", ""),
                    "status": meta.get("status", "draft"),
                    "section": "planned",
                    "order": 200,
                },
            )
        elif overwrite:
            nodes = domain_meta.get("nodes", [])
            for entry in nodes:
                if entry.get("id") == node_id:
                    entry["title"] = meta.get("title", entry.get("title", node_id))
                    entry["description"] = meta.get("description", entry.get("description", ""))
                    entry["status"] = meta.get("status", entry.get("status", "draft"))
            domain_meta["nodes"] = nodes
            with open(domain_meta_path, "w", encoding="utf-8") as f:
                json.dump(domain_meta, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "domain": target_domain,
            "node_id": node_id,
            "node_path": str(target_dir),
            "validation": validation,
        }
    finally:
        shutil.rmtree(temp_root, ignore_errors=True)


def validate_node_interfaces(node_dir: Path) -> dict[str, Any]:
    """Backward-compatible alias."""
    return validate_node(node_dir)
