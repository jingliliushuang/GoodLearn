from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from core.delete_manager import list_domain_nodes_detail, safe_delete_method, safe_delete_node
from core.node_generator import create_method_template, create_node_template
from core.packer import export_node, import_node, import_node_template, validate_node
from core.method_packer import import_method_template
from core.tree import get_node_dir
from core.zip_import import assert_zip_size, create_import_temp_dir

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


class CreateMethodTemplateRequest(BaseModel):
    domain: str = "cv"
    node_id: str
    method_id: str
    method_title: str
    description: str = ""
    category: str = "traditional"
    backend: str = "custom"
    available: bool = False
    input_kind: str = "single_image"
    input_count: int = 1
    input_media_type: str = "image"
    output_kind: str = "single_image"
    output_count: int = 1
    output_media_type: str = "image"


class DeleteNodeRequest(BaseModel):
    domain: str
    node_id: str
    confirm: bool = False
    reason: str = ""


class DeleteMethodRequest(BaseModel):
    domain: str
    node_id: str
    method_id: str
    confirm: bool = False
    reason: str = ""


@router.get("/nodes")
def get_nodes(domain: str = Query("cv")):
    return {"domain": domain, "nodes": list_domain_nodes_detail(domain)}


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


@router.post("/create-method-template")
def create_method_template_api(body: CreateMethodTemplateRequest):
    try:
        return create_method_template(
            domain=body.domain,
            node_id=body.node_id,
            method_id=body.method_id,
            method_title=body.method_title,
            description=body.description,
            category=body.category,
            backend=body.backend,
            available=body.available,
            input_kind=body.input_kind,
            input_count=body.input_count,
            input_media_type=body.input_media_type,
            output_kind=body.output_kind,
            output_count=body.output_count,
            output_media_type=body.output_media_type,
        )
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.delete("/node")
def delete_node_api(body: DeleteNodeRequest):
    try:
        result = safe_delete_node(
            body.domain,
            body.node_id,
            confirm=body.confirm,
            reason=body.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not result.get("success"):
        raise HTTPException(status_code=403, detail=result.get("message", "删除被拒绝"))
    return result


@router.delete("/method")
def delete_method_api(body: DeleteMethodRequest):
    try:
        result = safe_delete_method(
            body.domain,
            body.node_id,
            body.method_id,
            confirm=body.confirm,
            reason=body.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    if not result.get("success"):
        raise HTTPException(status_code=403, detail=result.get("message", "删除被拒绝"))
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


@router.post("/import-node-template")
async def import_node_template_api(
    file: UploadFile = File(...),
    target_domain: str = Form("cv"),
    overwrite: bool = Form(False),
):
    from pathlib import Path

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="请上传 .zip 文件")

    data = await file.read()
    try:
        assert_zip_size(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    imports_dir = create_import_temp_dir()
    tmp_path = imports_dir / (file.filename or "upload.zip")
    tmp_path.write_bytes(data)

    try:
        result = import_node_template(tmp_path, target_domain, overwrite=overwrite)
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    return result


@router.post("/import-method-template")
async def import_method_template_api(
    file: UploadFile = File(...),
    target_domain: str = Form("cv"),
    target_node_id: str = Form(...),
    overwrite: bool = Form(False),
):
    from pathlib import Path

    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="请上传 .zip 文件")

    if not target_node_id.strip():
        raise HTTPException(status_code=400, detail="target_node_id 不能为空")

    data = await file.read()
    try:
        assert_zip_size(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    imports_dir = create_import_temp_dir()
    tmp_path = imports_dir / (file.filename or "upload.zip")
    tmp_path.write_bytes(data)

    try:
        result = import_method_template(
            tmp_path,
            target_domain,
            target_node_id.strip(),
            overwrite=overwrite,
        )
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)

    return result


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
    try:
        assert_zip_size(data)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

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
