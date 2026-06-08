"""Shared ZIP import safety checks and extraction helpers."""

from __future__ import annotations

import shutil
import zipfile
from datetime import datetime
from pathlib import Path, PurePosixPath

from core.utils import get_runtime_paths

MAX_ZIP_BYTES = 50 * 1024 * 1024

WEIGHT_SUFFIXES = {".pth", ".pt", ".onnx", ".pb", ".ckpt", ".safetensors", ".h5"}
BLOCKED_SUFFIXES = {".exe", ".bat", ".cmd", ".ps1", ".sh", ".dll", ".msi"}

WEIGHT_REJECTION_MSG = (
    "当前版本不支持通过 ZIP 导入模型权重，请将权重手动放入 external_model_root "
    "或 methods/{method}/weights/，并确保不提交到 Git。"
)


def assert_zip_size(data: bytes) -> None:
    if len(data) > MAX_ZIP_BYTES:
        raise ValueError(f"ZIP 文件过大（上限 {MAX_ZIP_BYTES // (1024 * 1024)}MB）")
    if len(data) == 0:
        raise ValueError("空 ZIP 文件")


def create_import_temp_dir() -> Path:
    runtime = get_runtime_paths()
    base = runtime["temp"] / "imports"
    base.mkdir(parents=True, exist_ok=True)
    temp_dir = base / f"import_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
    temp_dir.mkdir(parents=True, exist_ok=True)
    return temp_dir


def _is_safe_zip_member(name: str, dest_dir: Path) -> bool:
    target = (dest_dir / name).resolve()
    return str(target).startswith(str(dest_dir.resolve()))


def _check_blocked_member(name: str) -> str | None:
    normalized = name.replace("\\", "/")
    suffix = Path(normalized).suffix.lower()
    parts = PurePosixPath(normalized).parts

    if suffix in BLOCKED_SUFFIXES:
        return f"拒绝可执行脚本: {normalized}"

    if suffix in WEIGHT_SUFFIXES:
        return WEIGHT_REJECTION_MSG

    if "weights" in parts:
        return WEIGHT_REJECTION_MSG

    return None


def validate_and_extract_zip(archive_path: Path, dest_dir: Path) -> None:
    """Validate zip members then extract to dest_dir. Does not execute any code."""
    with zipfile.ZipFile(archive_path, "r") as zf:
        for member in zf.infolist():
            if member.is_dir():
                continue
            name = member.filename.replace("\\", "/")
            if not _is_safe_zip_member(name, dest_dir):
                raise ValueError(f"非法 zip 路径（zip slip）: {name}")
            blocked = _check_blocked_member(name)
            if blocked:
                raise ValueError(blocked)

        zf.extractall(dest_dir)


def cleanup_temp_dir(temp_dir: Path) -> None:
    shutil.rmtree(temp_dir, ignore_errors=True)
