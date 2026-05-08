const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4370';
const therapistEmail = `therapist_${Date.now()}@example.com`;
const clientEmail = `client_${Date.now()}@example.com`;
const password = 'hemligt123';

async function req(path, method = 'GET', token = '', body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status} ${data.error || ''}`.trim());
  return data;
}

(async () => {
  const therapist = await req('/api/auth/register', 'POST', '', { name: 'Therapist Test', email: therapistEmail, password, role: 'therapist' });
  const client = await req('/api/auth/register', 'POST', '', { name: 'Client Test', email: clientEmail, password, role: 'client' });

  const linkResult = await req('/api/relationships/clients', 'POST', therapist.token, { clientEmail });
  if (!linkResult.requestPending) throw new Error('expected pending relationship request');

  const therapistLinkedBefore = await req('/api/relationships/clients', 'GET', therapist.token);
  if (therapistLinkedBefore.linkedClients.length !== 0) throw new Error('therapist should have 0 linked clients before acceptance');

  const clientRequests = await req('/api/relationships/requests', 'GET', client.token);
  if (clientRequests.requests.length !== 1) throw new Error('client should have 1 pending request');

  await req('/api/relationships/respond', 'POST', client.token, { relationshipId: clientRequests.requests[0].id, action: 'accept' });

  const therapistLinkedAfter = await req('/api/relationships/clients', 'GET', therapist.token);
  if (therapistLinkedAfter.linkedClients.length !== 1) throw new Error('therapist should have 1 linked client after acceptance');

  const clientRequestsAfter = await req('/api/relationships/requests', 'GET', client.token);
  if (clientRequestsAfter.requests.length !== 0) throw new Error('client should have 0 pending requests after acceptance');

  console.log('api relationship request flow ok');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
