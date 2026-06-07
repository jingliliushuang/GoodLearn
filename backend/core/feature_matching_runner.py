"""Two-image feature matching execution pipeline."""

from __future__ import annotations

import time
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from core.experiments import save_experiment
from core.loader import load_process_fn
from core.model_checker import check_method
from core.params import merge_process_kwargs, validate_method_params
from core.tree import get_method_dir, load_node_metadata
from core.utils import ensure_runtime_dirs, get_external_model_root, get_runtime_paths


def _decode_image(image_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Invalid image file")
    return image


def _normalize_result(raw: Any) -> tuple[np.ndarray, dict[str, Any], list]:
    if isinstance(raw, dict):
        vis = raw.get("vis_image")
        if vis is None:
            raise ValueError("process() must return vis_image in result dict")
        metrics = dict(raw.get("metrics") or {})
        homography = raw.get("homography") or []
        return vis, metrics, homography

    if isinstance(raw, np.ndarray):
        return raw, {}, []

    raise ValueError("process() must return dict with vis_image or np.ndarray")


def run_feature_matching(
    domain_id: str,
    node_id: str,
    method_id: str,
    image_a_bytes: bytes,
    image_b_bytes: bytes,
    user_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    ensure_runtime_dirs()
    runtime = get_runtime_paths()

    status = check_method(domain_id, node_id, method_id)
    if not status.get("available"):
        raise ValueError(status.get("reason") or "Method not available")

    image_a = _decode_image(image_a_bytes)
    image_b = _decode_image(image_b_bytes)

    node_meta = load_node_metadata(domain_id, node_id)
    process_fn = load_process_fn(domain_id, node_id, method_id)
    method_dir = get_method_dir(domain_id, node_id, method_id)

    validated = validate_method_params(domain_id, node_id, method_id, user_params or {})
    process_kwargs = merge_process_kwargs(
        {
            "method_dir": str(method_dir),
            "external_model_root": str(get_external_model_root()),
        },
        validated,
    )

    start = time.perf_counter()
    raw = process_fn(image_a, image_b, **process_kwargs)
    elapsed_ms = (time.perf_counter() - start) * 1000

    vis_image, metrics, homography = _normalize_result(raw)

    metrics.setdefault("runtime_ms", round(elapsed_ms, 2))
    for key in ("keypoints_a", "keypoints_b", "matches", "good_matches", "inliers"):
        metrics.setdefault(key, 0)

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    out_dir = runtime["outputs"] / run_id
    out_dir.mkdir(parents=True, exist_ok=True)

    cv2.imwrite(str(out_dir / "image_a.png"), image_a)
    cv2.imwrite(str(out_dir / "image_b.png"), image_b)
    cv2.imwrite(str(out_dir / "match_vis.png"), vis_image)

    base_url = f"/runtime/outputs/{run_id}"
    save_experiment(
        {
            "run_id": run_id,
            "timestamp": datetime.now().isoformat(timespec="seconds"),
            "type": "feature_matching",
            "domain": domain_id,
            "node": node_id,
            "method": method_id,
            "node_type": node_meta.get("type", node_id),
            "metrics": metrics,
            "homography": homography,
            "output_dir": str(out_dir),
            "image_a_url": f"{base_url}/image_a.png",
            "image_b_url": f"{base_url}/image_b.png",
            "match_vis_url": f"{base_url}/match_vis.png",
        }
    )

    return {
        "run_id": run_id,
        "domain": domain_id,
        "node": node_id,
        "method": method_id,
        "metrics": metrics,
        "homography": homography,
        "image_a_url": f"{base_url}/image_a.png",
        "image_b_url": f"{base_url}/image_b.png",
        "match_vis_url": f"{base_url}/match_vis.png",
    }
