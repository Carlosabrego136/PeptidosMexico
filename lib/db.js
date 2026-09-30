// Conexión a la base de datos Aiven (PostgreSQL).
//
// Todas las credenciales vienen de variables de entorno de Vercel
// (Project Settings → Environment Variables). NO se escriben aquí a mano.
//
// Variables que hay que configurar en Vercel:
//   AIVEN_HOST      -> host de tu servicio Aiven (ej: mundo-peptidos-xxxx.aivencloud.com)
//   AIVEN_PORT      -> puerto (Aiven casi siempre usa 5432 o algo similar, ej: 12345)
//   AIVEN_DATABASE  -> nombre de la base de datos (Aiven usa "defaultdb" por defecto)
//   AIVEN_USER      -> usuario (Aiven usa "avnadmin" por defecto)
//   AIVEN_PASSWORD  -> contraseña del servicio (PENDIENTE - la da Aiven al crear el servicio)
//
// Aiven requiere conexión SSL. Si no tienes el certificado CA, dejamos
// rejectUnauthorized:false para que conecte igual (es lo que se usa normalmente
// en proyectos chicos/medianos); si más adelante quieres subir el nivel de
// seguridad, se puede pasar el certificado CA de Aiven en AIVEN_CA_CERT.

const { Pool } = require('pg');

let pool;

function getPool() {
  if (pool) return pool;

  const {
    AIVEN_HOST,
    AIVEN_PORT,
    AIVEN_DATABASE,
    AIVEN_USER,
    AIVEN_PASSWORD,
    AIVEN_CA_CERT,
  } = process.env;

  if (!AIVEN_HOST || !AIVEN_PASSWORD) {
    throw new Error(
      'DB_NOT_CONFIGURED: faltan variables de entorno de Aiven (AIVEN_HOST / AIVEN_PASSWORD). ' +
      'Configúralas en Vercel → Project Settings → Environment Variables.'
    );
  }

  pool = new Pool({
    host: AIVEN_HOST,
    port: AIVEN_PORT ? Number(AIVEN_PORT) : 5432,
    database: AIVEN_DATABASE || 'defaultdb',
    user: AIVEN_USER || 'avnadmin',
    password: AIVEN_PASSWORD,
    ssl: AIVEN_CA_CERT
      ? { ca: AIVEN_CA_CERT, rejectUnauthorized: true }
      : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000,
  });

  return pool;
}

async function query(text, params) {
  const p = getPool();
  return p.query(text, params);
}

module.exports = { getPool, query };
