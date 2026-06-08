"""Method input/output type specifications for type-safe pipelines."""

from __future__ import annotations

from typing import Any

SUPPORTED_KINDS = frozenset({
    "single_image",
    "image_pair",
    "single_video",
    "image_sequence",
    "match_visualization",
    "classification_result",
    "detection_result",
})

SUPPORTED_MEDIA_TYPES = frozenset({"image", "video", "data", "mixed"})

DEFAULT_PIPELINE_INPUT_KIND = "single_image"
DEFAULT_PIPELINE_INPUT_MEDIA = "image"

KIND_LABELS_ZH: dict[str, str] = {
    "single_image": "单张图片",
    "image_pair": "双图输入",
    "single_video": "单个视频",
    "image_sequence": "图像序列",
    "match_visualization": "匹配可视化",
    "classification_result": "分类结果",
    "detection_result": "检测结果",
}

NODE_DEFAULT_IO: dict[str, tuple[dict[str, Any], dict[str, Any]]] = {
    "denoise": (
        {"kind": "single_image", "count": 1, "media_type": "image", "description": "输入单张图像"},
        {"kind": "single_image", "count": 1, "media_type": "image", "description": "输出单张图像"},
    ),
    "super_resolution": (
        {"kind": "single_image", "count": 1, "media_type": "image", "description": "输入单张图像"},
        {"kind": "single_image", "count": 1, "media_type": "image", "description": "输出单张图像"},
    ),
    "feature_matching": (
        {
            "kind": "image_pair",
            "count": 2,
            "media_type": "image",
            "description": "输入两张待匹配图像",
        },
        {
            "kind": "match_visualization",
            "count": 1,
            "media_type": "image",
            "description": "输出带匹配连线的可视化图像和匹配指标",
        },
    ),
    "image_classification": (
        {"kind": "single_image", "count": 1, "media_type": "image", "description": "输入单张图像"},
        {
            "kind": "classification_result",
            "count": 1,
            "media_type": "data",
            "description": "输出分类结果",
        },
    ),
    "object_detection": (
        {"kind": "single_image", "count": 1, "media_type": "image", "description": "输入单张图像"},
        {
            "kind": "detection_result",
            "count": 1,
            "media_type": "data",
            "description": "输出检测结果",
        },
    ),
}


def build_spec(
    kind: str,
    count: int = 1,
    media_type: str = "image",
    description: str = "",
) -> dict[str, Any]:
    return {
        "kind": kind,
        "count": int(count),
        "media_type": media_type,
        "description": description,
    }


def infer_default_specs(node_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    if node_id in NODE_DEFAULT_IO:
        inp, out = NODE_DEFAULT_IO[node_id]
        return dict(inp), dict(out)
    return (
        build_spec("single_image", 1, "image", "输入单张图像"),
        build_spec("single_image", 1, "image", "输出单张图像"),
    )


def normalize_spec(raw: dict[str, Any] | None, node_id: str, *, is_input: bool) -> tuple[dict[str, Any], bool]:
    """Return (spec, was_inferred)."""
    if raw and isinstance(raw, dict) and raw.get("kind"):
        spec = {
            "kind": raw.get("kind", "single_image"),
            "count": int(raw.get("count", 1)),
            "media_type": raw.get("media_type", "image"),
            "description": raw.get("description", ""),
        }
        return spec, False

    default_in, default_out = infer_default_specs(node_id)
    return (default_in if is_input else default_out), True


def get_method_io_specs(meta: dict[str, Any], node_id: str) -> tuple[dict[str, Any], dict[str, Any], bool]:
    input_spec, in_inferred = normalize_spec(meta.get("input_spec"), node_id, is_input=True)
    output_spec, out_inferred = normalize_spec(meta.get("output_spec"), node_id, is_input=False)
    return input_spec, output_spec, (in_inferred or out_inferred)


def media_types_compatible(output_media: str, input_media: str) -> bool:
    if output_media == input_media:
        return True
    if output_media == "mixed" or input_media == "mixed":
        return True
    return False


def kinds_compatible_for_pipeline(output_kind: str, input_kind: str) -> bool:
    return output_kind == input_kind


def validate_spec_fields(spec: dict[str, Any], label: str) -> list[str]:
    warnings: list[str] = []
    if not spec:
        warnings.append(f"{label} 缺失")
        return warnings
    for key in ("kind", "count", "media_type"):
        if spec.get(key) is None or spec.get(key) == "":
            warnings.append(f"{label} 缺少字段: {key}")
    kind = spec.get("kind", "")
    if kind and kind not in SUPPORTED_KINDS:
        warnings.append(f"{label}.kind={kind!r} 不在支持列表中")
    media = spec.get("media_type", "")
    if media and media not in SUPPORTED_MEDIA_TYPES:
        warnings.append(f"{label}.media_type={media!r} 不在支持列表中")
    return warnings


def validate_method_io_chain(
    prev_output: dict[str, Any] | None,
    curr_input: dict[str, Any],
    *,
    step_index: int,
) -> str | None:
    if prev_output is None:
        return None
    out_kind = prev_output.get("kind", "")
    in_kind = curr_input.get("kind", "")
    if not kinds_compatible_for_pipeline(out_kind, in_kind):
        return (
            f"Step {step_index} 需要 {in_kind}，但 Step {step_index - 1} 输出 {out_kind}"
        )
    out_media = prev_output.get("media_type", "image")
    in_media = curr_input.get("media_type", "image")
    if not media_types_compatible(out_media, in_media):
        return (
            f"Step {step_index} media_type 不兼容：上一步 {out_media}，当前 {in_media}"
        )
    return None


class PipelineTypeError(ValueError):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("Pipeline 类型不兼容: " + "; ".join(errors))


def validate_pipeline_steps(
    steps: list[dict[str, Any]],
    *,
    pipeline_input_kind: str = DEFAULT_PIPELINE_INPUT_KIND,
    pipeline_input_media: str = DEFAULT_PIPELINE_INPUT_MEDIA,
    domain: str = "cv",
) -> None:
    from core.model_checker import check_method

    if not steps:
        raise ValueError("Pipeline steps cannot be empty")

    errors: list[str] = []
    sorted_steps = sorted(steps, key=lambda s: int(s.get("index", 0)))
    prev_output: dict[str, Any] | None = None

    for i, step in enumerate(sorted_steps):
        step_index = int(step.get("index", i + 1))
        step_domain = step.get("domain", domain)
        node_id = step.get("node", "")
        method_id = step.get("method", "")

        if not node_id or not method_id:
            errors.append(f"Step {step_index} 缺少 node 或 method")
            continue

        status = check_method(step_domain, node_id, method_id)
        input_spec = status.get("input_spec") or {}
        output_spec = status.get("output_spec") or {}

        if i == 0:
            in_kind = input_spec.get("kind", "")
            in_media = input_spec.get("media_type", "image")
            if in_kind != pipeline_input_kind:
                errors.append(
                    f"Step 1 需要 {in_kind}，但 Pipeline 输入为 {pipeline_input_kind}"
                )
            elif not media_types_compatible(pipeline_input_media, in_media):
                errors.append(
                    f"Step 1 media_type 与 Pipeline 输入不兼容：{pipeline_input_media} vs {in_media}"
                )
        else:
            err = validate_method_io_chain(prev_output, input_spec, step_index=step_index)
            if err:
                errors.append(err)

        prev_output = output_spec

    if errors:
        raise PipelineTypeError(errors)
