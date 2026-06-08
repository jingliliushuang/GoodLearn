from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from core.combiner import run_pipeline
from core.io_spec import PipelineTypeError

router = APIRouter(prefix="/api", tags=["pipeline"])


@router.post("/run-pipeline")
async def run_pipeline_api(
    image: UploadFile = File(...),
    pipeline: str = Form(...),
):
    import json

    import cv2
    import numpy as np

    try:
        pipeline_data = json.loads(pipeline)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid pipeline JSON: {exc}") from exc

    steps = pipeline_data.get("steps")
    if not isinstance(steps, list) or len(steps) == 0:
        raise HTTPException(status_code=400, detail="Pipeline steps cannot be empty")

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty image file")

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file")

    context = {
        "domain": pipeline_data.get("domain", "cv"),
        "strategy": pipeline_data.get("strategy", "cascade"),
        "pipeline_input_kind": pipeline_data.get("pipeline_input_kind", "single_image"),
        "pipeline_input_media": pipeline_data.get("pipeline_input_media", "image"),
    }

    try:
        result = run_pipeline(img, steps, context)
    except PipelineTypeError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "message": "Pipeline 类型不兼容",
                "errors": exc.errors,
            },
        ) from exc
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return result
