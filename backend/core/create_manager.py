"""Create module — professional node packages and method uploads."""

from __future__ import annotations

import json
import re
import shutil
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath
from typing import Any, Optional

from core.io_spec import build_spec, infer_default_specs
from core.module_compat import node_module_flags, sync_method_dirs
from core.method_packer import validate_method_template
from core.node_generator import register_node_in_domain
from core.packer import (
    EXCLUDE_DIR_NAMES,
    EXCLUDE_FILE_SUFFIXES,
    WEIGHT_SUFFIXES,
    _find_node_root,
    _has_function,
    _read_text,
    _should_exclude_from_export,
    patch_node_metadata,
    validate_node,
)
from core.utils import get_exports_dir, get_knowledge_root, get_project_root
from core.zip_import import cleanup_temp_dir, create_import_temp_dir, validate_and_extract_zip

SAFE_ID_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
MANIFEST_FILENAME = "package_manifest.json"
PACKAGE_TYPE = "professional_node"
SCHEMA_VERSION = "1.0"

PARENT_PATH_PRESETS = [
    "cv",
    "cv/image_restoration",
    "cv/deep_vision",
    "cv/computational_imaging",
]


def is_safe_id(value: str) -> bool:
    return bool(value and SAFE_ID_PATTERN.match(value))


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


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


def list_professional_nodes(domain: str) -> list[dict[str, Any]]:
    domain_dir = get_knowledge_root() / domain
    if not domain_dir.is_dir():
        return []

    nodes: list[dict[str, Any]] = []
    for meta_path in sorted(domain_dir.rglob("metadata.json")):
        node_dir = meta_path.parent
        if node_dir == domain_dir:
            continue

        meta = read_json(meta_path, {})
        node_type = meta.get("type", "leaf")
        if node_type == "workspace":
            node_path = node_path_from_dir(node_dir)
            nodes.append(
                {
                    "id": meta.get("id", node_dir.name),
                    "title": meta.get("title", node_dir.name),
                    "description": meta.get("description", ""),
                    "status": meta.get("status", "draft"),
                    "type": "workspace",
                    "domain": meta.get("domain", domain),
                    "parent_path": meta.get("parent_path", domain),
                    "node_path": node_path,
                    "path": str(node_dir),
                    "has_preprocess": False,
                    "has_process": False,
                    "has_judge": False,
                    "compat_mode": False,
                }
            )
            continue

        has_methods = (node_dir / "methods").is_dir()
        has_process = (node_dir / "process").is_dir()
        if not has_methods and not has_process:
            continue

        meta = read_json(meta_path, {})
        node_path = node_path_from_dir(node_dir)
        flags = node_module_flags(node_dir)
        nodes.append(
            {
                "id": meta.get("id", node_dir.name),
                "title": meta.get("title", node_dir.name),
                "description": meta.get("description", ""),
                "status": meta.get("status", "draft"),
                "type": meta.get("type", "leaf"),
                "domain": meta.get("domain", domain),
                "parent_path": meta.get("parent_path", domain),
                "node_path": node_path,
                "path": str(node_dir),
                **flags,
            }
        )
    return nodes


def build_package_manifest(
    node_dir: Path,
    *,
    include_papers: bool = True,
    include_weights: bool = False,
) -> dict[str, Any]:
    meta = read_json(node_dir / "metadata.json", {})
    node_id = meta.get("id", node_dir.name)
    domain = meta.get("domain") or node_path_from_dir(node_dir).split("/")[0]
    node_path = node_path_from_dir(node_dir)
    parent_path = meta.get("parent_path") or "/".join(node_path.split("/")[:-1])

    return {
        "package_type": PACKAGE_TYPE,
        "schema_version": SCHEMA_VERSION,
        "node_id": node_id,
        "title": meta.get("title", node_id),
        "domain": domain,
        "parent_path": parent_path,
        "target_path": f"knowledge/{node_path}",
        "exported_at": datetime.now().isoformat(timespec="seconds"),
        "include_papers": include_papers,
        "include_weights": include_weights,
        "description": meta.get("description", ""),
    }


def validate_node_package(node_dir: Path, domain_hint: str | None = None) -> dict[str, Any]:
    result = validate_node(node_dir, domain_hint=domain_hint)
    manifest_path = node_dir / MANIFEST_FILENAME
    if manifest_path.exists():
        manifest = read_json(manifest_path, {})
        if manifest.get("package_type") != PACKAGE_TYPE:
            result.setdefault("warnings", []).append(
                f"{MANIFEST_FILENAME} package_type 不是 professional_node"
            )
    return result


def make_placeholder_model_py(method_title: str) -> str:
    return f'''import numpy as np


def process(degraded_image: np.ndarray, **kwargs) -> np.ndarray:
    """
    {method_title} 方法占位实现。

    TODO:
    1. 在这里加载模型或实现算法。
    2. 输入 degraded_image。
    3. 输出 recovered image。
    """
    return degraded_image
'''


def check_model_py_content(content: str) -> None:
    if not _has_function(content, "process"):
        raise ValueError("model.py 必须包含 def process 接口")


def update_papers_json(
    node_dir: Path,
    method_id: str,
    method_title: str,
    paper_meta: dict[str, Any],
    local_pdf_rel: Optional[str],
) -> dict[str, Any]:
    papers_path = node_dir / "papers.json"
    papers = read_json(papers_path, [])
    if not isinstance(papers, list):
        papers = []

    paper_id = paper_meta.get("id") or method_id
    new_item = {
        "id": paper_id,
        "method": method_title,
        "title": paper_meta.get("title") or method_title,
        "authors": paper_meta.get("authors", ""),
        "year": paper_meta.get("year", ""),
        "venue": paper_meta.get("venue", ""),
        "type": paper_meta.get("type", paper_meta.get("category", "")),
        "paper_url": paper_meta.get("paper_url", ""),
        "local_pdf": local_pdf_rel or "",
        "summary": paper_meta.get("summary", ""),
        "core_idea": paper_meta.get("core_idea", []),
        "difficulty": paper_meta.get("difficulty", "medium"),
    }

    replaced = False
    for idx, item in enumerate(papers):
        if item.get("id") == paper_id:
            papers[idx] = new_item
            replaced = True
            break
    if not replaced:
        papers.append(new_item)

    write_json(papers_path, papers)
    return new_item


def add_method_to_node(
    *,
    project_root: Path,
    node_path: str,
    method_id: str,
    method_title: str,
    description: str,
    category: str,
    backend: str,
    available: bool,
    input_spec: dict[str, Any],
    output_spec: dict[str, Any],
    paper_meta: Optional[dict[str, Any]] = None,
    paper_pdf_path: Optional[Path] = None,
    model_py_path: Optional[Path] = None,
    model_file_path: Optional[Path] = None,
) -> dict[str, Any]:
    if not is_safe_id(method_id):
        raise ValueError("method_id 只能包含小写英文、数字和下划线，且以字母开头")

    node_dir = safe_node_path(project_root, node_path)
    if not node_dir.exists():
        raise FileNotFoundError(f"节点不存在: {node_dir}")

    node_meta = read_json(node_dir / "metadata.json", {})
    if node_meta.get("type") not in ("leaf", None):
        raise ValueError("只能向 leaf 专业节点添加方法")

    method_dir = node_dir / "methods" / method_id
    if method_dir.exists():
        raise FileExistsError(f"方法已存在: {method_id}")

    method_dir.mkdir(parents=True, exist_ok=False)
    weights: list[str] = []
    local_pdf_rel = ""

    try:
        if paper_pdf_path and paper_pdf_path.exists():
            pdf_dir = node_dir / "papers" / "files"
            pdf_dir.mkdir(parents=True, exist_ok=True)
            safe_pdf_name = f"{method_id}_paper.pdf"
            pdf_target = pdf_dir / safe_pdf_name
            shutil.copy2(paper_pdf_path, pdf_target)
            local_pdf_rel = f"papers/files/{safe_pdf_name}"

        if model_file_path and model_file_path.exists():
            ext = model_file_path.suffix.lower()
            weights_dir = method_dir / "weights"
            weights_dir.mkdir(parents=True, exist_ok=True)
            target_model_file = weights_dir / model_file_path.name
            shutil.copy2(model_file_path, target_model_file)
            if ext in WEIGHT_SUFFIXES:
                weights.append(model_file_path.name)
            (weights_dir / "README.md").write_text(
                "# 模型权重\n\n请将权重文件放在此目录，并在 metadata.json 的 weights 字段中登记。\n",
                encoding="utf-8",
            )

        model_py_target = method_dir / "model.py"
        if model_py_path and model_py_path.exists():
            content = model_py_path.read_text(encoding="utf-8")
            check_model_py_content(content)
            model_py_target.write_text(content, encoding="utf-8")
        else:
            model_py_target.write_text(make_placeholder_model_py(method_title), encoding="utf-8")

        paper_meta = paper_meta or {}
        paper_item = None
        if paper_meta or local_pdf_rel:
            paper_item = update_papers_json(
                node_dir=node_dir,
                method_id=method_id,
                method_title=method_title,
                paper_meta=paper_meta,
                local_pdf_rel=local_pdf_rel,
            )

        reason = ""
        if not available:
            reason = "方法已添加，但模型实现或依赖尚未确认。"

        metadata = {
            "id": method_id,
            "title": method_title,
            "category": category,
            "description": description,
            "backend": backend,
            "available": bool(available),
            "reason": reason,
            "requirements": [],
            "weights": weights,
            "input_spec": input_spec,
            "output_spec": output_spec,
            "params_schema": [],
            "created_at": datetime.now().isoformat(timespec="seconds"),
        }
        write_json(method_dir / "metadata.json", metadata)

        detail = {
            "id": method_id,
            "title": method_title,
            "problem": f"{method_title} 用于解决当前节点任务。",
            "core_idea": [
                "TODO：补充方法核心思想。",
                "TODO：补充算法流程。",
                "TODO：补充与其他方法的区别。",
            ],
            "pipeline": [
                "输入 degraded data",
                "执行模型或算法推理",
                "输出 prediction / recovered result",
            ],
            "advantages": ["TODO：补充方法优点。"],
            "limitations": ["TODO：补充方法局限。"],
            "suitable_for": ["TODO：补充适用场景。"],
            "code_entry": "model.py",
            "paper_relation": {
                "paper_id": paper_item.get("id") if paper_item else "",
                "title": paper_item.get("title") if paper_item else "",
                "local_pdf": local_pdf_rel,
                "paper_url": paper_item.get("paper_url") if paper_item else "",
                "note": "该方法通过 Create 模块添加。",
            },
            "teaching_notes": "这是通过 Create 模块添加的方法，可继续补充论文解读、代码说明和实验结果。",
        }
        write_json(method_dir / "detail.json", detail)

        readme = f"""# {method_title}

该方法通过 GoodLearnApp Create 模块添加。

## 方法描述

{description}

## 后端类型

{backend}

## 输入输出

- 输入: {input_spec}
- 输出: {output_spec}

## 论文

{paper_item.get("title") if paper_item else "暂无"}

## 模型文件

{", ".join(weights) if weights else "暂无模型权重或无需权重"}

## TODO

- 补充数学原理
- 补充论文解读
- 补充 model.py 实现
- 补充参数配置
"""
        (method_dir / "README.md").write_text(readme, encoding="utf-8")

        validation = validate_method_template(method_dir)
        sync_method_dirs(node_dir, method_id)
        rel_method = f"knowledge/{node_path_from_dir(node_dir)}/methods/{method_id}"

        return {
            "success": True,
            "method_id": method_id,
            "method_path": rel_method,
            "paper_saved": bool(local_pdf_rel),
            "model_saved": bool(weights) or (model_py_path is not None),
            "available": bool(available),
            "paper": paper_item,
            "metadata": metadata,
            "validation": {
                "valid": validation.get("valid", False),
                "errors": validation.get("errors", []),
                "warnings": validation.get("warnings", []),
            },
        }
    except Exception:
        if method_dir.exists():
            shutil.rmtree(method_dir, ignore_errors=True)
        raise


EXPERIMENT_JSON_STUB = {
    "stages": {
        "dataset_generation": {"methods": []},
        "inference": {},
        "evaluation": {"metrics": []},
    }
}


def create_professional_node(
    *,
    project_root: Path,
    domain: str,
    parent_path: str,
    node_id: str,
    title: str,
    description: str = "",
    node_type: str = "leaf",
    input_type: str = "single_image",
    mode: str = "standard_experiment",
) -> dict[str, Any]:
    if not is_safe_id(node_id):
        raise ValueError("node_id 非法")
    if not domain or ".." in domain or "/" in domain:
        raise ValueError("domain 非法")

    parent_path = parent_path.replace("\\", "/").strip("/")
    if ".." in parent_path.split("/"):
        raise ValueError("parent_path 非法")

    if parent_path != domain and not parent_path.startswith(f"{domain}/"):
        raise ValueError(f"parent_path 必须以 {domain} 开头")

    node_path = f"{parent_path}/{node_id}" if parent_path else f"{domain}/{node_id}"
    node_dir = safe_node_path(project_root, node_path)

    if node_dir.exists():
        raise FileExistsError(f"节点目录已存在: {node_dir}")

    domain_meta_path = get_knowledge_root() / domain / "metadata.json"
    if not domain_meta_path.exists():
        raise FileNotFoundError(f"领域不存在: {domain}")

    now = datetime.now().isoformat(timespec="seconds")
    node_dir.mkdir(parents=True)

    metadata = {
        "id": node_id,
        "title": title,
        "type": node_type,
        "domain": domain,
        "parent_path": parent_path,
        "node_path": node_path,
        "description": description,
        "status": "draft",
        "input_type": input_type,
        "mode": mode,
        "created_at": now,
    }
    write_json(node_dir / "metadata.json", metadata)

    content = f"""# {title}

## 任务定义

{description or "（待补充）"}

## 输入输出

- 输入：{input_type}
- 输出：处理结果

## 常见方法

（待补充）

## 学习目标

（待补充）
"""
    (node_dir / "content.md").write_text(content, encoding="utf-8")
    write_json(node_dir / "papers.json", [])
    write_json(node_dir / "resources.json", [])
    write_json(node_dir / "experiment.json", EXPERIMENT_JSON_STUB)

    from core.node_generator import DATASET_PY, METRICS_PY, BASELINE_MODEL_PY, BASELINE_README, NODE_README

    (node_dir / "dataset.py").write_text(DATASET_PY, encoding="utf-8")
    (node_dir / "metrics.py").write_text(METRICS_PY, encoding="utf-8")
    (node_dir / "README.md").write_text(NODE_README.format(title=title), encoding="utf-8")

    methods_dir = node_dir / "methods" / "baseline"
    methods_dir.mkdir(parents=True)
    default_in, default_out = infer_default_specs(node_id)
    write_json(
        methods_dir / "metadata.json",
        {
            "id": "baseline",
            "title": "Baseline 占位方法",
            "description": "自动生成的占位方法，待替换",
            "category": "baseline",
            "backend": "custom",
            "available": False,
            "reason": "占位方法",
            "input_spec": default_in,
            "output_spec": default_out,
            "params_schema": [],
            "weights": [],
        },
    )
    (methods_dir / "README.md").write_text(BASELINE_README, encoding="utf-8")
    (methods_dir / "model.py").write_text(BASELINE_MODEL_PY, encoding="utf-8")
    sync_method_dirs(node_dir, "baseline")

    for sub in ("preprocess", "process", "judge", "test", "papers/files"):
        (node_dir / sub).mkdir(parents=True, exist_ok=True)
    (node_dir / "preprocess" / "README.md").write_text(
        "# preprocess\n\n测试集生成模块目录。每个子目录含 module.py（generate 接口）。\n",
        encoding="utf-8",
    )
    (node_dir / "judge" / "README.md").write_text(
        "# judge\n\n评价模块目录。每个子目录含 module.py（evaluate 接口）。\n",
        encoding="utf-8",
    )
    (node_dir / "test" / "README.md").write_text(
        "# test\n\n节点实验结果保存目录（本地，不提交 Git）。\n",
        encoding="utf-8",
    )

    tests_dir = node_dir / "tests"
    tests_dir.mkdir()
    (tests_dir / ".gitkeep").write_text("", encoding="utf-8")

    manifest = build_package_manifest(node_dir)
    write_json(node_dir / MANIFEST_FILENAME, manifest)

    try:
        register_node_in_domain(
            domain,
            {
                "id": node_id,
                "title": title,
                "description": description,
                "status": "draft",
                "section": "planned",
                "order": 200,
                "node_path": node_path,
            },
        )
    except ValueError:
        pass

    validation = validate_node_package(node_dir, domain_hint=domain)
    return {
        "success": True,
        "domain": domain,
        "node_id": node_id,
        "node_path": node_path,
        "target_path": f"knowledge/{node_path}",
        "node_dir": str(node_dir),
        "validation": validation,
    }


def _scan_zip_for_weights(extract_dir: Path) -> list[str]:
    found: list[str] = []
    for file_path in extract_dir.rglob("*"):
        if not file_path.is_file():
            continue
        rel = file_path.relative_to(extract_dir).as_posix()
        parts = PurePosixPath(rel).parts
        if "weights" in parts:
            found.append(rel)
        elif file_path.suffix.lower() in WEIGHT_SUFFIXES:
            found.append(rel)
    return found


def import_professional_node(
    archive_path: Path,
    overwrite: bool = False,
) -> dict[str, Any]:
    temp_root = create_import_temp_dir()
    import_warnings: list[str] = []

    try:
        validate_and_extract_zip(archive_path, temp_root)

        manifest_candidates = list(temp_root.rglob(MANIFEST_FILENAME))
        if not manifest_candidates:
            raise ValueError(f"zip 中缺少 {MANIFEST_FILENAME}")

        manifest_path = manifest_candidates[0]
        manifest = read_json(manifest_path, {})
        if manifest.get("package_type") != PACKAGE_TYPE:
            raise ValueError("package_manifest.package_type 必须为 professional_node")

        target_path_str = manifest.get("target_path", "")
        if not target_path_str.startswith("knowledge/"):
            raise ValueError("target_path 必须位于 knowledge/ 下")

        rel_under_knowledge = target_path_str[len("knowledge/") :]
        target_dir = safe_node_path(get_project_root(), rel_under_knowledge)

        include_weights = bool(manifest.get("include_weights", False))
        weight_files = _scan_zip_for_weights(temp_root)
        if weight_files and not include_weights:
            raise ValueError(
                "zip 中包含模型权重，但 include_weights=false。"
                "请通过「添加方法」界面上传权重，或使用不含权重的导出包。"
            )

        node_root = manifest_path.parent
        if not (node_root / "methods").is_dir():
            node_root = _find_node_root(temp_root)
        if node_root is None:
            raise ValueError("无法在 zip 中找到有效节点根目录")

        domain = manifest.get("domain") or rel_under_knowledge.split("/")[0]
        validation = validate_node_package(node_root, domain_hint=domain)
        if not validation["valid"]:
            err_msg = "; ".join(validation.get("errors", []))
            raise ValueError(f"节点结构校验失败: {err_msg}")

        if target_dir.exists():
            if not overwrite:
                raise FileExistsError(
                    f"目标路径已存在: {target_path_str}，如需覆盖请设置 overwrite=true"
                )
            shutil.rmtree(target_dir)

        target_dir.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(node_root, target_dir)

        meta = read_json(target_dir / "metadata.json", {})
        node_id = meta.get("id") or manifest.get("node_id") or target_dir.name

        try:
            register_node_in_domain(
                domain,
                {
                    "id": node_id,
                    "title": meta.get("title", manifest.get("title", node_id)),
                    "description": meta.get("description", manifest.get("description", "")),
                    "status": meta.get("status", "imported"),
                    "section": "planned",
                    "order": 200,
                    "node_path": rel_under_knowledge,
                },
            )
        except ValueError:
            import_warnings.append(f"节点 {node_id} 已在领域 {domain} 注册，跳过注册")

        all_warnings = import_warnings + validation.get("warnings", [])
        return {
            "success": True,
            "node_id": node_id,
            "title": meta.get("title", manifest.get("title", node_id)),
            "target_path": target_path_str,
            "node_path": rel_under_knowledge,
            "warnings": all_warnings,
            "validation": {
                "valid": validation["valid"],
                "errors": validation.get("errors", []),
                "warnings": all_warnings,
            },
        }
    finally:
        cleanup_temp_dir(temp_root)


def export_professional_node(
    node_path: str,
    include_papers: bool = True,
    include_weights: bool = False,
) -> dict[str, Any]:
    if include_weights:
        raise ValueError("当前版本暂不导出模型权重，请手动管理大模型文件。")

    node_dir = safe_node_path(get_project_root(), node_path)
    if not node_dir.exists():
        raise FileNotFoundError(f"节点不存在: {node_path}")

    domain = node_path.split("/")[0]
    patch_warnings = patch_node_metadata(node_dir, domain_hint=domain)
    validation = validate_node_package(node_dir, domain_hint=domain)
    validation["warnings"] = patch_warnings + validation.get("warnings", [])

    if not validation["valid"]:
        raise ValueError("节点结构校验失败: " + "; ".join(validation["errors"]))

    meta = read_json(node_dir / "metadata.json", {})
    node_id = meta.get("id", node_dir.name)

    manifest = build_package_manifest(
        node_dir,
        include_papers=include_papers,
        include_weights=include_weights,
    )
    write_json(node_dir / MANIFEST_FILENAME, manifest)

    exports_dir = get_exports_dir()
    exports_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    zip_name = f"{node_id}_{timestamp}.node.zip"
    zip_path = exports_dir / zip_name

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for file_path in node_dir.rglob("*"):
            if not file_path.is_file():
                continue
            rel = file_path.relative_to(node_dir).as_posix()
            arcname = f"{node_id}/{rel}"

            if not include_papers and rel.startswith("papers/files/"):
                continue
            if rel.startswith("test/"):
                continue
            if _should_exclude_from_export(arcname, include_weights):
                continue

            zf.write(file_path, arcname)

    return {
        "success": True,
        "export_path": str(zip_path),
        "download_url": f"/outputs/exports/{zip_name}",
        "filename": zip_name,
        "package_type": PACKAGE_TYPE,
        "target_path": manifest["target_path"],
        "validation": validation,
    }
