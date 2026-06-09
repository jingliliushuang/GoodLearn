"""Experiment workspace — combine preprocess/process/judge blocks across nodes."""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from core.create_manager import safe_node_path, read_json, write_json
from core.model_checker import check_method
from core.module_compat import (
    get_node_dir_from_path,
    run_judge,
    run_preprocess,
    run_process,
    split_node_path,
)
from core.params import merge_process_kwargs, validate_method_params
from core.standard_experiment import ensure_uint8, read_image_bgr, save_image
from core.tree import get_method_dir
from core.utils import get_external_model_root, get_project_root


def _knowledge_asset_url(node_path: str, rel_path: str) -> str:
    return f"/knowledge-assets/{node_path}/{rel_path.replace(chr(92), '/')}"


def _write_report(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_workspace_experiment(
    *,
    workspace_path: str,
    blocks: list[dict[str, Any]],
    image_path: Path,
) -> dict[str, Any]:
    if not blocks:
        raise ValueError("流水线不能为空")

    workspace_dir = safe_node_path(get_project_root(), workspace_path)
    if not workspace_dir.exists():
        raise FileNotFoundError(f"工作台不存在: {workspace_path}")

    input_data = read_image_bgr(image_path)
    reference_data = input_data.copy()
    current_data = input_data
    step_outputs: list[dict[str, Any]] = []
    metric_results: dict[str, Any] = {}
    involved_nodes: set[str] = set()

    t0_total = time.perf_counter()

    for idx, block in enumerate(blocks, start=1):
        source_node = block.get("source_node", "")
        module_type = block.get("module_type", "")
        module_id = block.get("module_id", "")
        params = block.get("params") or {}
        involved_nodes.add(source_node)

        node_dir = get_node_dir_from_path(source_node)
        step_prefix = f"step_{idx:02d}_{module_type}_{source_node.replace('/', '_')}_{module_id}"

        if module_type == "preprocess":
            result = run_preprocess(node_dir, module_id, current_data, params)
            if result.get("clean") is not None:
                reference_data = result["clean"]
            current_data = result.get("degraded") or result.get("output") or current_data
            vis = result.get("visualization", current_data)
            step_outputs.append({"block": block, "type": module_type, "output": vis})

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
            t0 = time.perf_counter()
            current_data, meta = run_process(node_dir, module_id, current_data, process_kwargs)
            step_outputs.append({
                "block": block,
                "type": module_type,
                "output": current_data,
                "runtime_ms": round((time.perf_counter() - t0) * 1000, 2),
                "metadata": meta,
            })

        elif module_type == "judge":
            partial = run_judge(node_dir, module_id, reference_data, current_data, params)
            if isinstance(partial, dict):
                metric_results.update(partial)
            step_outputs.append({"block": block, "type": module_type, "metrics": partial})

        else:
            raise ValueError(f"未知 module_type: {module_type}")

    runtime_ms = round((time.perf_counter() - t0_total) * 1000, 2)
    metric_results["runtime_ms"] = runtime_ms

    now = datetime.now()
    run_id = now.strftime("%Y%m%d_%H%M%S") + f"_{uuid.uuid4().hex[:6]}"
    test_dir = workspace_dir / "test" / run_id
    test_dir.mkdir(parents=True, exist_ok=True)

    save_image(test_dir / "input.png", ensure_uint8(input_data))
    saved_steps: list[dict[str, Any]] = []

    for idx, step in enumerate(step_outputs, start=1):
        block = step["block"]
        module_type = block.get("module_type", "")
        module_id = block.get("module_id", "")
        source_node = block.get("source_node", "")
        fname = f"step_{idx:02d}_{module_type}_{source_node.replace('/', '_')}_{module_id}.png"
        if step.get("output") is not None and module_type != "judge":
            img = ensure_uint8(step["output"])
            if len(img.shape) == 2:
                img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
            save_image(test_dir / fname, img)
            saved_steps.append({"file": fname, **block})

    result_json = {
        "run_id": run_id,
        "type": "workspace_experiment",
        "timestamp": now.isoformat(timespec="seconds"),
        "workspace_path": workspace_path,
        "involved_nodes": sorted(involved_nodes),
        "blocks": blocks,
        "metrics": metric_results,
        "steps": saved_steps,
    }
    write_json(test_dir / "result.json", result_json)

    report_lines = [
        f"实验平台节点：{workspace_path}",
        "参与专业节点：",
    ]
    for n in sorted(involved_nodes):
        report_lines.append(f"- {n}")
    report_lines.append("")
    report_lines.append("流水线：")
    for idx, block in enumerate(blocks, start=1):
        report_lines.append(
            f"{idx}. {block.get('source_node')} / {block.get('module_type')} / {block.get('module_id')}"
        )
    report_lines.append("")
    report_lines.append("评价结果：")
    for key, val in metric_results.items():
        report_lines.append(f"{key}: {val}")
    _write_report(test_dir / "report.txt", report_lines)

    return {
        "run_id": run_id,
        "test_dir": str(test_dir),
        "report_text": "\n".join(report_lines),
        "metrics": metric_results,
        "input_url": _knowledge_asset_url(workspace_path, f"test/{run_id}/input.png"),
        "step_urls": [
            _knowledge_asset_url(workspace_path, f"test/{run_id}/{s['file']}")
            for s in saved_steps
        ],
        "result": result_json,
    }
