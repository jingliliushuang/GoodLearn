from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.model_checker import check_method
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
        raise HTTPException(status_code=404, detail=f"Method '{method}' not found")

    status = check_method(domain, node, method)
    if not status["available"]:
        reason = status.get("reason") or "Method is not available"
        raise HTTPException(
            status_code=400,
            detail=f"Method '{method}' is not available: {reason}",
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
