-- Esquema de base de datos para el panel de administrador
-- de Mundo Péptidos México. Ejecutar una sola vez contra la
-- base de datos de Aiven (ver db/seed.js para cómo correrlo).

CREATE TABLE IF NOT EXISTS admin_users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT '',
  formula        TEXT NOT NULL DEFAULT '',
  mg_label       TEXT NOT NULL DEFAULT '',
  price          NUMERIC(10,2) NOT NULL DEFAULT 0,
  image          TEXT NOT NULL DEFAULT '',
  coa_image      TEXT NOT NULL DEFAULT '',
  variants       JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured       BOOLEAN NOT NULL DEFAULT false,
  featured_order INTEGER NOT NULL DEFAULT 0,
  active         BOOLEAN NOT NULL DEFAULT true,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_featured ON products (featured, featured_order);
CREATE INDEX IF NOT EXISTS idx_products_active ON products (active);

-- Imágenes subidas desde el panel de administrador (fotos de producto y COA).
-- Se guardan directamente en la base de datos para no depender de ningún
-- servicio externo de almacenamiento; se sirven vía /api/images/:id.
CREATE TABLE IF NOT EXISTS product_images (
  id          SERIAL PRIMARY KEY,
  mime_type   TEXT NOT NULL,
  width       INTEGER,
  height      INTEGER,
  data        BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
