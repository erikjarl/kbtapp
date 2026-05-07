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
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [], sessions: [], assigned: [], submissions: [], messages: [], library: [], relationships: [] }, null, 2));
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
  db.relationships = Array.isArray(db.relationships) ? db.relationships : [];
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

function getLinkedClientUserIds(db, therapistUserId) {
  return new Set(
    (db.relationships || [])
      .filter(item => item?.therapistUserId === therapistUserId && item?.clientUserId)
      .map(item => item.clientUserId)
  );
}

function getRelationshipRecord(db, therapistUserId, clientUserId) {
  return (db.relationships || []).find(item => item.therapistUserId === therapistUserId && item.clientUserId === clientUserId) || null;
}

function createRelationship(db, therapist, client) {
  if (!db.relationships) db.relationships = [];
  const existing = getRelationshipRecord(db, therapist.id, client.id);
  if (existing) return existing;

  const relationship = {
    id: `rel_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    therapistUserId: therapist.id,
    therapistName: therapist.name,
    clientUserId: client.id,
    clientName: client.name,
    createdAt: new Date().toISOString()
  };
  db.relationships.push(relationship);
  return relationship;
}

function getClientPatientId(user) {
  return user?.role === 'client' ? `client_${user.id}` : '';
}

function getTimestamp(value) {
  if (!value) return 0;
  const normalized = String(value).replace(' ', 'T');
  const direct = Date.parse(normalized);
  if (!Number.isNaN(direct)) return direct;
  const match = String(value).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return 0;
  const [, year, month, day, hour, minute, second = '00'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
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
      const includeUnlinked = requestUrl.searchParams.get('includeUnlinked') === '1';
      let users = sessionData.db.users.filter(user => !requestedRole || user.role === requestedRole);

      if (sessionData.user.role === 'therapist' && requestedRole === 'client' && !includeUnlinked) {
        const linkedIds = getLinkedClientUserIds(sessionData.db, sessionData.user.id);
        users = users.filter(user => linkedIds.has(user.id));
      }

      users = users.map(publicUser);
      return sendJson(res, 200, { users });
    }
  }

  if (pathname === '/api/relationships/clients') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Logga in först.' });
    if (sessionData.user.role !== 'therapist') {
      return sendJson(res, 403, { error: 'Endast terapeuter kan hantera patientkopplingar.' });
    }

    if (req.method === 'GET') {
      const linkedIds = getLinkedClientUserIds(sessionData.db, sessionData.user.id);
      const linkedClients = sessionData.db.users
        .filter(user => user.role === 'client' && linkedIds.has(user.id))
        .map(publicUser);
      return sendJson(res, 200, { linkedClients });
    }

    if (req.method === 'POST') {
      const body = await parseBody(req);
      const clientUserId = String(body.clientUserId || '').trim();
      const clientEmail = String(body.clientEmail || '').trim().toLowerCase();
      if (!clientUserId && !clientEmail) {
        return sendJson(res, 400, { error: 'clientUserId eller clientEmail krävs.' });
      }

      const client = sessionData.db.users.find(user => {
        if (user.role !== 'client') return false;
        if (clientUserId) return user.id === clientUserId;
        return user.email === clientEmail;
      });
      if (!client) {
        return sendJson(res, 404, { error: 'Patientkontot hittades inte.' });
      }

      const relationship = createRelationship(sessionData.db, sessionData.user, client);
      writeDb(sessionData.db);
      return sendJson(res, 201, { relationship, client: publicUser(client) });
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

  if (pathname === '/api/dashboard/therapist-summary') {
    const sessionData = getSessionUser(req);
    if (!sessionData) return sendJson(res, 401, { error: 'Logga in först.' });
    if (sessionData.user.role !== 'therapist') {
      return sendJson(res, 403, { error: 'Endast terapeuter kan se dashboardöversikten.' });
    }
    if (req.method !== 'GET') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    const linkedClients = sessionData.db.users
      .filter(user => user.role === 'client' && getLinkedClientUserIds(sessionData.db, sessionData.user.id).has(user.id))
      .map(publicUser);
    const assignedItems = getScopedItems(sessionData.db, sessionData.user, 'assigned');
    const submissions = getScopedItems(sessionData.db, sessionData.user, 'submissions');
    const threads = getScopedItems(sessionData.db, sessionData.user, 'messages');

    const activePatientIds = new Set();
    linkedClients.forEach(client => activePatientIds.add(`client_${client.id}`));
    assignedItems.forEach(item => item?.patientId && activePatientIds.add(item.patientId));
    submissions.forEach(item => item?.patientId && activePatientIds.add(item.patientId));
    threads.forEach(item => item?.patientId && activePatientIds.add(item.patientId));

    const pendingSubmissions = submissions.filter(item => (item?.status || 'inskickad') === 'inskickad');
    const recentAssignments = assignedItems.filter(item => getTimestamp(item?.createdAt) > 0);
    const unreadMessageThreads = threads.filter(thread => {
      const messages = Array.isArray(thread?.messages) ? thread.messages : [];
      const latestClientTs = Math.max(0, ...messages.filter(msg => msg?.author === 'client').map(msg => getTimestamp(msg.timestamp)));
      const latestTherapistTs = Math.max(0, ...messages.filter(msg => msg?.author === 'therapist').map(msg => getTimestamp(msg.timestamp)));
      return latestClientTs > latestTherapistTs;
    });

    const recentActivity = [];
    assignedItems.forEach(item => recentActivity.push({
      type: 'assigned',
      title: 'Material tilldelat',
      detail: `${item.patientName || 'Patient'} · ${item.title || 'Utan titel'}`,
      timestamp: item.createdAt || ''
    }));
    submissions.forEach(item => recentActivity.push({
      type: item.status === 'granskad' ? 'reviewed' : 'submitted',
      title: item.status === 'granskad' ? 'Inskick granskat' : 'Hemuppgift inskickad',
      detail: `${item.patientName || 'Patient'} · ${item.title || 'Utan titel'}`,
      timestamp: item.reviewedAt || item.submittedAt || ''
    }));
    threads.forEach(thread => {
      const messages = Array.isArray(thread?.messages) ? thread.messages : [];
      const latestMessage = [...messages].sort((a, b) => getTimestamp(b.timestamp) - getTimestamp(a.timestamp))[0];
      if (!latestMessage) return;
      recentActivity.push({
        type: latestMessage.author === 'client' ? 'client-message' : 'therapist-message',
        title: latestMessage.author === 'client' ? 'Nytt patientmeddelande' : 'Senaste terapeutsvar',
        detail: `${thread.patientName || 'Patient'} · ${String(latestMessage.text || '').trim() || 'Meddelande'}`,
        timestamp: latestMessage.timestamp || ''
      });
    });

    recentActivity.sort((a, b) => getTimestamp(b.timestamp) - getTimestamp(a.timestamp));

    return sendJson(res, 200, {
      summary: {
        linkedPatients: linkedClients.length,
        activePatients: activePatientIds.size,
        pendingSubmissions: pendingSubmissions.length,
        unreadThreads: unreadMessageThreads.length,
        newEvents: pendingSubmissions.length + unreadMessageThreads.length + recentAssignments.length,
        assignedCount: assignedItems.length,
        recentActivity: recentActivity.slice(0, 3)
      }
    });
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
