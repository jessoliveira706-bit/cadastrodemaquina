import { Pool } from "pg";

/**
 * Pool de conexão com o PostgreSQL do inventário (schema "tabelasInventarioMaquina").
 *
 * Aceita DATABASE_URL (ex.: postgres://user:pass@db:5432/inventario) ou,
 * na ausência dela, monta a partir das variáveis DB_*.
 */
function buildPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (url) {
    return new Pool({ connectionString: url });
  }

  const host = process.env.DB_HOST;
  if (!host) return null; // sem DB configurado: backend roda só com admin-fallback

  return new Pool({
    host,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

export const pool = buildPool();

export function dbEnabled(): boolean {
  return pool !== null;
}
