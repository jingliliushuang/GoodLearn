"""Run professional node experiments and save results to node/test/{run_id}/."""

from __future__ import annotations

import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from core.create_manager import safe_node_path
from core.experiments import save_experiment
from core.model_checker import check_method
from core.module_compat import (
    get_node_dir_from_path,
    run_judge,
    run_preprocess,
    run_process,
    split_node_path,
)
from core.params import merge_process_kwargs, validate_method_params
from core.standard_experiment import (
    create_comparison_image,
    ensure_uint8,
    read_image_bgr,
    save_image,
)
from core.tree import get_method_dir
from core.utils import get_external_model_root, get_project_root


def _knowledge_asset_url(node_path: str, rel_path: str) -> str:
    return f"/knowledge-assets/{node_path}/{rel_path.replace(chr(92), '/')}"


def _write_report(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run_node_experiment(
    *,
    node_path: str,
    preprocess_id: str,
    process_id: str,
    judge_ids: list[str] | None = None,
    image_path: Path,
    preprocess_params: dict[str, Any] | None = None,
    process_params: dict[str, Any] | None = None,
    judge_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    node_dir = get_node_dir_from_path(node_path)
    domain, node_id = split_node_path(node_path)

    status = check_method(domain, node_id, process_id)
    if not status.get("available"):
        reason = status.get("reason") or "方法不可运行"
        raise RuntimeError(f"处理算法不可运行: {process_id}，{reason}")

    clean_input = read_image_bgr(image_path)
    preprocess_params = preprocess_params or {}
    process_params = process_params or {}
    judge_params = judge_params or {}
    judge_ids = judge_ids or ["mse", "psnr", "ssim"]

    prep_result = run_preprocess(node_dir, preprocess_id, clean_input, preprocess_params)
    clean = prep_result.get("clean", clean_input)
    degraded = prep_result.get("degraded")
    degraded_vis = prep_result.get("visualization", degraded)
    if degraded is None:
        raise RuntimeError("preprocess 未返回 degraded 数据")

    process_kwargs: dict[str, Any] = {
        "method_dir": str(get_method_dir(domain, node_id, process_id)),
        "external_model_root": str(get_external_model_root()),
    }
    if status.get("detected_weights"):
        process_kwargs["weight_path"] = status["detected_weights"][0]
    validated = validate_method_params(domain, node_id, process_id, process_params)
    process_kwargs = merge_process_kwargs(process_kwargs, validated)

    t0 = time.perf_counter()
    recovered, model_meta = run_process(node_dir, process_id, degraded, process_kwargs)
    runtime_ms = (time.perf_counter() - t0) * 1000.0
    if recovered is None:
        raise RuntimeError("process 未返回输出")
    recovered = ensure_uint8(recovered)

    metric_results: dict[str, Any] = {"runtime_ms": round(runtime_ms, 2)}
    for metric_id in judge_ids:
        if metric_id == "runtime_ms":
            continue
        try:
            partial = run_judge(node_dir, metric_id, clean, recovered, judge_params)
            if isinstance(partial, dict):
                metric_results.update(partial)
        except Exception as exc:
            metric_results[f"{metric_id}_error"] = str(exc)

    now = datetime.now()
    run_id = now.strftime("%Y%m%d_%H%M%S") + f"_{uuid.uuid4().hex[:6]}"
    test_dir = node_dir / "test" / run_id
    test_dir.mkdir(parents=True, exist_ok=True)

    save_image(test_dir / "clean.png", ensure_uint8(clean))
    save_image(test_dir / "degraded.png", ensure_uint8(degraded_vis))
    save_image(test_dir / "output.png", recovered)
    create_comparison_image(clean, degraded_vis, recovered, test_dir / "comparison.png")

    rel_prefix = f"test/{run_id}"
    result_json = {
        "run_id": run_id,
        "type": "node_experiment",
        "timestamp": now.isoformat(timespec="seconds"),
        "node_path": node_path,
        "preprocess": {"id": preprocess_id, "params": preprocess_params},
        "process": {"id": process_id, "params": validated, "metadata": model_meta},
        "judge": {"ids": judge_ids, "params": judge_params},
        "metrics": metric_results,
        "input_file": str(image_path),
        "paths": {
            "clean": f"{rel_prefix}/clean.png",
            "degraded": f"{rel_prefix}/degraded.png",
            "output": f"{rel_prefix}/output.png",
            "comparison": f"{rel_prefix}/comparison.png",
        },
    }
    with open(test_dir / "result.json", "w", encoding="utf-8") as f:
        json.dump(result_json, f, ensure_ascii=False, indent=2)
        f.write("\n")

    report_lines = [
        f"实验节点：{node_path}",
        f"测试集生成模块：{preprocess_id}",
        f"处理算法：{process_id}",
        f"评价模块：{', '.join(judge_ids)}",
        f"输入文件：{image_path}",
        f"输出目录：knowledge/{node_path}/test/{run_id}/",
        "指标结果：",
    ]
    for key, val in metric_results.items():
        report_lines.append(f"  {key}: {val}")
    report_lines.append(f"运行时间：{runtime_ms:.2f} ms")
    _write_report(test_dir / "report.txt", report_lines)

    save_experiment(
        {
            **result_json,
            "domain": domain,
            "node": node_id,
            "method": process_id,
            "type": "node_experiment",
        }
    )

    return {
        "run_id": run_id,
        "test_dir": str(test_dir),
        "report_path": str(test_dir / "report.txt"),
        "report_text": "\n".join(report_lines),
        "metrics": metric_results,
        "clean_url": _knowledge_asset_url(node_path, f"test/{run_id}/clean.png"),
        "degraded_url": _knowledge_asset_url(node_path, f"test/{run_id}/degraded.png"),
        "output_url": _knowledge_asset_url(node_path, f"test/{run_id}/output.png"),
        "comparison_url": _knowledge_asset_url(node_path, f"test/{run_id}/comparison.png"),
        "result": result_json,
    }
