"""Model execution pipeline."""

from __future__ import annotations

import time
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from core.experiments import save_experiment
from core.loader import load_process_fn
from core.metrics import compute_mse, compute_psnr, compute_ssim
from core.model_checker import check_method
from core.tree import get_method_dir, load_node_metadata
from core.utils import ensure_runtime_dirs, get_external_model_root, get_runtime_paths


def _add_noise(image: np.ndarray, sigma: float = 25.0) -> np.ndarray:
    noise = np.random.normal(0, sigma, image.shape).astype(np.float32)
    noisy = np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)
    return noisy


def _prepare_input(image: np.ndarray, node_id: str) -> tuple[np.ndarray, np.ndarray]:
    """Return (model_input, reference_for_metrics)."""
    if node_id == "denoise":
        noisy = _add_noise(image)
        return noisy, image
    return image, image


def _create_comparison(input_img: np.ndarray, output_img: np.ndarray) -> np.ndarray:
    h1, w1 = input_img.shape[:2]
    h2, w2 = output_img.shape[:2]
    h = max(h1, h2)

    def pad_to_height(img: np.ndarray) -> np.ndarray:
        ih, iw = img.shape[:2]
        if ih == h:
            return img
        pad = h - ih
        return cv2.copyMakeBorder(img, 0, pad, 0, 0, cv2.BORDER_CONSTANT, value=(0, 0, 0))

    left = pad_to_height(input_img)
    right = pad_to_height(output_img)
    separator = np.zeros((h, 4, 3), dtype=np.uint8)
    separator[:] = (200, 200, 200)
    return np.hstack([left, separator, right])


def run_model(
    domain_id: str,
    node_id: str,
    method_id: str,
    image_bytes: bytes,
    **kwargs: Any,
) -> dict[str, Any]:
    ensure_runtime_dirs()
    runtime = get_runtime_paths()

    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image file")

    node_meta = load_node_metadata(domain_id, node_id)
    model_input, reference = _prepare_input(image, node_id)

    process_fn = load_process_fn(domain_id, node_id, method_id)
    method_dir = get_method_dir(domain_id, node_id, method_id)
    status = check_method(domain_id, node_id, method_id)

    process_kwargs: dict[str, Any] = {
        "method_dir": str(method_dir),
        "external_model_root": str(get_external_model_root()),
    }
    if status.get("detected_weights"):
        process_kwargs["weight_path"] = status["detected_weights"][0]

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    run_dir = runtime["outputs"] / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    start = time.perf_counter()
    output = process_fn(model_input, **process_kwargs)
    elapsed_ms = (time.perf_counter() - start) * 1000

    input_path = run_dir / "input.png"
    output_path = run_dir / "output.png"
    comparison_path = run_dir / "comparison.png"

    cv2.imwrite(str(input_path), model_input)
    cv2.imwrite(str(output_path), output)

    comparison = _create_comparison(model_input, output)
    cv2.imwrite(str(comparison_path), comparison)

    mse = compute_mse(reference, output)
    psnr = compute_psnr(reference, output)
    ssim = compute_ssim(reference, output)

    base_url = f"/runtime/outputs/{run_id}"
    timestamp = datetime.now().isoformat(timespec="seconds")

    result = {
        "run_id": run_id,
        "input_url": f"{base_url}/input.png",
        "output_url": f"{base_url}/output.png",
        "comparison_url": f"{base_url}/comparison.png",
        "metrics": {
            "mse": round(mse, 4),
            "psnr": round(psnr, 4) if psnr != float("inf") else 999.99,
            "ssim": round(ssim, 4) if ssim is not None else None,
            "runtime_ms": round(elapsed_ms, 2),
        },
        "node_type": node_meta.get("type", node_id),
    }

    save_experiment({
        "run_id": run_id,
        "timestamp": timestamp,
        "domain": domain_id,
        "node": node_id,
        "method": method_id,
        "input_path": str(input_path),
        "output_path": str(output_path),
        "comparison_path": str(comparison_path),
        "input_url": result["input_url"],
        "output_url": result["output_url"],
        "comparison_url": result["comparison_url"],
        "metrics": result["metrics"],
    })

    return result
