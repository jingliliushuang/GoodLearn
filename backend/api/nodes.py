from fastapi import APIRouter, HTTPException

from core.loader import get_method_readme, load_method_metadata
from core.model_checker import check_method, check_node_methods
from core.paper_relation import enrich_method_details
from core.tree import (
    get_method_dir,
    load_all_method_details,
    load_learning_path,
    load_node_content,
    load_node_experiment_config,
    load_node_metadata,
    load_node_papers,
    load_node_references,
    load_node_resources,
)

router = APIRouter(prefix="/api/nodes", tags=["nodes"])


@router.get("/{domain_id}/{node_id}")
def get_node(domain_id: str, node_id: str):
    try:
        meta = load_node_metadata(domain_id, node_id)
        content = load_node_content(domain_id, node_id)
        papers = load_node_papers(domain_id, node_id)
        references = load_node_references(domain_id, node_id)
        resources = load_node_resources(domain_id, node_id)
        experiment_config = load_node_experiment_config(domain_id, node_id)
        methods = check_node_methods(domain_id, node_id)
        learning_path = load_learning_path(domain_id, node_id)
        method_details = load_all_method_details(domain_id, node_id)
        method_details = enrich_method_details(method_details, papers)
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
        "resources": resources,
        "methods": methods,
        "input_type": meta.get("input_type", "single_image"),
        "mode": meta.get("mode", "runnable"),
        "learning_path": learning_path,
        "method_details": method_details,
        "experiment_config": experiment_config,
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
