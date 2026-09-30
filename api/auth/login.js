const bcrypt = require('bcryptjs');
const { query } = require('../../lib/db');
const { signSession, setSessionCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Falta correo o contraseña' });
      return;
    }

    const result = await query(
      'SELECT id, email, password_hash FROM admin_users WHERE lower(email) = lower($1) LIMIT 1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return;
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Correo o contraseña incorrectos' });
      return;
    }

    const token = signSession({ sub: user.id, email: user.email, role: 'admin' });
    setSessionCookie(res, token);
    res.status(200).json({ ok: true, email: user.email });
  } catch (err) {
    if (String(err.message).startsWith('DB_NOT_CONFIGURED')) {
      res.status(503).json({ error: 'La base de datos todavía no está conectada. Avísale a tu desarrollador.' });
      return;
    }
    console.error('login error', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};
