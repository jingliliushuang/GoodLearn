"""Knowledge tree navigation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from core.utils import get_knowledge_root


def load_domains() -> list[dict[str, Any]]:
    path = get_knowledge_root() / "domains.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_domain_metadata(domain_id: str) -> dict[str, Any]:
    path = get_knowledge_root() / domain_id / "metadata.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_node_dir(domain_id: str, node_id: str) -> Path:
    return get_knowledge_root() / domain_id / node_id


def load_node_metadata(domain_id: str, node_id: str) -> dict[str, Any]:
    path = get_node_dir(domain_id, node_id) / "metadata.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_node_content(domain_id: str, node_id: str) -> str:
    path = get_node_dir(domain_id, node_id) / "content.md"
    return path.read_text(encoding="utf-8")


def load_node_papers(domain_id: str, node_id: str) -> list[dict[str, Any]]:
    path = get_node_dir(domain_id, node_id) / "papers.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_node_references(domain_id: str, node_id: str) -> list[dict[str, Any]]:
    path = get_node_dir(domain_id, node_id) / "references.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def list_node_methods(domain_id: str, node_id: str) -> list[dict[str, Any]]:
    methods_dir = get_node_dir(domain_id, node_id) / "methods"
    if not methods_dir.exists():
        return []

    methods: list[dict[str, Any]] = []
    for method_dir in sorted(methods_dir.iterdir()):
        if not method_dir.is_dir():
            continue
        meta_path = method_dir / "metadata.json"
        if not meta_path.exists():
            continue
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
        methods.append(
            {
                "id": meta.get("id", method_dir.name),
                "title": meta.get("title", method_dir.name),
                "available": meta.get("available", False),
                "description": meta.get("description", ""),
            }
        )
    return methods


def get_method_dir(domain_id: str, node_id: str, method_id: str) -> Path:
    return get_node_dir(domain_id, node_id) / "methods" / method_id


def load_learning_path(domain_id: str, node_id: str) -> list[dict[str, Any]]:
    path = get_node_dir(domain_id, node_id) / "learning_path.json"
    if not path.exists():
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_method_detail(domain_id: str, node_id: str, method_id: str) -> dict[str, Any] | None:
    path = get_method_dir(domain_id, node_id, method_id) / "detail.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_all_method_details(domain_id: str, node_id: str) -> dict[str, dict[str, Any]]:
    methods_dir = get_node_dir(domain_id, node_id) / "methods"
    if not methods_dir.exists():
        return {}

    details: dict[str, dict[str, Any]] = {}
    for method_dir in sorted(methods_dir.iterdir()):
        if not method_dir.is_dir():
            continue
        detail_path = method_dir / "detail.json"
        if detail_path.exists():
            with open(detail_path, encoding="utf-8") as f:
                details[method_dir.name] = json.load(f)
    return details
