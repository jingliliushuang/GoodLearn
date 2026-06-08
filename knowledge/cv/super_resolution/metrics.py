import cv2
import numpy as np
from typing import Any, Dict, List, Optional


def list_metrics() -> List[Dict[str, str]]:
    return [
        {
            "id": "mse",
            "title": "MSE",
            "description": "均方误差，越低越好。",
        },
        {
            "id": "psnr",
            "title": "PSNR",
            "description": "峰值信噪比，越高越好。",
        },
        {
            "id": "ssim",
            "title": "SSIM",
            "description": "结构相似性，越接近 1 越好。",
        },
    ]


def _ensure_uint8(image: np.ndarray) -> np.ndarray:
    if image.dtype == np.uint8:
        return image
    return np.clip(image, 0, 255).astype(np.uint8)


def _align_to_reference(reference: np.ndarray, prediction: np.ndarray) -> np.ndarray:
    ref_h, ref_w = reference.shape[:2]
    pred_h, pred_w = prediction.shape[:2]

    if (ref_h, ref_w) == (pred_h, pred_w):
        return prediction

    return cv2.resize(prediction, (ref_w, ref_h), interpolation=cv2.INTER_CUBIC)


def _mse(reference: np.ndarray, prediction: np.ndarray) -> float:
    reference = reference.astype(np.float32)
    prediction = prediction.astype(np.float32)
    return float(np.mean((reference - prediction) ** 2))


def _psnr(reference: np.ndarray, prediction: np.ndarray) -> float:
    mse_value = _mse(reference, prediction)
    if mse_value <= 1e-12:
        return 99.0
    return float(20.0 * np.log10(255.0 / np.sqrt(mse_value)))


def _ssim_simple(reference: np.ndarray, prediction: np.ndarray) -> Optional[float]:
    """
    优先使用 skimage.metrics.structural_similarity。
    如果不可用，返回 None，不让实验失败。
    """
    try:
        from skimage.metrics import structural_similarity as ssim
    except Exception:
        return None

    reference = _ensure_uint8(reference)
    prediction = _ensure_uint8(prediction)

    if reference.ndim == 3:
        try:
            return float(ssim(reference, prediction, channel_axis=2, data_range=255))
        except TypeError:
            return float(ssim(reference, prediction, multichannel=True, data_range=255))
    return float(ssim(reference, prediction, data_range=255))


def evaluate(clean: np.ndarray, recovered: np.ndarray, metrics=None, **params) -> Dict[str, Any]:
    """
    标准三阶段实验的第三阶段：评价。

    输入:
        clean: 参考图像。
        recovered: 恢复图像。
        metrics: 指标 id 列表，例如 ["mse", "psnr", "ssim"]。

    输出:
        dict，包含所选指标。
    """
    if metrics is None:
        metrics = ["mse", "psnr", "ssim"]

    clean = _ensure_uint8(clean)
    recovered = _ensure_uint8(recovered)
    recovered = _align_to_reference(clean, recovered)

    results: Dict[str, Any] = {}

    if "mse" in metrics:
        results["mse"] = round(_mse(clean, recovered), 4)

    if "psnr" in metrics:
        results["psnr"] = round(_psnr(clean, recovered), 4)

    if "ssim" in metrics:
        ssim_val = _ssim_simple(clean, recovered)
        if ssim_val is not None:
            results["ssim"] = round(ssim_val, 4)

    return results
