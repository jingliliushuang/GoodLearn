"""Safe soft-delete for knowledge nodes and methods."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime
from pathlib import Path
from typing import Any

from core.tree import get_method_dir, get_node_dir
from core.utils import get_knowledge_root, get_trash_dir

SAFE_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")

PROTECTED_NODES: set[tuple[str, str]] = {
    ("cv", "denoise"),
    ("cv", "super_resolution"),
    ("cv", "feature_matching"),
    ("cv", "image_classification"),
    ("cv", "object_detection"),
}

PROTECTED_METHODS: set[tuple[str, str, str]] = {
    ("cv", "super_resolution", "nearest"),
    ("cv", "super_resolution", "bilinear"),
    ("cv", "super_resolution", "bicubic"),
    ("cv", "super_resolution", "lanczos"),
    ("cv", "super_resolution", "espcn"),
    ("cv", "super_resolution", "edsr"),
    ("cv", "denoise", "gaussian_blur"),
    ("cv", "denoise", "median_filter"),
    ("cv", "denoise", "bilateral_filter"),
    ("cv", "denoise", "nlm_denoise"),
    ("cv", "feature_matching", "sift"),
    ("cv", "feature_matching", "orb"),
    ("cv", "feature_matching", "ransac_homography"),
}

DELETABLE_NODE_STATUSES = frozenset({"draft", "imported", "custom"})
DELETABLE_METHOD_STATUSES = frozenset({"draft", "imported", "custom"})


def is_safe_name(name: str) -> bool:
    return bool(name and SAFE_NAME_PATTERN.match(name))


def _ensure_under_knowledge(path: Path) -> Path:
    root = get_knowledge_root().resolve()
    resolved = path.resolve()
    if resolved == root:
        raise ValueError("不允许删除 knowledge 根目录")
    if not str(resolved).startswith(str(root) + "\\") and not str(resolved).startswith(str(root) + "/"):
        raise ValueError("目标路径不在 knowledge/ 下")
    return resolved


def _ensure_under_trash(path: Path) -> Path:
    root = get_trash_dir().resolve()
    resolved = path.resolve()
    if not str(resolved).startswith(str(root) + "\\") and not str(resolved).startswith(str(root) + "/"):
        raise ValueError("回收站路径非法")
    return resolved


def get_safe_node_path(domain: str, node_id: str) -> Path:
    if not is_safe_name(domain) or not is_safe_name(node_id):
        raise ValueError("domain 或 node_id 包含非法字符")
    domain_dir = get_knowledge_root() / domain
    if not domain_dir.is_dir():
        raise ValueError(f"领域不存在: {domain}")
    if domain_dir.resolve() == get_knowledge_root().resolve():
        raise ValueError("不允许删除领域目录")
    return _ensure_under_knowledge(get_node_dir(domain, node_id))


def get_safe_method_path(domain: str, node_id: str, method_id: str) -> Path:
    if not is_safe_name(method_id):
        raise ValueError("method_id 包含非法字符")
    node_path = get_safe_node_path(domain, node_id)
    method_path = node_path / "methods" / method_id
    return _ensure_under_knowledge(method_path)


def is_protected_node(domain: str, node_id: str) -> bool:
    return (domain, node_id) in PROTECTED_NODES


def is_protected_method(domain: str, node_id: str, method_id: str) -> bool:
    return (domain, node_id, method_id) in PROTECTED_METHODS


def _load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def can_delete_node(domain: str, node_id: str, meta: dict[str, Any] | None = None) -> tuple[bool, str]:
    if is_protected_node(domain, node_id):
        return False, "该节点是系统核心节点，不能在节点管理中删除。"

    if meta is None:
        meta_path = get_node_dir(domain, node_id) / "metadata.json"
        meta = _load_json(meta_path)

    status = meta.get("status", "draft")
    if status in DELETABLE_NODE_STATUSES:
        return True, ""

    if status == "ready":
        return False, "ready 状态节点不可删除。如需删除，请先将 metadata.json 中 status 改为 draft。"

    return False, f"节点 status={status!r} 不可删除。"


def can_delete_method(
    domain: str,
    node_id: str,
    method_id: str,
    meta: dict[str, Any] | None = None,
) -> tuple[bool, str]:
    if is_protected_method(domain, node_id, method_id):
        return False, "该方法是当前节点核心方法，不能删除。"

    if meta is None:
        meta_path = get_method_dir(domain, node_id, method_id) / "metadata.json"
        meta = _load_json(meta_path)

    status = meta.get("status", "")
    if status in DELETABLE_METHOD_STATUSES:
        return True, ""

    if meta.get("available") is False and meta.get("backend") == "planned":
        return True, ""

    if meta.get("available") is False and meta.get("inference_enabled") is False:
        return True, ""

    return False, "该方法不可删除（非模板方法或未标记为可删除状态）。"


def _list_method_entries(domain: str, node_id: str) -> list[dict[str, Any]]:
    methods_dir = get_node_dir(domain, node_id) / "methods"
    if not methods_dir.is_dir():
        return []

    entries: list[dict[str, Any]] = []
    for method_dir in sorted(methods_dir.iterdir()):
        if not method_dir.is_dir() or method_dir.name.startswith("_"):
            continue
        meta = _load_json(method_dir / "metadata.json")
        mid = meta.get("id", method_dir.name)
        protected = is_protected_method(domain, node_id, mid)
        deletable, delete_reason = can_delete_method(domain, node_id, mid, meta)
        entries.append(
            {
                "id": mid,
                "title": meta.get("title", mid),
                "status": meta.get("status", ""),
                "protected": protected,
                "deletable": deletable,
                "delete_blocked_reason": delete_reason if not deletable else "",
                "available": meta.get("available", False),
                "backend": meta.get("backend", ""),
                "reason": meta.get("reason", ""),
                "category": meta.get("category", ""),
            }
        )
    return entries


def list_domain_nodes_detail(domain: str) -> list[dict[str, Any]]:
    domain_dir = get_knowledge_root() / domain
    if not domain_dir.exists():
        return []

    nodes: list[dict[str, Any]] = []
    for item in sorted(domain_dir.iterdir()):
        if not item.is_dir() or item.name in {"combined"}:
            continue
        meta_path = item / "metadata.json"
        if not meta_path.exists():
            continue

        meta = _load_json(meta_path)
        node_id = meta.get("id", item.name)
        protected = is_protected_node(domain, node_id)
        deletable, delete_reason = can_delete_node(domain, node_id, meta)

        nodes.append(
            {
                "id": node_id,
                "title": meta.get("title", item.name),
                "description": meta.get("description", ""),
                "status": meta.get("status", "draft"),
                "type": meta.get("type", "leaf"),
                "protected": protected,
                "deletable": deletable,
                "delete_blocked_reason": delete_reason if not deletable else "",
                "methods": _list_method_entries(domain, node_id),
            }
        )
    return nodes


def unregister_node_from_domain(domain: str, node_id: str) -> None:
    meta_path = get_knowledge_root() / domain / "metadata.json"
    if not meta_path.exists():
        return

    with open(meta_path, encoding="utf-8") as f:
        domain_meta = json.load(f)

    nodes = domain_meta.get("nodes", [])
    domain_meta["nodes"] = [n for n in nodes if n.get("id") != node_id]

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(domain_meta, f, ensure_ascii=False, indent=2)
        f.write("\n")


def move_to_trash(source: Path, record: dict[str, Any]) -> Path:
    trash_root = get_trash_dir()
    trash_root.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    delete_type = record["delete_type"]
    domain = record["domain"]
    node_id = record["node_id"]
    method_id = record.get("method_id", "")

    if delete_type == "node":
        folder_name = f"{timestamp}_node_{domain}_{node_id}"
    else:
        folder_name = f"{timestamp}_method_{domain}_{node_id}_{method_id}"

    dest = _ensure_under_trash(trash_root / folder_name)
    if dest.exists():
        raise FileExistsError(f"回收站目标已存在: {dest}")

    shutil.move(str(source), str(dest))

    record["deleted_at"] = datetime.now().isoformat(timespec="seconds")
    record["trash_path"] = str(dest)
    record["original_path"] = str(source)

    record_path = dest / "delete_record.json"
    with open(record_path, "w", encoding="utf-8") as f:
        json.dump(record, f, ensure_ascii=False, indent=2)

    return dest


def safe_delete_node(
    domain: str,
    node_id: str,
    *,
    confirm: bool = False,
    reason: str = "",
) -> dict[str, Any]:
    if not confirm:
        raise ValueError("必须设置 confirm=true 才能删除")

    node_path = get_safe_node_path(domain, node_id)
    if not node_path.exists():
        raise FileNotFoundError(f"节点不存在: {domain}/{node_id}")

    meta = _load_json(node_path / "metadata.json")
    deletable, message = can_delete_node(domain, node_id, meta)
    if not deletable:
        return {"success": False, "message": message}

    record = {
        "delete_type": "node",
        "domain": domain,
        "node_id": node_id,
        "method_id": "",
        "reason": reason,
    }
    trash_path = move_to_trash(node_path, record)
    unregister_node_from_domain(domain, node_id)

    return {
        "success": True,
        "message": "节点已移动到回收站",
        "trash_path": str(trash_path),
        "domain": domain,
        "node_id": node_id,
    }


def safe_delete_method(
    domain: str,
    node_id: str,
    method_id: str,
    *,
    confirm: bool = False,
    reason: str = "",
) -> dict[str, Any]:
    if not confirm:
        raise ValueError("必须设置 confirm=true 才能删除")

    method_path = get_safe_method_path(domain, node_id, method_id)
    if not method_path.exists():
        raise FileNotFoundError(f"方法不存在: {domain}/{node_id}/methods/{method_id}")

    meta = _load_json(method_path / "metadata.json")
    deletable, message = can_delete_method(domain, node_id, method_id, meta)
    if not deletable:
        return {"success": False, "message": message}

    record = {
        "delete_type": "method",
        "domain": domain,
        "node_id": node_id,
        "method_id": method_id,
        "reason": reason,
    }
    trash_path = move_to_trash(method_path, record)

    return {
        "success": True,
        "message": "方法已移动到回收站",
        "trash_path": str(trash_path),
        "domain": domain,
        "node_id": node_id,
        "method_id": method_id,
    }
