const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DB_PATH = path.join(DATA_DIR, 'auth-db.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function ensureDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], sessions: [], assigned: [], submissions: [], messages: [], library: [] }, null, 2));
  }
}

function readDb() {
  ensureDb();
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  db.users = Array.isArray(db.users) ? db.users : [];
  db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
  db.assigned = Array.isArray(db.assigned) ? db.assigned : [];
  db.submissions = Array.isArray(db.submissions) ? db.submissions : [];
  db.messages = Array.isArray(db.messages) ? db.messages : [];
  db.library = Array.isArray(db.library) ? db.library : [];
  return db;
}

function writeDb(db) {
  ensureDb();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(user.passwordHash, 'hex'));
}

function createSession(db, user) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions = db.sessions.filter(session => session.userId !== user.id);
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date().toISOString()
  });
  writeDb(db);
  return token;
}

function getSessionUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return null;
  const db = readDb();
  const session = db.sessions.find(item => item.token === token);
  if (!session) return null;
  const user = db.users.find(item => item.id === session.userId);
  if (!user) return null;
  return {
    db,
    token,
    user
  };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };
}

function getClientPatientId(user) {
  return user?.role === 'client' ? `client_${user.id}` : '';
}

function itemMatchesUserScope(item, user, collectionName) {
  if (!item || !user) return false;

  if (collectionName === 'library') {
    return user.role === 'therapist' && item.therapistUserId === user.id;
  }

  if (collectionName === 'messages') {
    if (user.role === 'therapist') {
      return item.therapistUserId === user.id;
    }
    return item.patientUserId === user.id || item.patientId === getClientPatientId(user);
  }

  if (user.role === 'therapist') {
    return item.therapistUserId === user.id;
  }

  return item.patientUserId === user.id || item.patientId === getClientPatientId(user);
}

function getScopedItems(db, user, collectionName) {
  const items = Array.isArray(db[collectionName]) ? db[collectionName] : [];
  return items.filter(item => itemMatchesUserScope(item, user, collectionName));
}

function mergeScopedItems(db, user, collectionName, scopedItems) {
  const currentItems = Array.isArray(db[collectionName]) ? db[collectionName] : [];
  const preservedItems = currentItems.filter(item => !itemMatchesUserScope(item, user, collectionName));
  db[collectionName] = [...preservedItems, ...scopedItems];
}

async function handleApi(req, res, pathname) {
  if (req.method === 'POST' && pathname === '/api/auth/register') {
    const body = await parseBody(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = body.role === 'therapist' ? 'therapist' : body.role === 'client' ? 'client' : '';

    if (!name || !email || !password || !role) {
      return sendJson(res, 400, { error: 'Fyll i namn, e-post, lösenord och roll.' });
    }
    if (password.length < 6) {
      return sendJson(res, 400, { error: 'Lösenordet behöver vara minst 6 tecken.' });
    }

    const db = readDb();
    const existing = db.users.find(user => user.email === email && user.role === role);
    if (existing) {
      return sendJson(res, 409, { error: 'Det finns redan ett konto med den rollen och e-posten.' });
    }

    const passwordData = hashPassword(password);
    const user = {
      id: `user_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name,
      email,
      role,
      passwordSalt: passwordData.salt,
      passwordHash: passwordData.hash,
      createdAt: new Date().toISOString()
    };
    db.users.push(user);
    const token = createSession(db, user);
    return sendJson(res, 201, { token, user: publicUser(user) });
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    const body = await parseBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const role = body.role === 'therapist' ? 'therapist' : body.role === 'client' ? 'client' : '';
    const db = readDb();
    const user = db.users.find(item => item.email === email && item.role === role);
    if (!user || !verifyPassword(password, user)) {
      return sendJson(res, 401, { error: 'Fel e-post, lösenord eller roll.' });
    }
    const token = createSession(db, user);
    return sendJson(res, 200, { token, user: publicUser(user) });
  }

  if (req.method === 'GET' && pathname === '/api/auth/session') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Ingen aktiv session.' });
    return sendJson(res, 200, { user: publicUser(sessionData.user) });
  }

  if (req.method === 'POST' && pathname === '/api/auth/logout') {
    const sessionData = getSessionUser(req);
    if (sessionData) {
      sessionData.db.sessions = sessionData.db.sessions.filter(item => item.token !== sessionData.token);
      writeDb(sessionData.db);
    }
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/users') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Logga in först.' });

    if (req.method === 'GET') {
      const requestUrl = new URL(req.url, `http://${req.headers.host}`);
      const requestedRole = requestUrl.searchParams.get('role');
      const users = sessionData.db.users
        .filter(user => !requestedRole || user.role === requestedRole)
        .map(publicUser);
      return sendJson(res, 200, { users });
    }
  }

  if (pathname === '/api/data/assigned') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Logga in först.' });

    if (req.method === 'GET') {
      return sendJson(res, 200, { items: getScopedItems(sessionData.db, sessionData.user, 'assigned') });
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!Array.isArray(body.items)) {
        return sendJson(res, 400, { error: 'Assigned-data måste vara en array.' });
      }
      mergeScopedItems(sessionData.db, sessionData.user, 'assigned', body.items);
      writeDb(sessionData.db);
      return sendJson(res, 200, { ok: true, items: getScopedItems(sessionData.db, sessionData.user, 'assigned') });
    }
  }

  if (pathname === '/api/data/submissions') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Logga in först.' });

    if (req.method === 'GET') {
      return sendJson(res, 200, { items: getScopedItems(sessionData.db, sessionData.user, 'submissions') });
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!Array.isArray(body.items)) {
        return sendJson(res, 400, { error: 'Submission-data måste vara en array.' });
      }
      mergeScopedItems(sessionData.db, sessionData.user, 'submissions', body.items);
      writeDb(sessionData.db);
      return sendJson(res, 200, { ok: true, items: getScopedItems(sessionData.db, sessionData.user, 'submissions') });
    }
  }

  if (pathname === '/api/data/messages') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Logga in först.' });

    if (req.method === 'GET') {
      return sendJson(res, 200, { items: getScopedItems(sessionData.db, sessionData.user, 'messages') });
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!Array.isArray(body.items)) {
        return sendJson(res, 400, { error: 'Meddelandedata måste vara en array.' });
      }
      mergeScopedItems(sessionData.db, sessionData.user, 'messages', body.items);
      writeDb(sessionData.db);
      return sendJson(res, 200, { ok: true, items: getScopedItems(sessionData.db, sessionData.user, 'messages') });
    }
  }

  if (pathname === '/api/data/library') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Logga in först.' });
    if (sessionData.user.role !== 'therapist') {
      return sendJson(res, 403, { error: 'Endast terapeuter kan hantera materialbiblioteket.' });
    }

    if (req.method === 'GET') {
      return sendJson(res, 200, { items: getScopedItems(sessionData.db, sessionData.user, 'library') });
    }

    if (req.method === 'PUT') {
      const body = await parseBody(req);
      if (!Array.isArray(body.items)) {
        return sendJson(res, 400, { error: 'Materialbiblioteket måste vara en array.' });
      }
      mergeScopedItems(sessionData.db, sessionData.user, 'library', body.items);
      writeDb(sessionData.db);
      return sendJson(res, 200, { ok: true, items: getScopedItems(sessionData.db, sessionData.user, 'library') });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
}

function serveStatic(res, pathname) {
  const relativePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.join(ROOT, path.normalize(relativePath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }
    const mimeType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname);
      return;
    }
    serveStatic(res, url.pathname);
  } catch (error) {
    sendJson(res, 500, { error: 'Serverfel', detail: error.message });
  }
});

server.listen(PORT, () => {
  ensureDb();
  console.log(`KBTApp server running at http://localhost:${PORT}`);
});
