from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile

from core.experiments import list_experiments
from core.standard_experiment import run_standard_experiment
from core.utils import get_external_model_root, get_project_root

router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.get("")
def get_experiments(
    domain: str | None = Query(None),
    node: str | None = Query(None),
    method: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    return list_experiments(domain=domain, node=node, method=method, limit=limit)


def _parse_json_field(value: str | None, default):
    if value is None or value == "":
        return default
    import json

    try:
        return json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"JSON 参数解析失败: {exc}") from exc


@router.post("/run-standard")
async def run_standard_experiment_api(
    image: UploadFile = File(...),
    domain: str = Form(...),
    node: str = Form(...),
    degradation: str = Form(...),
    method: str = Form(...),
    degradation_params: str | None = Form(None),
    method_params: str | None = Form(None),
    metrics: str | None = Form(None),
):
    from pathlib import Path

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="只支持图片文件")

    suffix = Path(image.filename or "input.png").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".bmp", ".webp"}:
        raise HTTPException(status_code=400, detail="只支持图片文件")

    upload_dir = Path(__file__).resolve().parents[1] / "runtime" / "uploads" / "standard_experiments"
    upload_dir.mkdir(parents=True, exist_ok=True)

    content = await image.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="空文件")

    input_path = upload_dir / f"input_{Path(image.filename or 'image.png').stem}{suffix}"
    input_path.write_bytes(content)

    try:
        result = run_standard_experiment(
            domain=domain,
            node=node,
            method=method,
            image_path=input_path,
            degradation=degradation,
            degradation_params=_parse_json_field(degradation_params, {}),
            method_params=_parse_json_field(method_params, {}),
            metrics=_parse_json_field(metrics, ["mse", "psnr", "ssim"]),
            external_model_root=get_external_model_root(),
            project_root=get_project_root(),
        )
        return {"success": True, **result}
    except HTTPException:
        raise
    except (ValueError, FileNotFoundError, AttributeError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
