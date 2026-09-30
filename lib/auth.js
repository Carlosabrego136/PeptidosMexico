// Autenticación del panel de administrador (JWT en cookie httpOnly).

const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const COOKIE_NAME = 'mpm_admin_session';
const SESSION_HOURS = 12;

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'DB_NOT_CONFIGURED: falta la variable de entorno ADMIN_JWT_SECRET en Vercel.'
    );
  }
  return secret;
}

function signSession(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: `${SESSION_HOURS}h` });
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (e) {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_HOURS * 60 * 60,
  }));
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  }));
}

function getSessionFromRequest(req) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parsed = cookie.parse(raw);
  const token = parsed[COOKIE_NAME];
  if (!token) return null;
  return verifySessionToken(token);
}

// Middleware helper: corta la ejecución con 401 si no hay sesión válida.
function requireAdmin(req, res) {
  const session = getSessionFromRequest(req);
  if (!session || session.role !== 'admin') {
    res.status(401).json({ error: 'No autorizado' });
    return null;
  }
  return session;
}

module.exports = {
  COOKIE_NAME,
  signSession,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
  requireAdmin,
};
