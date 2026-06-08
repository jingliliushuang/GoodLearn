import cv2
import numpy as np
from typing import Any, Dict, List


def list_degradations() -> List[Dict[str, Any]]:
    return [
        {
            "id": "gaussian_noise",
            "title": "高斯噪声",
            "description": "向图像添加高斯噪声。",
            "params": {"sigma": 25},
        },
        {
            "id": "salt_pepper_noise",
            "title": "椒盐噪声",
            "description": "随机将像素置为黑色或白色。",
            "params": {"amount": 0.03},
        },
        {
            "id": "speckle_noise",
            "title": "斑点噪声",
            "description": "乘性噪声。",
            "params": {"sigma": 0.1},
        },
    ]


def _ensure_uint8(image: np.ndarray) -> np.ndarray:
    if image.dtype == np.uint8:
        return image
    image = np.clip(image, 0, 255)
    return image.astype(np.uint8)


def _add_gaussian_noise(image: np.ndarray, sigma: float = 25.0) -> np.ndarray:
    image_f = image.astype(np.float32)
    noise = np.random.normal(0, float(sigma), image.shape).astype(np.float32)
    noisy = image_f + noise
    return _ensure_uint8(noisy)


def _add_salt_pepper_noise(image: np.ndarray, amount: float = 0.03) -> np.ndarray:
    amount = float(amount)
    amount = max(0.0, min(amount, 1.0))

    noisy = image.copy()
    h, w = image.shape[:2]

    num_pixels = int(h * w * amount)
    if num_pixels <= 0:
        return noisy

    ys = np.random.randint(0, h, num_pixels)
    xs = np.random.randint(0, w, num_pixels)

    half = num_pixels // 2
    noisy[ys[:half], xs[:half]] = 0
    noisy[ys[half:], xs[half:]] = 255

    return noisy


def _add_speckle_noise(image: np.ndarray, sigma: float = 0.1) -> np.ndarray:
    image_f = image.astype(np.float32) / 255.0
    noise = np.random.normal(0, float(sigma), image_f.shape).astype(np.float32)
    noisy = image_f + image_f * noise
    noisy = np.clip(noisy, 0.0, 1.0)
    return (noisy * 255.0).astype(np.uint8)


def degrade(clean_image: np.ndarray, degradation: str = "gaussian_noise", **params) -> Dict[str, Any]:
    """
    标准三阶段实验的第一阶段：测试集生成。

    输入:
        clean_image: 干净图像，通常为 BGR uint8。
        degradation: 退化方式。
        params: 退化参数。

    输出:
        dict:
        {
            "clean": clean_image,
            "degraded": degraded_image,
            "visualization": degraded_image,
            "metadata": {...}
        }
    """
    clean_image = _ensure_uint8(clean_image)

    if degradation == "gaussian_noise":
        degraded = _add_gaussian_noise(clean_image, sigma=float(params.get("sigma", 25)))
    elif degradation == "salt_pepper_noise":
        degraded = _add_salt_pepper_noise(clean_image, amount=float(params.get("amount", 0.03)))
    elif degradation == "speckle_noise":
        degraded = _add_speckle_noise(clean_image, sigma=float(params.get("sigma", 0.1)))
    else:
        raise ValueError(f"未知去噪退化方法: {degradation}")

    return {
        "clean": clean_image,
        "degraded": degraded,
        "visualization": degraded,
        "metadata": {
            "degradation": degradation,
            "params": params,
        },
    }
