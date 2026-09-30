const { query } = require('../../lib/db');
const { requireAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  const { id } = req.query;

  try {
    if (req.method === 'PUT') {
      const session = requireAdmin(req, res);
      if (!session) return;

      const b = req.body || {};
      const result = await query(
        `UPDATE products SET
           name = $1, category = $2, formula = $3, mg_label = $4, price = $5,
           image = $6, coa_image = $7, variants = $8, featured = $9,
           featured_order = $10, sort_order = $11, active = $12, updated_at = now()
         WHERE id = $13
         RETURNING *`,
        [
          b.name, b.category || '', b.formula || '', b.mg_label || '', b.price || 0,
          b.image || '', b.coa_image || '', JSON.stringify(b.variants || []),
          !!b.featured, b.featured_order || 0, b.sort_order || 0, b.active !== false,
          id,
        ]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
      }
      res.status(200).json({ product: result.rows[0] });
      return;
    }

    if (req.method === 'DELETE') {
      const session = requireAdmin(req, res);
      if (!session) return;

      // Borrado suave: se marca inactivo en vez de eliminarlo, así nunca
      // se pierde el historial ni se rompe nada si se necesita recuperar.
      const result = await query(
        `UPDATE products SET active = false, updated_at = now() WHERE id = $1 RETURNING id`,
        [id]
      );
      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
      }
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Método no permitido' });
  } catch (err) {
    if (String(err.message).startsWith('DB_NOT_CONFIGURED')) {
      res.status(503).json({ error: 'La base de datos todavía no está conectada.' });
      return;
    }
    console.error('products [id] error', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
};
