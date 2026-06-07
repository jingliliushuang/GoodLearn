import json

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.feature_matching_runner import run_feature_matching

router = APIRouter(prefix="/api/feature-matching", tags=["feature-matching"])


@router.post("/run")
async def run_matching(
    domain: str = Form(...),
    node: str = Form(...),
    method: str = Form(...),
    image_a: UploadFile = File(...),
    image_b: UploadFile = File(...),
    params: str = Form("{}"),
):
    if not image_a.content_type or not image_a.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image_a must be an image")
    if not image_b.content_type or not image_b.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="image_b must be an image")

    try:
        user_params = json.loads(params) if params else {}
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid params JSON")

    try:
        image_a_bytes = await image_a.read()
        image_b_bytes = await image_b.read()
        return run_feature_matching(domain, node, method, image_a_bytes, image_b_bytes, user_params)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Method not found")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Feature matching failed: {exc}")
