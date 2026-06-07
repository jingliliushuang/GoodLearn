from fastapi import APIRouter, HTTPException

from core.loader import get_method_readme, load_method_metadata
from core.model_checker import check_method, check_node_methods
from core.tree import (
    get_method_dir,
    load_node_content,
    load_node_metadata,
    load_node_papers,
    load_node_references,
)

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.get("/{domain_id}/{node_id}")
def get_node(domain_id: str, node_id: str):
    try:
        meta = load_node_metadata(domain_id, node_id)
        content = load_node_content(domain_id, node_id)
        papers = load_node_papers(domain_id, node_id)
        references = load_node_references(domain_id, node_id)
        methods = check_node_methods(domain_id, node_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Node not found")

    return {
        "id": node_id,
        "title": meta.get("title", node_id),
        "description": meta.get("description", ""),
        "domain": meta.get("domain", domain_id),
        "difficulty": meta.get("difficulty", "medium"),
        "tags": meta.get("tags", []),
        "content_markdown": content,
        "papers": papers,
        "references": references,
        "methods": methods,
        "has_demos": meta.get("has_demos", False),
        "demo_type": meta.get("demo_type", ""),
    }


@router.get("/{domain_id}/{node_id}/methods/{method_id}")
def get_method_detail(domain_id: str, node_id: str, method_id: str):
    method_dir = get_method_dir(domain_id, node_id, method_id)
    if not method_dir.exists():
        raise HTTPException(status_code=404, detail="Method not found")

    meta = load_method_metadata(domain_id, node_id, method_id)
    readme = get_method_readme(domain_id, node_id, method_id)
    status = check_method(domain_id, node_id, method_id)

    return {
        **status,
        "description": meta.get("description", status.get("description", "")),
        "readme_markdown": readme,
    }
