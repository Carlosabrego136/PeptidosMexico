const { query } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const result = await query(
        `SELECT id, name, category, formula, mg_label, price, image, coa_image,
                variants, featured, featured_order, active, sort_order
         FROM products
         WHERE active = true
         ORDER BY sort_order ASC, id ASC`
      );
      res.status(200).json({ products: result.rows });
      return;
    }

    if (req.method === 'POST') {
      const session = requireAdmin(req, res);
      if (!session) return;

      const b = req.body || {};
      if (!b.name) {
        res.status(400).json({ error: 'El nombre del producto es obligatorio' });
        return;
      }

      const result = await query(
        `INSERT INTO products
          (name, category, formula, mg_label, price, image, coa_image, variants, featured, featured_order, sort_order, active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          b.name, b.category || '', b.formula || '', b.mg_label || '',
          b.price || 0, b.image || '', b.coa_image || '',
          JSON.stringify(b.variants || []), !!b.featured, b.featured_order || 0,
          b.sort_order || 0, b.active !== false,
        ]
      );
      res.status(201).json({ product: result.rows[0] });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    if (String(err.message).startsWith('DB_NOT_CONFIGURED')) {
      res.status(503).json({ error: 'La base de datos todavía no está conectada.' });
      return;
    }
    console.error('products index error', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};
