export const PIPELINE_INPUT = { kind: 'single_image', media_type: 'image' };

export const KIND_LABELS = {
  single_image: '单张图片',
  image_pair: '双图输入',
  single_video: '单个视频',
  image_sequence: '图像序列',
  match_visualization: '匹配可视化',
  classification_result: '分类结果',
  detection_result: '检测结果',
};

export const INPUT_KIND_OPTIONS = [
  'single_image',
  'image_pair',
  'single_video',
  'image_sequence',
];

export const OUTPUT_KIND_OPTIONS = [
  'single_image',
  'match_visualization',
  'classification_result',
  'detection_result',
  'single_video',
  'image_sequence',
];

export const MEDIA_TYPE_OPTIONS = ['image', 'video', 'data', 'mixed'];

export function kindLabel(kind) {
  return KIND_LABELS[kind] || kind || '-';
}

export function formatSpecShort(spec) {
  if (!spec?.kind) return '-';
  return kindLabel(spec.kind);
}

export function formatIoArrow(inputSpec, outputSpec) {
  return `${formatSpecShort(inputSpec)} → ${formatSpecShort(outputSpec)}`;
}

export function mediaTypesCompatible(outputMedia, inputMedia) {
  if (!outputMedia || !inputMedia) return true;
  if (outputMedia === inputMedia) return true;
  if (outputMedia === 'mixed' || inputMedia === 'mixed') return true;
  return false;
}

export function kindsCompatible(outputKind, inputKind) {
  return outputKind === inputKind;
}

export function getRequiredInputForStep(stepIndex, steps, nodeMethods) {
  if (stepIndex === 0) {
    return { kind: PIPELINE_INPUT.kind, media_type: PIPELINE_INPUT.media_type };
  }
  const prev = steps[stepIndex - 1];
  if (!prev?.method) {
    return { kind: PIPELINE_INPUT.kind, media_type: PIPELINE_INPUT.media_type };
  }
  const prevMethod = (nodeMethods[prev.nodeId] || []).find((m) => m.id === prev.method);
  const out = prevMethod?.output_spec || { kind: PIPELINE_INPUT.kind, media_type: 'image' };
  return { kind: out.kind, media_type: out.media_type || 'image' };
}

export function getMethodTypeCompat(method, requiredInput) {
  if (!method?.input_spec?.kind) {
    return { compatible: false, reason: '缺少 input_spec' };
  }
  const inKind = method.input_spec.kind;
  const reqKind = requiredInput.kind;
  if (!kindsCompatible(reqKind, inKind)) {
    return {
      compatible: false,
      reason: `输入输出类型不兼容：需要 ${kindLabel(reqKind)}，该方法需要 ${kindLabel(inKind)}`,
    };
  }
  const inMedia = method.input_spec.media_type || 'image';
  const reqMedia = requiredInput.media_type || 'image';
  if (!mediaTypesCompatible(reqMedia, inMedia)) {
    return {
      compatible: false,
      reason: `media_type 不兼容：需要 ${reqMedia}，该方法为 ${inMedia}`,
    };
  }
  return { compatible: true, reason: '' };
}

export function getMethodCompat(method, requiredInput) {
  const type = getMethodTypeCompat(method, requiredInput);
  if (!type.compatible) return type;
  if (!method.available) {
    return { compatible: false, reason: method.reason || '方法不可运行' };
  }
  return { compatible: true, reason: '' };
}

export function findFirstCompatibleMethod(methods, requiredInput) {
  return methods.find((m) => getMethodCompat(m, requiredInput).compatible)?.id || '';
}
