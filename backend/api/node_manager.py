from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from core.node_generator import create_node_template, list_domain_nodes
from core.packer import export_node, import_node, validate_node
from core.tree import get_node_dir

router = APIRouter(prefix="/api/node-manager", tags=["node-manager"])


class CreateTemplateRequest(BaseModel):
    domain: str = "cv"
    node_id: str
    title: str
    description: str = ""
    node_type: str = "leaf"


class ExportNodeRequest(BaseModel):
    domain: str
    node_id: str
    include_weights: bool = False


@router.get("/nodes")
def get_nodes(domain: str = Query("cv")):
    return {"domain": domain, "nodes": list_domain_nodes(domain)}


@router.post("/create-template")
def create_template(body: CreateTemplateRequest):
    try:
        result = create_node_template(
            domain=body.domain,
            node_id=body.node_id,
            title=body.title,
            description=body.description,
            node_type=body.node_type,
        )
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return result


@router.post("/validate")
def validate_node_api(domain: str = Query(...), node_id: str = Query(...)):
    node_dir = get_node_dir(domain, node_id)
    if not node_dir.exists():
        raise HTTPException(status_code=404, detail="Node not found")
    return validate_node(node_dir)


@router.post("/export")
def export_node_api(body: ExportNodeRequest):
    try:
        return export_node(body.domain, body.node_id, body.include_weights)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/import")
async def import_node_api(
    file: UploadFile = File(...),
    target_domain: str = Form("cv"),
    overwrite: bool = Form(False),
):
    import tempfile
    from pathlib import Path

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="请上传 .zip 文件")

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="空文件")

    with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as tmp:
        tmp.write(data)
        tmp_path = Path(tmp.name)

    try:
        result = import_node(tmp_path, target_domain, overwrite=overwrite)
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    return result
