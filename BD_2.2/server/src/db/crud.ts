import { pool } from "./pool";

// ---------------------------------------------------------------------------
// CRUD genérico sobre o schema do inventário (modo protótipo).
// Tabelas/colunas vêm das definições de rota (NÃO de input do usuário) e são
// validadas por `ident()`; os VALORES sempre vão parametrizados ($1, $2, ...).
//
// Colunas CHAR(n) (ex.: funcionarios.matricula, equipamentos.patrimonio,
// usuarios.login) voltam preenchidas com espaços à direita — `trimRow()` faz
// rtrim genérico na leitura, sem precisar conhecer o tipo de cada coluna.
// ---------------------------------------------------------------------------

const SCHEMA = '"tabelasInventarioMaquina"';

export type Row = Record<string, unknown>;

function ident(name: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Identificador inválido: ${name}`);
  }
  return `"${name}"`;
}

function qualified(tabela: string): string {
  return `${SCHEMA}.${ident(tabela)}`;
}

function trimRow<T extends Row>(row: T): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === "string" ? v.replace(/\s+$/, "") : v;
  }
  return out as T;
}

function requirePool() {
  if (!pool) throw new Error("Banco de dados não configurado (defina DATABASE_URL ou DB_*)");
  return pool;
}

/** SELECT * FROM <tabela> (com rtrim nas strings). */
export async function listar(tabela: string): Promise<Row[]> {
  const db = requirePool();
  const { rows } = await db.query(`SELECT * FROM ${qualified(tabela)}`);
  return rows.map(trimRow);
}

/** SELECT * FROM <tabela> WHERE <pk> = $1 — retorna a linha ou null. */
export async function obter(tabela: string, pk: string, valor: unknown): Promise<Row | null> {
  const db = requirePool();
  const { rows } = await db.query(
    `SELECT * FROM ${qualified(tabela)} WHERE ${ident(pk)} = $1 LIMIT 1`,
    [valor],
  );
  return rows[0] ? trimRow(rows[0]) : null;
}

/** INSERT a partir das chaves do objeto; retorna a linha criada. */
export async function inserir(tabela: string, dados: Row): Promise<Row> {
  const db = requirePool();
  const cols = Object.keys(dados);
  if (cols.length === 0) throw new Error("Nada para inserir");
  const colsSql = cols.map(ident).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const values = cols.map((c) => dados[c]);
  const { rows } = await db.query(
    `INSERT INTO ${qualified(tabela)} (${colsSql}) VALUES (${placeholders}) RETURNING *`,
    values,
  );
  return trimRow(rows[0]);
}

/** UPDATE <tabela> SET ... WHERE <pk> = valor; retorna a linha ou null. */
export async function atualizar(
  tabela: string,
  pk: string,
  valor: unknown,
  dados: Row,
): Promise<Row | null> {
  const db = requirePool();
  const cols = Object.keys(dados);
  if (cols.length === 0) return obter(tabela, pk, valor);
  const setSql = cols.map((c, i) => `${ident(c)} = $${i + 1}`).join(", ");
  const values = cols.map((c) => dados[c]);
  values.push(valor);
  const { rows } = await db.query(
    `UPDATE ${qualified(tabela)} SET ${setSql} WHERE ${ident(pk)} = $${cols.length + 1} RETURNING *`,
    values,
  );
  return rows[0] ? trimRow(rows[0]) : null;
}

/** DELETE FROM <tabela> WHERE <pk> = $1; retorna true se removeu algo. */
export async function remover(tabela: string, pk: string, valor: unknown): Promise<boolean> {
  const db = requirePool();
  const { rowCount } = await db.query(
    `DELETE FROM ${qualified(tabela)} WHERE ${ident(pk)} = $1`,
    [valor],
  );
  return (rowCount ?? 0) > 0;
}

/** Próximo id para tabelas cujo PK é integer simples (ex.: usuarios). */
export async function proximoId(tabela: string, pk = "id"): Promise<number> {
  const db = requirePool();
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(${ident(pk)}), 0) + 1 AS next FROM ${qualified(tabela)}`,
  );
  return Number(rows[0].next);
}
