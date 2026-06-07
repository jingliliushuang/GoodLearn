"""Feature matching node dataset helpers."""
import numpy as np


def degrade(clean_image: np.ndarray, **params) -> np.ndarray:
    """Feature matching uses two uploaded images; degrade is unused."""
    return clean_image
