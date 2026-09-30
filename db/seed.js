// Script de una sola vez para crear las tablas y cargar los datos
// actuales del catálogo + el usuario administrador en Aiven.
//
// Cómo correrlo (una vez que ya tengas AIVEN_HOST y AIVEN_PASSWORD reales,
// desde tu computadora, dentro de la carpeta del proyecto):
//
//   npm install
//   AIVEN_HOST=xxxx.aivencloud.com AIVEN_PORT=12345 AIVEN_USER=avnadmin \
//   AIVEN_PASSWORD=tu_password_real AIVEN_DATABASE=defaultdb \
//   node db/seed.js
//
// (Las mismas 4-5 variables deben quedar configuradas también en
// Vercel → Project Settings → Environment Variables, para que el
// sitio en producción se conecte igual.)
//
// Este script es seguro para volver a correr: si el admin o los
// productos ya existen, no los duplica.

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const ADMIN_EMAIL = 'PeptidosMexico@administrador.com';
const ADMIN_PASSWORD = 'Peptidoslabs'; // contraseña inicial pedida por el cliente

const PRODUCTS = [
  {
    name: 'Retatrutide', category: 'Control de Peso y Metabolismo', mg_label: '', formula: 'Research Peptide',
    price: 1200, image: 'img/prod-retatrutide.jpg', coa_image: 'img/coa/coa-retatrutide-30mg.jpg',
    variants: [
      { label: '10 mg', price: 1200, img: 'img/prod-retatrutide.jpg', alt: 'Retatrutide 10 mg' },
      { label: '30 mg', price: 2500, img: 'img/prod-retatrutide.jpg', alt: 'Retatrutide 30 mg' },
      { label: '60 mg', price: 4350, img: 'img/prod-retatrutide.jpg', alt: 'Retatrutide 60 mg' },
    ],
    featured: true, featured_order: 1, sort_order: 1,
  },
  {
    name: 'Tirzepatida', category: 'Control de Peso y Metabolismo', mg_label: '', formula: 'Research Peptide',
    price: 1200, image: 'img/prod-tirzepatida.jpg', coa_image: 'img/coa/coa-tirzepatida-30mg.jpg',
    variants: [
      { label: '30 mg', price: 1200, img: 'img/prod-tirzepatida.jpg', alt: 'Tirzepatida 30 mg' },
      { label: '60 mg', price: 2000, img: 'img/prod-tirzepatida.jpg', alt: 'Tirzepatida 60 mg' },
    ],
    featured: false, featured_order: 0, sort_order: 2,
  },
  {
    name: 'Tesamorelin', category: 'Control de Peso y Metabolismo', mg_label: '10 mg', formula: 'Research Peptide',
    price: 2000, image: 'img/prod-tesamorelin.jpg', coa_image: '',
    variants: [], featured: false, featured_order: 0, sort_order: 3,
  },
  {
    name: 'CJC-1295 + Ipamorelin', category: 'Recuperación y deportiva', mg_label: '10 mg',
    formula: 'CJC-1295 (DAC) 5mg + Ipamorelin 5mg',
    price: 1200, image: 'img/prod-cjc1295.jpg', coa_image: '',
    variants: [], featured: true, featured_order: 3, sort_order: 4,
  },
  {
    name: 'MOTS-C', category: 'Energía y estabilidad', mg_label: '10 mg', formula: 'Research Peptide',
    price: 850, image: 'img/prod-motsc.jpg', coa_image: 'img/coa/coa-motsc-10mg.jpg',
    variants: [], featured: true, featured_order: 4, sort_order: 5,
  },
  {
    name: 'BPC-157 + TB-500', category: 'Recuperación y deportiva', mg_label: '10 mg', formula: 'Research Peptide',
    price: 1450, image: 'img/prod-bpc157.jpg', coa_image: 'img/coa/coa-bpc-tb500.jpg',
    variants: [], featured: false, featured_order: 0, sort_order: 6,
  },
  {
    name: 'IGF-1 LR3', category: 'Composición corporal', mg_label: '0.1 mg', formula: 'Research Peptide',
    price: 700, image: 'img/prod-igf1lr3.jpg', coa_image: '',
    variants: [], featured: false, featured_order: 0, sort_order: 7,
  },
  {
    name: 'GHK-Cu', category: 'Regeneración y longevidad', mg_label: '100 mg', formula: 'Research Peptide',
    price: 1200, image: 'img/prod-ghkcu.jpg', coa_image: '',
    variants: [], featured: true, featured_order: 2, sort_order: 8,
  },
  {
    name: 'KLOW', category: 'Recuperación y deportiva', mg_label: '80 mg',
    formula: 'GHK-Cu 50mg + TB-500 10mg + BPC-157 10mg + KPV 10mg',
    price: 2550, image: 'img/prod-klow.jpg', coa_image: 'img/coa/coa-klow-80mg.jpg',
    variants: [], featured: false, featured_order: 0, sort_order: 9,
  },
  {
    name: 'BBG', category: 'Recuperación y deportiva', mg_label: '70 mg',
    formula: 'BPC-157 10mg + GHK-Cu 50mg + TB-500 10mg',
    price: 2200, image: 'img/prod-bbg.jpg', coa_image: '',
    variants: [], featured: false, featured_order: 0, sort_order: 10,
  },
  {
    name: 'Agua Bacteriostática', category: 'Diluyente', mg_label: '', formula: 'Vial multidosis',
    price: 150, image: 'img/prod-bact3.jpg', coa_image: '',
    variants: [
      { label: '3 mL', price: 150, img: 'img/prod-bact3.jpg', alt: 'Agua Bacteriostática 3 mL' },
      { label: '10 mL', price: 280, img: 'img/prod-bact10.jpg', alt: 'Agua Bacteriostática 10 mL' },
    ],
    featured: false, featured_order: 0, sort_order: 11,
  },
  {
    name: 'Kit de Reconstitución', category: 'Otros productos', mg_label: '',
    formula: 'Agua bacteriostática 3mL + 6 jeringas + 6 toallitas con alcohol',
    price: 350, image: 'img/prod-kit-reconstitucion.jpg', coa_image: '',
    variants: [], featured: false, featured_order: 0, sort_order: 12,
  },
  {
    name: 'Jeringas de Insulina', category: 'Otros productos', mg_label: '1 mL (100 U.I.) · 12 piezas',
    formula: 'Aguja ultrafina · Escala hasta 100 U.I.',
    price: 100, image: 'img/prod-jeringas-insulina.jpg', coa_image: '',
    variants: [], featured: false, featured_order: 0, sort_order: 13,
  },
  {
    name: 'Toallas con Alcohol', category: 'Otros productos', mg_label: 'Caja de 100 piezas · Alcohol isopropílico 70%',
    formula: 'Alcohol isopropílico 70% · Toallas individuales',
    price: 220, image: 'img/prod-toallas-alcohol.jpg', coa_image: '',
    variants: [], featured: false, featured_order: 0, sort_order: 14,
  },
];

async function main() {
  const {
    AIVEN_HOST, AIVEN_PORT, AIVEN_DATABASE, AIVEN_USER, AIVEN_PASSWORD, AIVEN_CA_CERT,
  } = process.env;

  if (!AIVEN_HOST || !AIVEN_PASSWORD) {
    console.error('Faltan AIVEN_HOST / AIVEN_PASSWORD como variables de entorno. Revisa los comentarios al inicio de este archivo.');
    process.exit(1);
  }

  const pool = new Pool({
    host: AIVEN_HOST,
    port: AIVEN_PORT ? Number(AIVEN_PORT) : 5432,
    database: AIVEN_DATABASE || 'defaultdb',
    user: AIVEN_USER || 'avnadmin',
    password: AIVEN_PASSWORD,
    ssl: AIVEN_CA_CERT ? { ca: AIVEN_CA_CERT, rejectUnauthorized: true } : { rejectUnauthorized: false },
  });

  console.log('Conectando a Aiven...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('Tablas creadas/verificadas.');

  const existingAdmin = await pool.query('SELECT id FROM admin_users WHERE lower(email) = lower($1)', [ADMIN_EMAIL]);
  if (existingAdmin.rows.length === 0) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await pool.query('INSERT INTO admin_users (email, password_hash) VALUES ($1, $2)', [ADMIN_EMAIL, hash]);
    console.log(`Usuario administrador creado: ${ADMIN_EMAIL}`);
  } else {
    console.log('El usuario administrador ya existía, no se duplicó.');
  }

  const existingProducts = await pool.query('SELECT count(*)::int AS n FROM products');
  if (existingProducts.rows[0].n === 0) {
    for (const p of PRODUCTS) {
      await pool.query(
        `INSERT INTO products
          (name, category, formula, mg_label, price, image, coa_image, variants, featured, featured_order, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [p.name, p.category, p.formula, p.mg_label, p.price, p.image, p.coa_image,
         JSON.stringify(p.variants), p.featured, p.featured_order, p.sort_order]
      );
    }
    console.log(`${PRODUCTS.length} productos cargados.`);
  } else {
    console.log(`Ya había ${existingProducts.rows[0].n} productos en la base de datos, no se volvieron a cargar.`);
  }

  await pool.end();
  console.log('Listo.');
}

main().catch((err) => {
  console.error('Error al inicializar la base de datos:', err);
  process.exit(1);
});
