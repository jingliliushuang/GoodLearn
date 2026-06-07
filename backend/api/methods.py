from fastapi import APIRouter, HTTPException

from core.model_checker import check_node_methods
from core.model_registry import check_external_models, list_external_models

router = APIRouter(prefix="/api/methods", tags=["methods"])


@router.get("/external/status")
def external_model_status():
    return {
        "models": list_external_models(),
        "available": check_external_models(),
    }


@router.get("/{domain_id}/{node_id}")
def list_methods(domain_id: str, node_id: str):
    try:
        methods = check_node_methods(domain_id, node_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Node not found")
    return methods
