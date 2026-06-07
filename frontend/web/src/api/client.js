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

export async function runModel(domain, node, method, imageFile) {
  const form = new FormData();
  form.append('domain', domain);
  form.append('node', node);
  form.append('method', method);
  form.append('image', imageFile);

  const { data } = await client.post('/api/run', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
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
  return data;
}

export default client;
