import cv2
from pathlib import Path

WEIGHT_NAME = "ESPCN_x2.pb"
ALGORITHM = "espcn"
DEFAULT_SCALE = 2

_model_cache: dict[str, object] = {}


def _find_weight(weight_name, method_dir=None, external_model_root=None, weight_path=None):
    if weight_path is not None:
        path = Path(weight_path)
        if path.exists():
            return path

    candidates: list[Path] = []
    if method_dir is not None:
        base = Path(method_dir)
        candidates.append(base / "weights" / weight_name)
        candidates.append(base / weight_name)

    if external_model_root is not None:
        root = Path(external_model_root)
        candidates.append(root / weight_name)
        if root.is_dir():
            candidates.extend(root.rglob(weight_name))

    for path in candidates:
        if path.exists():
            return path

    raise FileNotFoundError(f"找不到权重文件: {weight_name}")


def _get_superres(weight_path: Path, algorithm: str, scale: int):
    key = str(weight_path)
    if key not in _model_cache:
        if not hasattr(cv2, "dnn_superres"):
            raise RuntimeError("当前 OpenCV 缺少 dnn_superres，请安装 opencv-contrib-python")
        sr = cv2.dnn_superres.DnnSuperResImpl_create()
        sr.readModel(str(weight_path))
        sr.setModel(algorithm, scale)
        _model_cache[key] = sr
    return _model_cache[key]


def process(image, **kwargs):
    scale = int(kwargs.get("scale", DEFAULT_SCALE))
    weight_path = _find_weight(
        WEIGHT_NAME,
        method_dir=kwargs.get("method_dir"),
        external_model_root=kwargs.get("external_model_root"),
        weight_path=kwargs.get("weight_path"),
    )
    sr = _get_superres(weight_path, ALGORITHM, scale)

    h, w = image.shape[:2]
    small = cv2.resize(
        image,
        (max(1, w // scale), max(1, h // scale)),
        interpolation=cv2.INTER_CUBIC,
    )
    return sr.upsample(small)
