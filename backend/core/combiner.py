"""Combined node pipeline — cascade execution for Pipeline Builder."""

from __future__ import annotations

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from core.experiments import save_experiment
from core.io_spec import PipelineTypeError, validate_pipeline_steps
from core.loader import load_process_fn
from core.model_checker import check_method
from core.params import merge_process_kwargs, validate_method_params
from core.runner import _create_comparison
from core.tree import get_method_dir
from core.utils import ensure_runtime_dirs, get_external_model_root, get_pipelines_dir


def combine(images: list[np.ndarray], strategy: str = "cascade") -> np.ndarray:
    """Combine multiple intermediate images according to strategy."""
    if strategy != "cascade":
        raise NotImplementedError(f"Strategy {strategy!r} is not implemented yet")
    if not images:
        raise ValueError("No images to combine")
    return images[-1]


def create_combined_node(
    domain_id: str,
    combined_id: str,
    parents: list[str],
    strategy: str = "cascade",
    **options: Any,
) -> str:
    """Create a combined node directory under knowledge/{domain}/combined/{combined_id}."""
    raise NotImplementedError(
        "Combined node folder generation is not implemented yet. "
        f"domain={domain_id}, combined_id={combined_id}, parents={parents}"
    )


def _build_process_kwargs(domain_id: str, node_id: str, method_id: str, params: dict[str, Any]) -> dict[str, Any]:
    method_dir = get_method_dir(domain_id, node_id, method_id)
    status = check_method(domain_id, node_id, method_id)

    process_kwargs: dict[str, Any] = {
        "method_dir": str(method_dir),
        "external_model_root": str(get_external_model_root()),
    }
    if status.get("detected_weights"):
        process_kwargs["weight_path"] = status["detected_weights"][0]

    step_params = params if params else {}
    validated = validate_method_params(domain_id, node_id, method_id, step_params)
    return merge_process_kwargs(process_kwargs, validated)


def run_pipeline(
    image: np.ndarray,
    steps: list[dict[str, Any]],
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run a cascade pipeline on the uploaded image without dataset.degrade().

    Each step calls model.process(current_image) directly.
    """
    if image is None or image.size == 0:
        raise ValueError("Invalid image")

    context = context or {}
    default_domain = context.get("domain", "cv")
    strategy = context.get("strategy", "cascade")

    if strategy != "cascade":
        raise ValueError(f"Unsupported strategy: {strategy}")

    if not steps:
        raise ValueError("Pipeline steps cannot be empty")

    validate_pipeline_steps(
        steps,
        pipeline_input_kind=context.get("pipeline_input_kind", "single_image"),
        pipeline_input_media=context.get("pipeline_input_media", "image"),
        domain=default_domain,
    )

    ensure_runtime_dirs()
    sorted_steps = sorted(steps, key=lambda s: int(s.get("index", 0)))

    pipeline_id = datetime.now().strftime("%Y%m%d_%H%M%S") + "_pipeline"
    pipeline_dir = get_pipelines_dir() / pipeline_id
    pipeline_dir.mkdir(parents=True, exist_ok=True)

    input_path = pipeline_dir / "input.png"
    cv2.imwrite(str(input_path), image)

    base_url = f"/runtime/pipelines/{pipeline_id}"
    current_image = image.copy()
    step_results: list[dict[str, Any]] = []
    total_start = time.perf_counter()

    for step in sorted_steps:
        step_index = int(step.get("index", len(step_results) + 1))
        step_domain = step.get("domain", default_domain)
        node_id = step.get("node", "")
        method_id = step.get("method", "")
        params = step.get("params") or {}

        if not node_id or not method_id:
            raise ValueError(f"第 {step_index} 步缺少 node 或 method")

        method_dir = get_method_dir(step_domain, node_id, method_id)
        if not method_dir.exists():
            raise FileNotFoundError(f"第 {step_index} 步 {node_id} / {method_id} 不存在")

        status = check_method(step_domain, node_id, method_id)
        if not status.get("available"):
            reason = status.get("reason") or "方法不可用"
            raise RuntimeError(f"第 {step_index} 步 {node_id} / {method_id} 不可用：{reason}")

        process_fn = load_process_fn(step_domain, node_id, method_id)
        process_kwargs = _build_process_kwargs(step_domain, node_id, method_id, params)

        start = time.perf_counter()
        try:
            output = process_fn(current_image, **process_kwargs)
        except Exception as exc:
            raise RuntimeError(
                f"第 {step_index} 步 {node_id} / {method_id} 运行失败：{exc}"
            ) from exc

        elapsed_ms = (time.perf_counter() - start) * 1000
        current_image = output

        step_filename = f"step_{step_index:02d}_{node_id}_{method_id}.png"
        step_path = pipeline_dir / step_filename
        cv2.imwrite(str(step_path), output)

        input_spec = status.get("input_spec") or {}
        output_spec = status.get("output_spec") or {}

        step_results.append({
            "index": step_index,
            "domain": step_domain,
            "node": node_id,
            "method": method_id,
            "input_spec": input_spec,
            "output_spec": output_spec,
            "output_url": f"{base_url}/{step_filename}",
            "output_path": str(step_path),
            "runtime_ms": round(elapsed_ms, 2),
        })

    total_runtime_ms = (time.perf_counter() - total_start) * 1000

    final_path = pipeline_dir / "final.png"
    comparison_path = pipeline_dir / "comparison.png"
    cv2.imwrite(str(final_path), current_image)

    comparison = _create_comparison(image, current_image)
    cv2.imwrite(str(comparison_path), comparison)

    pipeline_record = {
        "pipeline_id": pipeline_id,
        "domain": default_domain,
        "strategy": strategy,
        "steps": [
            {
                "index": s["index"],
                "domain": s["domain"],
                "node": s["node"],
                "method": s["method"],
                "params": next(
                    (st.get("params") or {} for st in sorted_steps if int(st.get("index", 0)) == s["index"]),
                    {},
                ),
                "input_spec": s.get("input_spec"),
                "output_spec": s.get("output_spec"),
            }
            for s in step_results
        ],
        "step_results": step_results,
        "total_runtime_ms": round(total_runtime_ms, 2),
        "input_path": str(input_path),
        "final_output_path": str(final_path),
        "comparison_path": str(comparison_path),
    }

    with open(pipeline_dir / "pipeline.json", "w", encoding="utf-8") as f:
        json.dump(pipeline_record, f, ensure_ascii=False, indent=2)

    timestamp = datetime.now().isoformat(timespec="seconds")
    save_experiment({
        "run_id": pipeline_id,
        "type": "pipeline",
        "timestamp": timestamp,
        "domain": default_domain,
        "strategy": strategy,
        "steps": [
            {
                "index": s["index"],
                "node": s["node"],
                "method": s["method"],
                "runtime_ms": s["runtime_ms"],
                "input_spec": s.get("input_spec"),
                "output_spec": s.get("output_spec"),
            }
            for s in step_results
        ],
        "input_path": str(input_path),
        "final_output_path": str(final_path),
        "comparison_path": str(comparison_path),
        "input_url": f"{base_url}/input.png",
        "final_output_url": f"{base_url}/final.png",
        "comparison_url": f"{base_url}/comparison.png",
        "total_runtime_ms": round(total_runtime_ms, 2),
    })

    return {
        "pipeline_id": pipeline_id,
        "input_url": f"{base_url}/input.png",
        "steps": step_results,
        "final_output_url": f"{base_url}/final.png",
        "comparison_url": f"{base_url}/comparison.png",
        "total_runtime_ms": round(total_runtime_ms, 2),
    }
