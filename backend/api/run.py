from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.loader import load_method_metadata
from core.runner import run_model
from core.tree import get_method_dir

router = APIRouter(prefix="/api", tags=["run"])


@router.post("/run")
async def run_inference(
    domain: str = Form(...),
    node: str = Form(...),
    method: str = Form(...),
    image: UploadFile = File(...),
):
    method_dir = get_method_dir(domain, node, method)
    if not method_dir.exists():
        raise HTTPException(status_code=404, detail="Method not found")

    meta = load_method_metadata(domain, node, method)
    if not meta.get("available", False):
        raise HTTPException(
            status_code=400,
            detail=f"Method '{method}' is not available for inference yet",
        )

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    try:
        result = run_model(domain, node, method, image_bytes)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return result
