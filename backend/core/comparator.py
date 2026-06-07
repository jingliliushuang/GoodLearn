"""Multi-method comparison for a single node."""

from __future__ import annotations

import json
import time
from datetime import datetime
from typing import Any

import cv2
import numpy as np

from core.experiments import save_experiment
from core.loader import load_evaluate_fn, load_method_metadata, load_process_fn
from core.metrics import compute_mse, compute_psnr, compute_ssim
from core.model_checker import check_method
from core.tree import get_method_dir
from core.utils import ensure_runtime_dirs, get_comparisons_dir, get_external_model_root


METHOD_NOTES: dict[str, str] = {
    "nearest": "速度最快，但块状伪影明显。",
    "bilinear": "速度较快，但细节容易模糊。",
    "bicubic": "经典传统超分基线，速度与效果较均衡。",
    "lanczos": "边缘较锐，但可能产生振铃伪影。",
    "espcn": "CNN 方法，在速度和质量之间较均衡。",
    "edsr": "效果较好，但运行时间更长。",
}

TRADITIONAL_METHODS = {"nearest", "bilinear", "bicubic", "lanczos"}
CNN_METHODS = {"espcn", "edsr"}


def _build_process_kwargs(domain_id: str, node_id: str, method_id: str) -> dict[str, Any]:
    method_dir = get_method_dir(domain_id, node_id, method_id)
    status = check_method(domain_id, node_id, method_id)

    kwargs: dict[str, Any] = {
        "method_dir": str(method_dir),
        "external_model_root": str(get_external_model_root()),
    }
    if status.get("detected_weights"):
        kwargs["weight_path"] = status["detected_weights"][0]
    return kwargs


def _compute_metrics(reference: np.ndarray, output: np.ndarray, domain_id: str, node_id: str) -> dict[str, Any]:
    evaluate_fn = load_evaluate_fn(domain_id, node_id)
    if evaluate_fn is not None:
        metrics = dict(evaluate_fn(reference, output))
    else:
        mse = compute_mse(reference, output)
        psnr = compute_psnr(reference, output)
        ssim = compute_ssim(reference, output)
        metrics = {
            "mse": round(mse, 4),
            "psnr": round(psnr, 4) if psnr != float("inf") else 999.99,
            "ssim": round(ssim, 4) if ssim is not None else None,
        }
    return metrics


def _method_type(method_id: str, meta: dict[str, Any]) -> str:
    category = meta.get("category", "")
    if category == "traditional" or method_id in TRADITIONAL_METHODS:
        return "传统插值"
    if category == "cnn" or method_id in CNN_METHODS:
        return "CNN"
    return category or "其他"


def _build_summary(success_results: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    for item in success_results:
        note = item.get("note") or METHOD_NOTES.get(item["method"], "")
        title = item.get("title") or item["method"]
        runtime = item.get("metrics", {}).get("runtime_ms")
        if runtime is not None:
            lines.append(f"{title}（{runtime} ms）：{note}")
        else:
            lines.append(f"{title}：{note}")
    if not lines:
        return ["所有选定方法均运行失败，请检查依赖与权重。"]

    fastest = min(success_results, key=lambda r: r["metrics"].get("runtime_ms", float("inf")))
    lines.append(
        f"本次对比中 {fastest.get('title', fastest['method'])} 运行最快（"
        f"{fastest['metrics'].get('runtime_ms')} ms）。"
    )
    lines.append("无 GT 参考图时，PSNR/MSE 为相对输入图的参考值，仅供同图方法间横向比较。")
    return lines


def create_comparison_grid(
    panels: list[tuple[str, np.ndarray]],
    output_path: str | Any,
    target_height: int = 240,
    label_height: int = 36,
) -> None:
    """Build a labeled grid: first panel is Input, then each method output."""
    if not panels:
        raise ValueError("No panels for comparison grid")

    rendered: list[np.ndarray] = []
    max_w = 0

    for label, img in panels:
        h, w = img.shape[:2]
        scale = target_height / max(h, 1)
        new_w = max(int(w * scale), 1)
        resized = cv2.resize(img, (new_w, target_height), interpolation=cv2.INTER_AREA)

        bar = np.zeros((label_height, new_w, 3), dtype=np.uint8)
        bar[:] = (40, 40, 40)
        cv2.putText(
            bar,
            label,
            (8, 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (220, 220, 220),
            1,
            cv2.LINE_AA,
        )
        tile = np.vstack([resized, bar])
        rendered.append(tile)
        max_w = max(max_w, new_w)

    padded = []
    for tile in rendered:
        th, tw = tile.shape[:2]
        if tw < max_w:
            pad = max_w - tw
            tile = cv2.copyMakeBorder(tile, 0, 0, 0, pad, cv2.BORDER_CONSTANT, value=(30, 30, 30))
        padded.append(tile)

    grid = np.hstack(padded)
    cv2.imwrite(str(output_path), grid)


def compare_methods(
    image: np.ndarray,
    domain: str,
    node: str,
    methods: list[str],
    context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Run multiple methods on the same uploaded image and compare outputs."""
    if image is None or image.size == 0:
        raise ValueError("Invalid image")

    if not methods:
        raise ValueError("methods cannot be empty")

    context = context or {}
    ensure_runtime_dirs()

    comparison_id = datetime.now().strftime("%Y%m%d_%H%M%S") + f"_{node}_compare"
    comparison_dir = get_comparisons_dir() / comparison_id
    comparison_dir.mkdir(parents=True, exist_ok=True)

    input_path = comparison_dir / "input.png"
    cv2.imwrite(str(input_path), image)

    base_url = f"/runtime/comparisons/{comparison_id}"
    results: list[dict[str, Any]] = []
    grid_panels: list[tuple[str, np.ndarray]] = [("Input", image.copy())]

    for method_id in methods:
        status = check_method(domain, node, method_id)
        meta = load_method_metadata(domain, node, method_id)
        title = status.get("title") or meta.get("title") or method_id
        note = METHOD_NOTES.get(method_id, meta.get("description", ""))
        method_type = _method_type(method_id, meta)

        entry: dict[str, Any] = {
            "method": method_id,
            "title": title,
            "type": method_type,
            "note": note,
        }

        if not status.get("available"):
            reason = status.get("reason") or "方法不可用"
            entry["error"] = reason
            entry["metrics"] = {"runtime_ms": None, "mse": None, "psnr": None, "ssim": None}
            results.append(entry)
            continue

        try:
            process_fn = load_process_fn(domain, node, method_id)
            process_kwargs = _build_process_kwargs(domain, node, method_id)

            start = time.perf_counter()
            output = process_fn(image, **process_kwargs)
            elapsed_ms = (time.perf_counter() - start) * 1000

            output_path = comparison_dir / f"{method_id}.png"
            cv2.imwrite(str(output_path), output)

            metrics = _compute_metrics(image, output, domain, node)
            metrics["runtime_ms"] = round(elapsed_ms, 2)

            entry.update({
                "output_url": f"{base_url}/{method_id}.png",
                "output_path": str(output_path),
                "metrics": metrics,
            })
            grid_panels.append((method_id, output))
        except Exception as exc:
            entry["error"] = str(exc)
            entry["metrics"] = {"runtime_ms": None, "mse": None, "psnr": None, "ssim": None}

        results.append(entry)

    success_results = [r for r in results if "error" not in r and r.get("output_url")]
    if not success_results:
        failed = [f"{r['method']}: {r.get('error', 'unknown')}" for r in results]
        raise RuntimeError("所有模型均运行失败：" + "; ".join(failed))

    grid_path = comparison_dir / "comparison_grid.png"
    create_comparison_grid(grid_panels, grid_path)

    summary = _build_summary(success_results)

    comparison_record = {
        "comparison_id": comparison_id,
        "domain": domain,
        "node": node,
        "methods": methods,
        "input_path": str(input_path),
        "comparison_grid_path": str(grid_path),
        "results": results,
        "summary": summary,
    }

    with open(comparison_dir / "comparison.json", "w", encoding="utf-8") as f:
        json.dump(comparison_record, f, ensure_ascii=False, indent=2)

    timestamp = datetime.now().isoformat(timespec="seconds")
    save_experiment({
        "run_id": comparison_id,
        "type": "comparison",
        "timestamp": timestamp,
        "domain": domain,
        "node": node,
        "methods": methods,
        "input_path": str(input_path),
        "comparison_grid_path": str(grid_path),
        "comparison_grid_url": f"{base_url}/comparison_grid.png",
        "results": [
            {
                "method": r["method"],
                "output_path": r.get("output_path"),
                "output_url": r.get("output_url"),
                "error": r.get("error"),
                "metrics": r.get("metrics"),
            }
            for r in results
        ],
    })

    return {
        "comparison_id": comparison_id,
        "input_url": f"{base_url}/input.png",
        "results": results,
        "comparison_grid_url": f"{base_url}/comparison_grid.png",
        "summary": summary,
    }
