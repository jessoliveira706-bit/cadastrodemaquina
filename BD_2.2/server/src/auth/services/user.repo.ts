import { pool } from "../../db/pool";

export interface UsuarioRow {
  id: number;
  login: string;
  senhaHash: string;
  tipoUsuario: string | boolean;
  matricula: string;
  nome: string;
}

/**
 * Busca um usuário pelo login, já com o nome do funcionário associado.
 *
 * As colunas usuarios.login / senhaHash e funcionarios.matricula são CHAR(n)
 * (preenchidas com espaços à direita), por isso usamos TRIM — essencial para
 * o bcrypt.compare funcionar com o hash armazenado.
 */
export async function findByLogin(login: string): Promise<UsuarioRow | null> {
  if (!pool) return null;

  const sql = `
    SELECT
      u.id,
      TRIM(u.login)                              AS login,
      TRIM(u."senhaHash")                        AS "senhaHash",
      u."tipoUsuario"                            AS "tipoUsuario",
      TRIM(u.funcionarios_matricula)             AS matricula,
      COALESCE(NULLIF(TRIM(f."nomeCompleto"), ''), TRIM(f.nome)) AS nome
    FROM "tabelasInventarioMaquina".usuarios u
    LEFT JOIN "tabelasInventarioMaquina".funcionarios f
      ON f.matricula = u.funcionarios_matricula
    WHERE TRIM(u.login) = $1
    LIMIT 1
  `;

  const { rows } = await pool.query<UsuarioRow>(sql, [login]);
  return rows[0] ?? null;
}
