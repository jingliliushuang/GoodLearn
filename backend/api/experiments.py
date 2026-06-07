from fastapi import APIRouter, Query

from core.experiments import list_experiments

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.get("")
def get_experiments(
    domain: str | None = Query(None),
    node: str | None = Query(None),
    method: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    return list_experiments(domain=domain, node=node, method=method, limit=limit)
