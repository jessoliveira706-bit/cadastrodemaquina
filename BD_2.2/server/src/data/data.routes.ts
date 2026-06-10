import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import * as crud from "../db/crud";
import { pool } from "../db/pool";

// ---------------------------------------------------------------------------
// Rotas REST de dados (protótipo). Todas montadas atrás de `authRequired`
// (ver index.ts), então exigem JWT. Reaproveitam os helpers de db/crud.ts.
// ---------------------------------------------------------------------------

type Handler = (req: Request, res: Response) => Promise<unknown>;

function wrap(fn: Handler) {
  return (req: Request, res: Response): void => {
    fn(req, res).catch((err: unknown) => {
      console.error("Erro na rota de dados:", err);
      if (!res.headersSent) res.status(500).json({ error: (err as Error).message });
    });
  };
}

interface RecursoOpts {
  path: string; // segmento da URL (ex.: "departamentos")
  tabela: string; // nome da tabela no schema
  pk: string; // chave primária
  readonly?: boolean; // se true, expõe só GET
}

/** Registra GET (lista + por id) e, se não for readonly, POST/PUT/DELETE. */
function registrarRecurso(router: Router, opts: RecursoOpts): void {
  const { path, tabela, pk, readonly } = opts;

  router.get(`/${path}`, wrap(async (_req, res) => res.json(await crud.listar(tabela))));

  router.get(`/${path}/:id`, wrap(async (req, res) => {
    const row = await crud.obter(tabela, pk, req.params.id);
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    return res.json(row);
  }));

  if (readonly) return;

  router.post(`/${path}`, wrap(async (req, res) =>
    res.status(201).json(await crud.inserir(tabela, req.body as crud.Row)),
  ));

  router.put(`/${path}/:id`, wrap(async (req, res) => {
    const row = await crud.atualizar(tabela, pk, req.params.id, req.body as crud.Row);
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    return res.json(row);
  }));

  router.delete(`/${path}/:id`, wrap(async (req, res) => {
    const ok = await crud.remover(tabela, pk, req.params.id);
    if (!ok) return res.status(404).json({ error: "Não encontrado" });
    return res.status(204).end();
  }));
}

export function createDataRouter(): Router {
  const router = Router();

  // Entidades das telas (CRUD completo).
  registrarRecurso(router, { path: "secretarias", tabela: "secretarias", pk: "id" });
  registrarRecurso(router, { path: "departamentos", tabela: "departamentos", pk: "id" });
  registrarRecurso(router, { path: "unidades", tabela: "unidades", pk: "id" });
  // Equipamentos com mapeamento unidades_id ↔ secretarias_id (já que a coluna
  // no banco se chama unidades_id, mas o frontend usa secretarias_id).
  router.get("/equipamentos", wrap(async (_req, res) => {
    const rows = await crud.listar("equipamentos");
    return res.json(rows.map(mapaSecretaria));
  }));
  router.get("/equipamentos/:id", wrap(async (req, res) => {
    const row = await crud.obter("equipamentos", "patrimonio", req.params.id);
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    return res.json(mapaSecretaria(row));
  }));
  router.post("/equipamentos", wrap(async (req, res) => {
    const dados = { ...req.body, unidades_id: req.body.secretarias_id };
    delete dados.secretarias_id;
    return res.status(201).json(mapaSecretaria(await crud.inserir("equipamentos", dados)));
  }));
  router.put("/equipamentos/:id", wrap(async (req, res) => {
    const dados = { ...req.body, unidades_id: req.body.secretarias_id };
    delete dados.secretarias_id;
    const row = await crud.atualizar("equipamentos", "patrimonio", req.params.id, dados);
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    return res.json(mapaSecretaria(row));
  }));
  router.delete("/equipamentos/:id", wrap(async (req, res) => {
    const ok = await crud.remover("equipamentos", "patrimonio", req.params.id);
    if (!ok) return res.status(404).json({ error: "Não encontrado" });
    return res.status(204).end();
  }));
  function mapaSecretaria(row: crud.Row): crud.Row {
    return { ...row, secretarias_id: row.unidades_id };
  }
  registrarRecurso(router, { path: "funcionarios", tabela: "funcionarios", pk: "matricula" });

  // Tabelas de apoio (só leitura — para preencher selects).
  for (const t of ["status", "tipos", "municipios", "bairros", "ruas"]) {
    registrarRecurso(router, { path: t, tabela: t, pk: "id", readonly: true });
  }

  // Usuários: tratamento especial (esconde senhaHash, gera hash, casta bit).
  registrarUsuarios(router);

  return router;
}

// --- usuarios -------------------------------------------------------------
function semHash(row: crud.Row): crud.Row {
  const { senhaHash, ...resto } = row;
  void senhaHash;
  return resto;
}

function registrarUsuarios(router: Router): void {
  router.get("/usuarios", wrap(async (_req, res) => {
    const rows = await crud.listar("usuarios");
    return res.json(rows.map(semHash));
  }));

  router.get("/usuarios/:id", wrap(async (req, res) => {
    const row = await crud.obter("usuarios", "id", req.params.id);
    if (!row) return res.status(404).json({ error: "Não encontrado" });
    return res.json(semHash(row));
  }));

  router.post("/usuarios", wrap(async (req, res) => {
    const { login, senha, tipoUsuario, funcionarios_matricula } = req.body as {
      login?: string;
      senha?: string;
      tipoUsuario?: string | number;
      funcionarios_matricula?: string;
    };

    if (!login || !senha || !funcionarios_matricula) {
      return res.status(400).json({
        error: "login, senha e funcionarios_matricula são obrigatórios",
      });
    }
    if (!pool) return res.status(503).json({ error: "Banco de dados indisponível" });

    const senhaHash = await bcrypt.hash(senha, 10);
    const id = await crud.proximoId("usuarios");
    const bit = String(tipoUsuario) === "1" ? "1" : "0";

    const { rows } = await pool.query(
      `INSERT INTO "tabelasInventarioMaquina".usuarios
         (id, funcionarios_matricula, "tipoUsuario", login, "senhaHash")
       VALUES ($1, $2, $3::bit, $4, $5)
       RETURNING id, TRIM(login) AS login, "tipoUsuario",
                 TRIM(funcionarios_matricula) AS funcionarios_matricula`,
      [id, funcionarios_matricula, bit, login, senhaHash],
    );
    return res.status(201).json(rows[0]);
  }));

  router.delete("/usuarios/:id", wrap(async (req, res) => {
    const ok = await crud.remover("usuarios", "id", req.params.id);
    if (!ok) return res.status(404).json({ error: "Não encontrado" });
    return res.status(204).end();
  }));
}
