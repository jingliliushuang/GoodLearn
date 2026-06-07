"""Image quality metrics."""

from __future__ import annotations

import numpy as np


def compute_mse(reference: np.ndarray, result: np.ndarray) -> float:
    ref = reference.astype(np.float64)
    res = result.astype(np.float64)
    if ref.shape != res.shape:
        h = min(ref.shape[0], res.shape[0])
        w = min(ref.shape[1], res.shape[1])
        ref = ref[:h, :w]
        res = res[:h, :w]
    return float(np.mean((ref - res) ** 2))


def compute_psnr(reference: np.ndarray, result: np.ndarray, max_val: float = 255.0) -> float:
    mse = compute_mse(reference, result)
    if mse == 0:
        return float("inf")
    return float(20 * np.log10(max_val / np.sqrt(mse)))


def compute_ssim(reference: np.ndarray, result: np.ndarray) -> float | None:
    try:
        from skimage.metrics import structural_similarity
    except ImportError:
        return None

    ref = reference
    res = result
    if ref.shape != res.shape:
        h = min(ref.shape[0], res.shape[0])
        w = min(ref.shape[1], res.shape[1])
        ref = ref[:h, :w]
        res = res[:h, :w]

    if len(ref.shape) == 3:
        return float(structural_similarity(ref, res, channel_axis=2, data_range=255))
    return float(structural_similarity(ref, res, data_range=255))
