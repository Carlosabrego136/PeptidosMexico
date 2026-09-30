// Sirve una imagen subida desde el panel (tabla product_images).
// Pública (los visitantes del sitio necesitan verla), solo lectura.

const { query } = require('../../lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  const { id } = req.query;

  try {
    const result = await query(
      'SELECT mime_type, data FROM product_images WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).send('Imagen no encontrada');
      return;
    }

    const row = result.rows[0];
    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(row.data);
  } catch (err) {
    if (String(err.message).startsWith('DB_NOT_CONFIGURED')) {
      res.status(503).send('La base de datos todavía no está conectada.');
      return;
    }
    console.error('image serve error', err);
    res.status(500).send('Error del servidor');
  }
};
