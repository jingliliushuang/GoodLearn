from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.comparator import compare_methods

router = APIRouter(prefix="/api", tags=["compare"])


@router.post("/compare-methods")
async def compare_methods_api(
    image: UploadFile = File(...),
    domain: str = Form("cv"),
    node: str = Form(...),
    methods: str = Form(...),
):
    import json

    import cv2
    import numpy as np

    try:
        method_list = json.loads(methods)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid methods JSON: {exc}") from exc

    if not isinstance(method_list, list) or len(method_list) == 0:
        raise HTTPException(status_code=400, detail="methods must be a non-empty JSON array")

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        result = compare_methods(img, domain, node, method_list)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return result
