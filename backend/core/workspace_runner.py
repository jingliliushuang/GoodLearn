"""Experiment workspace — combine preprocess/process/judge blocks across nodes."""

from __future__ import annotations

import json
import shutil
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from core.create_manager import read_json, safe_node_path, write_json
from core.model_checker import check_method
from core.module_compat import (
    get_node_dir_from_path,
    list_node_modules,
    run_judge,
    run_preprocess,
    run_process,
    split_node_path,
)
from core.params import merge_process_kwargs, validate_method_params
from core.standard_experiment import ensure_uint8, read_image_bgr, save_image
from core.tree import get_method_dir
from core.utils import get_external_model_root, get_project_root


class WorkspacePipelineError(ValueError):
    """Raised when workspace block list fails validation."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def validate_workspace_pipeline(blocks: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []

    if not blocks:
        errors.append("流水线不能为空")
        return errors

    for idx, block in enumerate(blocks, start=1):
        if not block.get("source_node"):
            errors.append(f"Step {idx} 缺少 source_node")
        if not block.get("module_id"):
            errors.append(f"Step {idx} 缺少 module_id")
        if block.get("module_type") not in ("preprocess", "process", "judge"):
            errors.append(f"Step {idx} module_type 无效")

    module_types = [b.get("module_type") for b in blocks]
    has_transform = any(t in ("preprocess", "process") for t in module_types)
    has_judge = any(t == "judge" for t in module_types)

    if all(t == "judge" for t in module_types):
        errors.append("流水线不能只包含评价模块")
    if not has_transform:
        errors.append("请至少添加一个 preprocess 或 process 模块，再添加 judge 模块")
    if not has_judge:
        errors.append("请至少添加一个 judge 评价模块")
    if module_types and module_types[0] == "judge":
        errors.append("judge 模块不能作为第一步")

    return errors


def _module_title(source_node: str, module_type: str, module_id: str) -> str:
    try:
        modules = list_node_modules(source_node)
        for item in modules.get(module_type, []):
            if item.get("id") == module_id:
                return item.get("title") or module_id
    except Exception:
        pass
    return module_id


def _runtime_url(run_id: str, filename: str) -> str:
    return f"/runtime/workspace/{run_id}/{filename}"


def _save_image_file(path: Path, image: np.ndarray) -> None:
    img = ensure_uint8(image)
    if len(img.shape) == 2:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    save_image(path, img)


def _write_report(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _archive_runtime_run(runtime_dir: Path, archive_dir: Path) -> None:
    archive_dir.parent.mkdir(parents=True, exist_ok=True)
    if archive_dir.exists():
        shutil.rmtree(archive_dir)
    shutil.copytree(runtime_dir, archive_dir)


def run_workspace_experiment(
    *,
    workspace_path: str,
    blocks: list[dict[str, Any]],
    image_path: Path,
) -> dict[str, Any]:
    validation_errors = validate_workspace_pipeline(blocks)
    if validation_errors:
        raise WorkspacePipelineError(validation_errors)

    workspace_dir = safe_node_path(get_project_root(), workspace_path)
    if not workspace_dir.exists():
        raise FileNotFoundError(f"工作台不存在: {workspace_path}")

    backend_root = Path(__file__).resolve().parents[1]
    now = datetime.now()
    run_id = now.strftime("%Y%m%d_%H%M%S") + f"_{uuid.uuid4().hex[:6]}"
    runtime_dir = backend_root / "runtime" / "workspace" / run_id
    archive_dir = workspace_dir / "test" / run_id
    runtime_dir.mkdir(parents=True, exist_ok=True)

    input_data = read_image_bgr(image_path)
    reference_data = input_data.copy()
    current_data = input_data
    pipeline_produced_output = False
    involved_nodes: set[str] = set()
    structured_steps: list[dict[str, Any]] = []
    metric_results: dict[str, Any] = {}

    _save_image_file(runtime_dir / "input.png", input_data)

    t0_total = time.perf_counter()

    for idx, block in enumerate(blocks, start=1):
        source_node = block.get("source_node", "")
        module_type = block.get("module_type", "")
        module_id = block.get("module_id", "")
        params = block.get("params") or {}
        involved_nodes.add(source_node)

        node_dir = get_node_dir_from_path(source_node)
        title = _module_title(source_node, module_type, module_id)
        fname = f"step_{idx:02d}_{module_type}_{source_node.replace('/', '_')}_{module_id}.png"

        step_record: dict[str, Any] = {
            "index": idx,
            "source_node": source_node,
            "module_type": module_type,
            "module_id": module_id,
            "title": title,
            "params": params,
            "status": "success",
        }

        t0_step = time.perf_counter()

        if module_type == "preprocess":
            result = run_preprocess(node_dir, module_id, current_data, params)
            if result.get("clean") is not None:
                reference_data = result["clean"]
            next_data = result.get("degraded")
            if next_data is None:
                next_data = result.get("output")
            if next_data is None:
                next_data = current_data
            vis = result.get("visualization")
            if vis is None:
                vis = next_data
            current_data = next_data
            pipeline_produced_output = True
            _save_image_file(runtime_dir / fname, vis)
            step_record["output_url"] = _runtime_url(run_id, fname)
            step_record["output_file"] = fname

        elif module_type == "process":
            domain, node_id = split_node_path(source_node)
            status = check_method(domain, node_id, module_id)
            if not status.get("available"):
                raise RuntimeError(f"模块不可运行: {source_node}/process/{module_id}")
            process_kwargs: dict[str, Any] = {
                "method_dir": str(get_method_dir(domain, node_id, module_id)),
                "external_model_root": str(get_external_model_root()),
            }
            if status.get("detected_weights"):
                process_kwargs["weight_path"] = status["detected_weights"][0]
            validated = validate_method_params(domain, node_id, module_id, params)
            process_kwargs = merge_process_kwargs(process_kwargs, validated)
            current_data, meta = run_process(node_dir, module_id, current_data, process_kwargs)
            if current_data is None:
                raise RuntimeError(f"process 模块未返回输出: {module_id}")
            pipeline_produced_output = True
            _save_image_file(runtime_dir / fname, current_data)
            step_record["output_url"] = _runtime_url(run_id, fname)
            step_record["output_file"] = fname
            step_record["metadata"] = meta
            step_record["params"] = validated

        elif module_type == "judge":
            if not pipeline_produced_output:
                raise WorkspacePipelineError(
                    ["当前流水线没有产生预测结果，不能进行评价。"]
                )
            partial = run_judge(node_dir, module_id, reference_data, current_data, params)
            if isinstance(partial, dict):
                metric_results.update(partial)
                step_record["metrics"] = partial
            else:
                step_record["metrics"] = {}

        else:
            raise ValueError(f"未知 module_type: {module_type}")

        step_record["runtime_ms"] = round((time.perf_counter() - t0_step) * 1000, 2)
        structured_steps.append(step_record)

    runtime_ms = round((time.perf_counter() - t0_total) * 1000, 2)
    metric_results["runtime_ms"] = runtime_ms

    result_json = {
        "success": True,
        "run_id": run_id,
        "type": "workspace_experiment",
        "timestamp": now.isoformat(timespec="seconds"),
        "workspace_node": workspace_path,
        "participants": sorted(involved_nodes),
        "blocks": blocks,
        "steps": structured_steps,
        "metrics": metric_results,
        "input_url": _runtime_url(run_id, "input.png"),
        "result_json_url": _runtime_url(run_id, "result.json"),
        "report_txt_url": _runtime_url(run_id, "report.txt"),
    }
    write_json(runtime_dir / "result.json", result_json)

    report_lines = [
        f"实验平台节点：{workspace_path}",
        "",
        "参与专业节点：",
    ]
    for n in sorted(involved_nodes):
        report_lines.append(f"- {n}")
    report_lines.append("")
    report_lines.append("流水线：")
    for step in structured_steps:
        line = (
            f"{step['index']}. {step['source_node']} / {step['module_type']} / {step['module_id']}"
        )
        report_lines.append(line)
        if step.get("params"):
            report_lines.append(f"   参数：{json.dumps(step['params'], ensure_ascii=False)}")
        if step.get("output_file"):
            report_lines.append(f"   输出：{step['output_file']}")
        if step.get("metrics"):
            for mk, mv in step["metrics"].items():
                report_lines.append(f"   结果：{mk} = {mv}")
        report_lines.append("")
    report_lines.append("评价结果：")
    for key, val in metric_results.items():
        report_lines.append(f"{key}: {val}")

    report_text = "\n".join(report_lines)
    _write_report(runtime_dir / "report.txt", report_lines)

    try:
        _archive_runtime_run(runtime_dir, archive_dir)
    except OSError:
        pass

    return {
        "success": True,
        "run_id": run_id,
        "workspace_node": workspace_path,
        "participants": sorted(involved_nodes),
        "input_url": _runtime_url(run_id, "input.png"),
        "steps": structured_steps,
        "metrics": metric_results,
        "result_json_url": _runtime_url(run_id, "result.json"),
        "report_txt_url": _runtime_url(run_id, "report.txt"),
        "report_text": report_text,
        "result": result_json,
    }
