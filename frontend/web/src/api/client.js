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

export async function runTimerDemo(payload) {
  const { data } = await client.post('/api/demos/embedded/timer', payload);
  return data;
}

export async function runRoundRobinDemo(payload) {
  const { data } = await client.post('/api/demos/os/round_robin', payload);
  return data;
}

export default client;
