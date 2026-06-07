"""Denoise node dataset — synthetic degradation for evaluation."""

from __future__ import annotations

import numpy as np


def degrade(clean_image: np.ndarray, sigma: float = 25.0, **params) -> np.ndarray:
    """Add Gaussian noise to a clean image to simulate a noisy observation."""
    noise = np.random.normal(0, sigma, clean_image.shape).astype(np.float32)
    noisy = np.clip(clean_image.astype(np.float32) + noise, 0, 255)
    return noisy.astype(np.uint8)
