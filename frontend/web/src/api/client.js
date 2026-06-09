import axios from 'axios';

const client = axios.create({
  baseURL: '',
  timeout: 60000,
});

export async function fetchDomains() {
  const { data } = await client.get('/api/domains');
  return data;
}

export async function fetchDomain(domainId) {
  const { data } = await client.get(`/api/domains/${domainId}`);
  return data;
}

export async function fetchNode(domainId, nodeId) {
  const { data } = await client.get(`/api/nodes/${domainId}/${nodeId}`);
  return data;
}

export async function runModel(domain, node, method, imageFile, params = {}) {
  const form = new FormData();
  form.append('domain', domain);
  form.append('node', node);
  form.append('method', method);
  form.append('image', imageFile);
  form.append('params', JSON.stringify(params || {}));

  const { data } = await client.post('/api/run', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function runStandardExperiment({
  image,
  domain,
  node,
  degradation,
  method,
  degradationParams = {},
  methodParams = {},
  metrics = [],
}) {
  const form = new FormData();
  form.append('image', image);
  form.append('domain', domain);
  form.append('node', node);
  form.append('degradation', degradation);
  form.append('method', method);
  form.append('degradation_params', JSON.stringify(degradationParams));
  form.append('method_params', JSON.stringify(methodParams));
  form.append('metrics', JSON.stringify(metrics));

  const { data } = await client.post('/api/experiments/run-standard', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
}

export async function runFeatureMatching(domain, node, method, imageA, imageB, params = {}) {
  const form = new FormData();
  form.append('domain', domain);
  form.append('node', node);
  form.append('method', method);
  form.append('image_a', imageA);
  form.append('image_b', imageB);
  form.append('params', JSON.stringify(params || {}));

  const { data } = await client.post('/api/feature-matching/run', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
}

export async function runPipeline(imageFile, pipeline) {
  const form = new FormData();
  form.append('image', imageFile);
  form.append('pipeline', JSON.stringify(pipeline));

  const { data } = await client.post('/api/run-pipeline', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 180000,
  });
  return data;
}

export async function compareMethods(domain, node, methods, imageFile) {
  const form = new FormData();
  form.append('domain', domain);
  form.append('node', node);
  form.append('methods', JSON.stringify(methods));
  form.append('image', imageFile);

  const { data } = await client.post('/api/compare-methods', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 300000,
  });
  return data;
}

export async function runTimerDemo(payload) {
  const { data } = await client.post('/api/demos/embedded/timer', payload);
  return data;
}

export async function runRoundRobinDemo(payload) {
  const { data } = await client.post('/api/demos/os/round_robin', payload);
  return data;
}

export async function fetchExperiments(domain, node, method) {
  const params = new URLSearchParams();
  if (domain) params.set('domain', domain);
  if (node) params.set('node', node);
  if (method) params.set('method', method);
  const qs = params.toString();
  const { data } = await client.get(`/api/experiments${qs ? `?${qs}` : ''}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchManagerNodes(domain) {
  const { data } = await client.get('/api/node-manager/nodes', { params: { domain } });
  return data;
}

export async function createNodeTemplate(payload) {
  const { data } = await client.post('/api/node-manager/create-template', payload);
  return data;
}

export async function createMethodTemplate(payload) {
  const { data } = await client.post('/api/node-manager/create-method-template', payload);
  return data;
}

export async function deleteNode(payload) {
  const { data } = await client.delete('/api/node-manager/node', { data: payload });
  return data;
}

export async function deleteMethod(payload) {
  const { data } = await client.delete('/api/node-manager/method', { data: payload });
  return data;
}

export async function exportNode(payload) {
  const { data } = await client.post('/api/node-manager/export', payload);
  return data;
}

export async function importNode(file, targetDomain, overwrite) {
  const form = new FormData();
  form.append('file', file);
  form.append('target_domain', targetDomain);
  form.append('overwrite', overwrite ? 'true' : 'false');
  const { data } = await client.post('/api/node-manager/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
}

export async function importNodeTemplate(file, targetDomain, overwrite) {
  const form = new FormData();
  form.append('file', file);
  form.append('target_domain', targetDomain);
  form.append('overwrite', overwrite ? 'true' : 'false');
  const { data } = await client.post('/api/node-manager/import-node-template', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
}

export async function importMethodTemplate(file, targetDomain, targetNodeId, overwrite) {
  const form = new FormData();
  form.append('file', file);
  form.append('target_domain', targetDomain);
  form.append('target_node_id', targetNodeId);
  form.append('overwrite', overwrite ? 'true' : 'false');
  const { data } = await client.post('/api/node-manager/import-method-template', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
}

export async function fetchProfessionalNodes(domain) {
  const { data } = await client.get('/api/create/professional-nodes', { params: { domain } });
  return data;
}

export async function fetchParentPathPresets() {
  const { data } = await client.get('/api/create/parent-path-presets');
  return data;
}

export async function createProfessionalNode(payload) {
  const { data } = await client.post('/api/create/create-professional-node', payload);
  return data;
}

export async function exportProfessionalNode(payload) {
  const { data } = await client.post('/api/create/export-professional-node', payload);
  return data;
}

export async function importProfessionalNode(file, overwrite) {
  const form = new FormData();
  form.append('file', file);
  form.append('overwrite', overwrite ? 'true' : 'false');
  const { data } = await client.post('/api/create/import-professional-node', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
}

export async function addMethodToNode(formData) {
  const { data } = await client.post('/api/create/add-method', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data;
}

export default client;
