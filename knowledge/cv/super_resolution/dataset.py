import cv2
import numpy as np
from typing import Any, Dict, List


def list_degradations() -> List[Dict[str, Any]]:
    return [
        {
            "id": "bicubic_downsample",
            "title": "Bicubic 下采样",
            "description": "使用双三次插值生成低分辨率图像。",
            "params": {"scale": 2},
        },
        {
            "id": "bilinear_downsample",
            "title": "Bilinear 下采样",
            "description": "使用双线性插值生成低分辨率图像。",
            "params": {"scale": 2},
        },
        {
            "id": "blur_downsample",
            "title": "模糊 + 下采样",
            "description": "先高斯模糊再下采样。",
            "params": {"scale": 2, "sigma": 1.2},
        },
        {
            "id": "noise_downsample",
            "title": "噪声 + 下采样",
            "description": "加入轻微噪声再下采样。",
            "params": {"scale": 2, "sigma": 5},
        },
    ]


def _ensure_uint8(image: np.ndarray) -> np.ndarray:
    if image.dtype == np.uint8:
        return image
    image = np.clip(image, 0, 255)
    return image.astype(np.uint8)


def _safe_scale(scale: Any) -> int:
    try:
        scale = int(scale)
    except Exception:
        scale = 2
    return max(1, scale)


def _downsample(image: np.ndarray, scale: int, interpolation: int) -> np.ndarray:
    h, w = image.shape[:2]
    new_w = max(1, w // scale)
    new_h = max(1, h // scale)
    return cv2.resize(image, (new_w, new_h), interpolation=interpolation)


def _visualize_lr(lr_image: np.ndarray, target_shape) -> np.ndarray:
    h, w = target_shape[:2]
    return cv2.resize(lr_image, (w, h), interpolation=cv2.INTER_NEAREST)


def degrade(clean_image: np.ndarray, degradation: str = "bicubic_downsample", **params) -> Dict[str, Any]:
    """
    标准三阶段实验的第一阶段：测试集生成。

    对超分任务，clean_image 是 HR 图像，degraded 是 LR 图像。
    visualization 是为了前端展示而放大回 HR 尺寸的图像。
    """
    clean_image = _ensure_uint8(clean_image)
    scale = _safe_scale(params.get("scale", 2))

    if degradation == "bicubic_downsample":
        lr = _downsample(clean_image, scale, cv2.INTER_CUBIC)
    elif degradation == "bilinear_downsample":
        lr = _downsample(clean_image, scale, cv2.INTER_LINEAR)
    elif degradation == "blur_downsample":
        sigma = float(params.get("sigma", 1.2))
        blurred = cv2.GaussianBlur(clean_image, (0, 0), sigmaX=sigma, sigmaY=sigma)
        lr = _downsample(blurred, scale, cv2.INTER_CUBIC)
    elif degradation == "noise_downsample":
        sigma = float(params.get("sigma", 5))
        image_f = clean_image.astype(np.float32)
        noise = np.random.normal(0, sigma, clean_image.shape).astype(np.float32)
        noisy = _ensure_uint8(image_f + noise)
        lr = _downsample(noisy, scale, cv2.INTER_CUBIC)
    else:
        raise ValueError(f"未知超分退化方法: {degradation}")

    visualization = _visualize_lr(lr, clean_image.shape)

    return {
        "clean": clean_image,
        "degraded": lr,
        "visualization": visualization,
        "metadata": {
            "degradation": degradation,
            "params": {
                **params,
                "scale": scale,
            },
            "clean_shape": list(clean_image.shape),
            "degraded_shape": list(lr.shape),
        },
    }
