"""Super-resolution node metrics — node-level evaluation (may override global defaults)."""

from __future__ import annotations

import numpy as np


def _align_shapes(reference: np.ndarray, result: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if reference.shape == result.shape:
        return reference, result
    height = min(reference.shape[0], result.shape[0])
    width = min(reference.shape[1], result.shape[1])
    return reference[:height, :width], result[:height, :width]


def _compute_mse(reference: np.ndarray, result: np.ndarray) -> float:
    ref, res = _align_shapes(reference, result)
    return float(np.mean((ref.astype(np.float64) - res.astype(np.float64)) ** 2))


def _compute_psnr(reference: np.ndarray, result: np.ndarray, max_val: float = 255.0) -> float:
    mse = _compute_mse(reference, result)
    if mse == 0:
        return float("inf")
    return float(20 * np.log10(max_val / np.sqrt(mse)))


def _compute_ssim(reference: np.ndarray, result: np.ndarray) -> float | None:
    try:
        from skimage.metrics import structural_similarity
    except ImportError:
        return None

    ref, res = _align_shapes(reference, result)
    if len(ref.shape) == 3:
        return float(structural_similarity(ref, res, channel_axis=2, data_range=255))
    return float(structural_similarity(ref, res, data_range=255))


def evaluate(clean: np.ndarray, recovered: np.ndarray) -> dict:
    """Evaluate super-resolution quality against the high-resolution reference."""
    mse = _compute_mse(clean, recovered)
    psnr = _compute_psnr(clean, recovered)
    ssim = _compute_ssim(clean, recovered)
    return {
        "mse": round(mse, 4),
        "psnr": round(psnr, 4) if psnr != float("inf") else 999.99,
        "ssim": round(ssim, 4) if ssim is not None else None,
    }
