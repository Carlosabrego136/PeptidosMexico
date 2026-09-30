// Subida real de imágenes (fotos de producto / COA) desde el panel de
// administrador. Se guardan en la base de datos (tabla product_images)
// para no depender de ningún servicio externo de almacenamiento.

const { query } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2.5 * 1024 * 1024; // 2.5 MB del archivo original (deja margen para el límite de Vercel)

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const session = requireAdmin(req, res);
  if (!session) return;

  try {
    const { mime_type, data_base64, width, height } = req.body || {};

    if (!mime_type || !ALLOWED_TYPES.includes(mime_type)) {
      res.status(400).json({ error: 'Formato no permitido. Usa JPG, PNG o WEBP.' });
      return;
    }
    if (!data_base64) {
      res.status(400).json({ error: 'No se recibió ninguna imagen.' });
      return;
    }

    const buffer = Buffer.from(data_base64, 'base64');
    if (buffer.length > MAX_BYTES) {
      res.status(400).json({ error: 'La imagen pesa demasiado (máximo 2.5 MB). Comprímela e intenta de nuevo.' });
      return;
    }

    const result = await query(
      `INSERT INTO product_images (mime_type, width, height, data) VALUES ($1,$2,$3,$4) RETURNING id`,
      [mime_type, width || null, height || null, buffer]
    );

    const id = result.rows[0].id;
    res.status(201).json({ id, url: `/api/images/${id}` });
  } catch (err) {
    if (String(err.message).startsWith('DB_NOT_CONFIGURED')) {
      res.status(503).json({ error: 'La base de datos todavía no está conectada.' });
      return;
    }
    console.error('upload error', err);
    res.status(500).json({ error: 'Error del servidor al subir la imagen.' });
  }
};
