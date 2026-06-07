from fastapi import APIRouter, HTTPException

from core.tree import load_domains

router = APIRouter(prefix="/api/domains", tags=["domains"])


@router.get("")
def list_domains():
    return load_domains()


@router.get("/{domain_id}")
def get_domain(domain_id: str):
    domains = load_domains()
    domain = next((d for d in domains if d["id"] == domain_id), None)
    if domain is None:
        raise HTTPException(status_code=404, detail="Domain not found")

    if domain.get("status") != "ready":
        return {
            "id": domain_id,
            "title": domain["title"],
            "description": domain.get("description", ""),
            "status": domain.get("status", "planned"),
            "nodes": [],
        }

    from core.tree import load_domain_metadata

    meta = load_domain_metadata(domain_id)
    return {
        "id": domain_id,
        "title": meta.get("title", domain["title"]),
        "description": meta.get("description", domain.get("description", "")),
        "status": "ready",
        "nodes": meta.get("nodes", []),
    }
