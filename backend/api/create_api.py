"""Create module API — professional nodes and method uploads."""

from __future__ import annotations

import json
import tempfile
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel

from core.create_manager import (
    PARENT_PATH_PRESETS,
    add_method_to_node,
    create_professional_node,
    export_professional_node,
    import_professional_node,
    list_professional_nodes,
)
from core.utils import get_project_root
from core.zip_import import assert_zip_size, create_import_temp_dir

router = APIRouter(prefix="/api/create", tags=["create"])


def project_root() -> Path:
    return get_project_root()


async def save_upload_to_temp(upload: Optional[UploadFile]) -> Optional[Path]:
    if upload is None or not upload.filename:
        return None

    suffix = Path(upload.filename).suffix
    temp_dir = project_root() / "backend" / "runtime" / "temp" / "create_uploads"
    temp_dir.mkdir(parents=True, exist_ok=True)

    temp_path = temp_dir / f"{uuid.uuid4().hex}{suffix}"
    content = await upload.read()
    temp_path.write_bytes(content)
    return temp_path


def parse_json_field(value: str, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"JSON 解析失败: {exc}") from exc


class CreateProfessionalNodeRequest(BaseModel):
    domain: str = "cv"
    parent_path: str = "cv"
    node_id: str
    title: str
    description: str = ""
    node_type: str = "leaf"
    input_type: str = "single_image"
    mode: str = "standard_experiment"


class ExportProfessionalNodeRequest(BaseModel):
    node_path: str
    include_papers: bool = True
    include_weights: bool = False


@router.get("/professional-nodes")
def get_professional_nodes(domain: str = Query("cv")):
    return {"domain": domain, "nodes": list_professional_nodes(domain)}


@router.get("/parent-path-presets")
def get_parent_path_presets():
    return {"presets": PARENT_PATH_PRESETS}


@router.post("/create-professional-node")
def create_professional_node_api(body: CreateProfessionalNodeRequest):
    try:
        return create_professional_node(
            project_root=project_root(),
            domain=body.domain,
            parent_path=body.parent_path,
            node_id=body.node_id,
            title=body.title,
            description=body.description,
            node_type=body.node_type,
            input_type=body.input_type,
            mode=body.mode,
        )
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except (ValueError, FileNotFoundError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/export-professional-node")
def export_professional_node_api(body: ExportProfessionalNodeRequest):
    try:
        return export_professional_node(
            body.node_path,
            include_papers=body.include_papers,
            include_weights=body.include_weights,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/import-professional-node")
async def import_professional_node_api(
    file: UploadFile = File(...),
    overwrite: bool = Form(False),
):
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
        return import_professional_node(tmp_path, overwrite=overwrite)
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        tmp_path.unlink(missing_ok=True)


@router.post("/add-method")
async def add_method_api(
    node_path: str = Form(...),
    method_id: str = Form(...),
    method_title: str = Form(...),
    description: str = Form(""),
    category: str = Form("other"),
    backend: str = Form("planned"),
    available: str = Form("false"),
    input_spec: str = Form("{}"),
    output_spec: str = Form("{}"),
    paper_meta: str = Form("{}"),
    paper_pdf: Optional[UploadFile] = File(None),
    model_py: Optional[UploadFile] = File(None),
    model_file: Optional[UploadFile] = File(None),
):
    paper_pdf_path = None
    model_py_path = None
    model_file_path = None

    try:
        paper_pdf_path = await save_upload_to_temp(paper_pdf)
        model_py_path = await save_upload_to_temp(model_py)
        model_file_path = await save_upload_to_temp(model_file)

        result = add_method_to_node(
            project_root=project_root(),
            node_path=node_path.strip(),
            method_id=method_id.strip(),
            method_title=method_title.strip(),
            description=description,
            category=category,
            backend=backend,
            available=available.lower() in ("true", "1", "yes"),
            input_spec=parse_json_field(input_spec, {}),
            output_spec=parse_json_field(output_spec, {}),
            paper_meta=parse_json_field(paper_meta, {}),
            paper_pdf_path=paper_pdf_path,
            model_py_path=model_py_path,
            model_file_path=model_file_path,
        )
        return result
    except FileExistsError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    finally:
        for temp in (paper_pdf_path, model_py_path, model_file_path):
            if temp and temp.exists():
                temp.unlink(missing_ok=True)
