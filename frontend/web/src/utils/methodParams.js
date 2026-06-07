export function buildDefaultParams(paramsSchema) {
  if (!paramsSchema?.length) return {};
  const defaults = {};
  paramsSchema.forEach((field) => {
    if (field.name && 'default' in field) {
      defaults[field.name] = field.default;
    }
  });
  return defaults;
}

export function formatParamsBrief(params) {
  if (!params || typeof params !== 'object') return '';
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return entries.map(([k, v]) => `${k}=${v}`).join(', ');
}
