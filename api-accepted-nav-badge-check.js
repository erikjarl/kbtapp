const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = 4391;
const ROOT = __dirname;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kbtapp-accepted-check-'));
const env = { ...process.env, PORT: String(PORT), DATA_DIR: tempDir };

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(url, { method = 'GET', token = '', body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`${method} ${url} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const server = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env,
    stdio: 'ignore'
  });

  try {
    await wait(900);

    const therapist = await request(`http://127.0.0.1:${PORT}/api/auth/register`, {
      method: 'POST',
      body: { name: 'Thera Test', email: 'thera@example.com', password: 'secret12', role: 'therapist' }
    });
    const client = await request(`http://127.0.0.1:${PORT}/api/auth/register`, {
      method: 'POST',
      body: { name: 'Pat Test', email: 'pat@example.com', password: 'secret12', role: 'client' }
    });

    const createRequest = await request(`http://127.0.0.1:${PORT}/api/relationships/clients`, {
      method: 'POST',
      token: therapist.token,
      body: { clientEmail: 'pat@example.com' }
    });

    await request(`http://127.0.0.1:${PORT}/api/relationships/respond`, {
      method: 'POST',
      token: client.token,
      body: { relationshipId: createRequest.relationship.id, action: 'accept' }
    });

    const summaryBefore = await request(`http://127.0.0.1:${PORT}/api/dashboard/therapist-summary`, {
      token: therapist.token
    });

    const acknowledgeAll = await request(`http://127.0.0.1:${PORT}/api/relationships/acknowledge-accepted`, {
      method: 'POST',
      token: therapist.token,
      body: {}
    });

    const summaryAfter = await request(`http://127.0.0.1:${PORT}/api/dashboard/therapist-summary`, {
      token: therapist.token
    });

    console.log(JSON.stringify({
      summaryBefore: summaryBefore.summary,
      acknowledgeAll,
      summaryAfter: summaryAfter.summary
    }, null, 2));
  } finally {
    server.kill('SIGTERM');
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error.stack || String(error));
  process.exit(1);
});
