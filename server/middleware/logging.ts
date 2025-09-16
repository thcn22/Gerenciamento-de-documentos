import fs from 'fs';
import path from 'path';
import { RequestHandler } from 'express';

// Load users map from data/users.json if available (id -> name)
let userMap: Record<string, string> | null = null;
function loadUserMap() {
  if (userMap) return userMap;
  try {
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    if (fs.existsSync(usersPath)) {
      const raw = fs.readFileSync(usersPath, 'utf8');
      const arr = JSON.parse(raw);
      const m: Record<string, string> = {};
      for (const u of arr) {
        if (u && u.id) m[u.id] = u.name || u.email || u.id;
      }
      userMap = m;
      return userMap;
    }
  } catch (e) {
    // ignore
  }
  userMap = {};
  return userMap;
}

function getUserDisplayName(userId: any) {
  if (!userId) return 'Usuário não autenticado';
  try {
    const m = loadUserMap();
    return m[userId] || String(userId);
  } catch {
    return String(userId);
  }
}

function generatePlainSentence(entry: any) {
  // Return a simple Portuguese sentence describing the action, or null if none
  try {
    const name = getUserDisplayName(entry.userId);
    const when = new Date(entry.timestamp).toLocaleString('pt-BR');
    const url = String(entry.url || '').toLowerCase();
    const method = String(entry.method || '').toUpperCase();

    // Create folder
    if (method === 'POST' && url.startsWith('/api/folders')) {
      const folderName = entry.body?.name || entry.body?.title || entry.response?.name || entry.response?.title;
      if (folderName) return `${name} criou a pasta "${folderName}" em ${when}.`;
      return `${name} criou uma nova pasta em ${when}.`;
    }

    // Delete folder
    if (method === 'DELETE' && url.startsWith('/api/folders')) {
      const id = url.split('/').pop();
      return `${name} removeu a pasta (id: ${id}) em ${when}.`;
    }

    // Create file / upload
    if (method === 'POST' && (url.startsWith('/api/files') || url.includes('/create') || url.includes('/documents'))) {
      const fileName = entry.body?.filename || entry.body?.name || entry.response?.name || entry.response?.filename;
      if (fileName) return `${name} criou/enviou o arquivo "${fileName}" em ${when}.`;
      return `${name} fez o upload de um arquivo em ${when}.`;
    }

    // Rename (heuristic)
    if (method === 'PUT' && (url.includes('rename') || url.includes('/name') || url.includes('/title'))) {
      const oldName = entry.body?.oldName || entry.body?.from || null;
      const newName = entry.body?.newName || entry.body?.name || entry.response?.name || null;
      if (newName && oldName) return `${name} renomeou "${oldName}" para "${newName}" em ${when}.`;
      if (newName) return `${name} renomeou um item para "${newName}" em ${when}.`;
    }

    // Move
    if (method === 'POST' && url.includes('/move')) {
      const item = entry.body?.itemName || entry.body?.name || entry.response?.name || 'um item';
      return `${name} moveu ${item} em ${when}.`;
    }

    // Approve / review
    if ((method === 'POST' || method === 'PUT') && url.includes('/approve')) {
      return `${name} aprovou uma submissão em ${when}.`;
    }

    // Fallbacks for create/update/delete generic
    if (method === 'POST') return `${name} realizou uma ação (POST) em ${when} em ${entry.url}.`;
    if (method === 'PUT') return `${name} atualizou algo (PUT) em ${when} em ${entry.url}.`;
    if (method === 'DELETE') return `${name} removeu algo (DELETE) em ${when} em ${entry.url}.`;

    return null;
  } catch (e) {
    return null;
  }
}

const logsDir = path.join(process.cwd(), 'logs');
const logFile = path.join(logsDir, 'actions.log');

// Ensure logs directory exists
try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) { /* ignore */ }

const LOG_ACTIONS = (process.env.LOG_ACTIONS ?? 'true').toLowerCase() !== 'false';
const MAX_LOG_MB = Number(process.env.LOG_MAX_MB || '50');
const MAX_LOG_BYTES = Math.max(0, MAX_LOG_MB) * 1024 * 1024;

function maskSensitive(obj: any) {
  if (!obj || typeof obj !== 'object') return obj;
  const res: any = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    try {
      if (/password|pass|pwd|token|authorization|auth/i.test(k)) {
        res[k] = '***REDACTED***';
      } else if (typeof obj[k] === 'object') {
        res[k] = maskSensitive(obj[k]);
      } else {
        res[k] = obj[k];
      }
    } catch (e) {
      res[k] = '<<unserializable>>';
    }
  }
  return res;
}

export const actionLogger: RequestHandler = (req, res, next) => {
  const start = Date.now();
  const chunks: Buffer[] = [];

  // capture response body by monkey-patching write/end
  const originalWrite = res.write;
  const originalEnd = res.end;

  // @ts-ignore
  res.write = function (chunk: any, ...args: any[]) {
    try { if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); } catch {}
    // @ts-ignore
    return originalWrite.apply(this, [chunk, ...args]);
  };

  // @ts-ignore
  res.end = function (chunk: any, ...args: any[]) {
    try { if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)); } catch {}
    // @ts-ignore
    const result = originalEnd.apply(this, [chunk, ...args]);
    return result;
  };

  const remoteIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString();

  // when response finished, write a detailed log entry
  res.on('finish', () => {
    const duration = Date.now() - start;
    const body = maskSensitive(req.body);
    const headers = maskSensitive(req.headers as any);
    const responseBody = (() => {
      try {
  // Buffer.concat typing can conflict with lib definitions; cast to any to satisfy TS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buf = Buffer.concat(chunks as any);
        const txt = buf.toString('utf8');
        try { return JSON.parse(txt); } catch { return txt; }
      } catch (e) { return '<<unavailable>>'; }
    })();

    const userId = (req as any).user?.userId || (req.headers['x-user-id'] || null);

    if (!LOG_ACTIONS) return;

    // rotate file if exceeds configured size
    try {
      if (MAX_LOG_BYTES > 0 && fs.existsSync(logFile)) {
        const st = fs.statSync(logFile);
        if (st.size >= MAX_LOG_BYTES) {
          const rotated = logFile + '.' + Date.now();
          try { fs.renameSync(logFile, rotated); } catch (e) { /* ignore rotation errors */ }
        }
      }
    } catch (e) { /* ignore */ }

    const entry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      query: req.query,
      body,
      headers,
      userId,
      ip: remoteIp,
      userAgent: req.headers['user-agent'],
      status: res.statusCode,
      durationMs: duration,
      response: responseBody
    };

    function makeHumanReadable(e: any) {
      // Build a readable, friendly text representation
      const lines: string[] = [];
      lines.push('--- AÇÃO DO SISTEMA ---');
      lines.push(`Horário: ${e.timestamp}`);
      lines.push(`Ação: ${e.method} ${e.url}`);
      lines.push(`Usuário: ${e.userId ?? 'Não autenticado'}`);
      lines.push(`IP: ${e.ip ?? 'desconhecido'}`);
      lines.push(`Navegador/Cliente: ${e.userAgent ?? 'desconhecido'}`);
      lines.push(`Tempo de processamento: ${e.durationMs} ms`);
      lines.push(`Status HTTP: ${e.status}`);
      if (e.query && Object.keys(e.query || {}).length) {
        lines.push('Parâmetros (query):');
        lines.push(JSON.stringify(e.query, null, 2));
      }
      if (e.body && Object.keys(e.body || {}).length) {
        lines.push('Dados enviados pelo usuário (body):');
        try { lines.push(JSON.stringify(e.body, null, 2)); } catch { lines.push(String(e.body)); }
      }
      lines.push('Resposta do servidor:');
      try { lines.push(JSON.stringify(e.response, null, 2)); } catch { lines.push(String(e.response)); }
      lines.push('Cabeçalhos principais:');
      const slimHeaders: any = { 'content-type': e.headers['content-type'], authorization: e.headers['authorization'], accept: e.headers['accept'] };
      lines.push(JSON.stringify(maskSensitive(slimHeaders), null, 2));
      lines.push('--- FIM DA AÇÃO ---\n');
      return lines.join('\n');
    }

    const line = JSON.stringify(entry) + '\n';
    // write asynchronously to avoid blocking request handling
    fs.appendFile(logFile, line, { encoding: 'utf8' }, (err) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.error('Failed writing action log', err, entry);
      }
    });

    // Also create a human-readable text log for non-technical users
    try {
      const txt = makeHumanReadable(entry);
      const sentence = generatePlainSentence(entry);
      const txtFile = path.join(logsDir, 'actions.txt');
      const finalTxt = (sentence ? sentence + '\n\n' : '') + txt;
      fs.appendFile(txtFile, finalTxt, { encoding: 'utf8' }, (err) => {
        if (err) {
          // eslint-disable-next-line no-console
          console.error('Failed writing human-readable action log', err);
        }
      });
    } catch (e) {
      // ignore formatting errors
    }
  });

  next();
};

export default actionLogger;
