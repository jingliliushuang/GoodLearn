"""Standard three-stage experiment executor: dataset → model → metrics."""

from __future__ import annotations

import importlib.util
import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

import cv2
import numpy as np

from core.experiments import save_experiment
from core.model_checker import check_method
from core.params import merge_process_kwargs, validate_method_params
from core.tree import get_method_dir, get_node_dir
from core.utils import get_external_model_root, get_project_root


def _backend_root() -> Path:
    return Path(__file__).resolve().parents[1]


def load_module_from_path(module_path: Path, module_name: str):
    if not module_path.exists():
        raise FileNotFoundError(f"模块不存在: {module_path}")

    spec = importlib.util.spec_from_file_location(module_name, str(module_path))
    if spec is None or spec.loader is None:
        raise ImportError(f"无法加载模块: {module_path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def read_image_bgr(path: Path) -> np.ndarray:
    image = cv2.imread(str(path), cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError(f"无法读取图像: {path}")
    return image


def save_image(path: Path, image: np.ndarray) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    ok = cv2.imwrite(str(path), image)
    if not ok:
        raise RuntimeError(f"图像保存失败: {path}")
    return str(path)


def to_url_from_runtime(path: Path, backend_root: Path) -> str:
    runtime_root = backend_root / "runtime"
    rel = path.resolve().relative_to(runtime_root.resolve())
    return "/runtime/" + rel.as_posix()


def ensure_uint8(image: np.ndarray) -> np.ndarray:
    if image.dtype == np.uint8:
        return image
    return np.clip(image, 0, 255).astype(np.uint8)


def create_comparison_image(
    clean: np.ndarray,
    degraded_vis: np.ndarray,
    recovered: np.ndarray,
    output_path: Path,
) -> str:
    clean = ensure_uint8(clean)
    degraded_vis = ensure_uint8(degraded_vis)
    recovered = ensure_uint8(recovered)

    h, w = clean.shape[:2]
    degraded_vis = cv2.resize(degraded_vis, (w, h), interpolation=cv2.INTER_NEAREST)
    recovered_vis = cv2.resize(recovered, (w, h), interpolation=cv2.INTER_CUBIC)

    label_h = 36
    canvas = np.zeros((h + label_h, w * 3, 3), dtype=np.uint8)
    canvas[:, :] = (32, 24, 20)

    canvas[label_h:, 0:w] = clean
    canvas[label_h:, w:2 * w] = degraded_vis
    canvas[label_h:, 2 * w:3 * w] = recovered_vis

    labels = ["Clean", "Degraded", "Recovered"]
    for i, label in enumerate(labels):
        x = i * w + 12
        cv2.putText(
            canvas,
            label,
            (x, 24),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (255, 255, 255),
            2,
            cv2.LINE_AA,
        )

    save_image(output_path, canvas)
    return str(output_path)


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def run_standard_experiment(
    *,
    project_root: Path | None = None,
    backend_root: Path | None = None,
    external_model_root: Path | None = None,
    domain: str,
    node: str,
    method: str,
    image_path: Path,
    degradation: str,
    degradation_params: dict[str, Any] | None = None,
    method_params: dict[str, Any] | None = None,
    metrics: list[str] | None = None,
) -> dict[str, Any]:
    """
    标准三阶段实验：
    1. dataset.degrade()
    2. method.model.process()
    3. metrics.evaluate()
    """
    project_root = project_root or get_project_root()
    backend_root = backend_root or _backend_root()
    external_model_root = external_model_root or get_external_model_root()

    node_dir = get_node_dir(domain, node)
    if not node_dir.exists():
        raise FileNotFoundError(f"节点不存在: {domain}/{node}")

    status = check_method(domain, node, method)
    if not status.get("available"):
        reason = status.get("reason") or "该方法当前不可运行"
        raise RuntimeError(f"方法不可运行: {method}，原因: {reason}")

    dataset_path = node_dir / "dataset.py"
    metrics_path = node_dir / "metrics.py"
    method_dir = get_method_dir(domain, node, method)
    model_path = method_dir / "model.py"

    clean_image = read_image_bgr(image_path)

    dataset_module = load_module_from_path(dataset_path, f"{domain}_{node}_dataset")
    if not hasattr(dataset_module, "degrade"):
        raise AttributeError(f"{dataset_path} 缺少 degrade()")

    degradation_params = degradation_params or {}
    degradation_result = dataset_module.degrade(
        clean_image,
        degradation=degradation,
        **degradation_params,
    )

    if isinstance(degradation_result, dict):
        clean = degradation_result.get("clean", clean_image)
        degraded = degradation_result.get("degraded")
        degraded_vis = degradation_result.get("visualization", degraded)
        degradation_metadata = degradation_result.get("metadata", {})
    else:
        clean = clean_image
        degraded = degradation_result
        degraded_vis = degraded
        degradation_metadata = {
            "degradation": degradation,
            "params": degradation_params,
        }

    if degraded is None:
        raise RuntimeError("dataset.degrade() 未返回 degraded 图像")

    model_module = load_module_from_path(model_path, f"{domain}_{node}_{method}_model")
    if not hasattr(model_module, "process"):
        raise AttributeError(f"{model_path} 缺少 process()")

    process_kwargs: dict[str, Any] = {
        "method_dir": str(method_dir),
        "external_model_root": str(external_model_root),
    }
    if status.get("detected_weights"):
        process_kwargs["weight_path"] = status["detected_weights"][0]

    validated_params = validate_method_params(domain, node, method, method_params)
    process_kwargs = merge_process_kwargs(process_kwargs, validated_params)

    t0 = time.perf_counter()
    recovered = model_module.process(degraded, **process_kwargs)
    runtime_ms = (time.perf_counter() - t0) * 1000.0

    if isinstance(recovered, dict):
        recovered_image = (
            recovered.get("recovered") or recovered.get("image") or recovered.get("output")
        )
        model_metadata = recovered.get("metadata", {})
    else:
        recovered_image = recovered
        model_metadata = {}

    if recovered_image is None:
        raise RuntimeError("model.process() 未返回恢复图像")

    recovered_image = ensure_uint8(recovered_image)

    metrics_module = load_module_from_path(metrics_path, f"{domain}_{node}_metrics")
    if not hasattr(metrics_module, "evaluate"):
        raise AttributeError(f"{metrics_path} 缺少 evaluate()")

    selected_metrics = metrics or ["mse", "psnr", "ssim"]
    metric_results = metrics_module.evaluate(clean, recovered_image, metrics=selected_metrics)
    metric_results["runtime_ms"] = round(float(runtime_ms), 2)

    now = datetime.now()
    experiment_id = f"{now.strftime('%Y%m%d_%H%M%S')}_{node}_{method}_{uuid.uuid4().hex[:6]}"

    output_dir = backend_root / "runtime" / "standard_experiments" / experiment_id
    output_dir.mkdir(parents=True, exist_ok=True)

    clean_path = output_dir / "clean.png"
    degraded_path = output_dir / "degraded.png"
    recovered_path = output_dir / "recovered.png"
    comparison_path = output_dir / "comparison.png"
    record_path = output_dir / "experiment.json"

    save_image(clean_path, ensure_uint8(clean))
    save_image(degraded_path, ensure_uint8(degraded_vis))
    save_image(recovered_path, recovered_image)
    create_comparison_image(clean, degraded_vis, recovered_image, comparison_path)

    record = {
        "run_id": experiment_id,
        "type": "standard_experiment",
        "timestamp": now.isoformat(timespec="seconds"),
        "domain": domain,
        "node": node,
        "degradation": {
            "id": degradation,
            "params": degradation_params,
            "metadata": degradation_metadata,
        },
        "method": {
            "id": method,
            "params": validated_params,
            "metadata": model_metadata,
        },
        "metrics_selected": selected_metrics,
        "metrics": metric_results,
        "paths": {
            "clean": str(clean_path),
            "degraded": str(degraded_path),
            "recovered": str(recovered_path),
            "comparison": str(comparison_path),
        },
        "clean_url": to_url_from_runtime(clean_path, backend_root),
        "degraded_url": to_url_from_runtime(degraded_path, backend_root),
        "recovered_url": to_url_from_runtime(recovered_path, backend_root),
        "comparison_url": to_url_from_runtime(comparison_path, backend_root),
    }

    write_json(record_path, record)
    save_experiment(record)

    return {
        "experiment_id": experiment_id,
        "clean_url": record["clean_url"],
        "degraded_url": record["degraded_url"],
        "recovered_url": record["recovered_url"],
        "comparison_url": record["comparison_url"],
        "metrics": metric_results,
        "degradation": {
            "id": degradation,
            "params": degradation_params,
        },
        "method": {
            "id": method,
            "params": validated_params,
        },
        "record": record,
    }
