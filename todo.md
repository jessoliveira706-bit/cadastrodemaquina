# TODO — Protótipo: Autenticação + Comunicação com o Banco

> Foco: **protótipo**. Não nos preocupamos com testes/lint/qualidade — só fazer
> funcionar o mínimo de **autenticação** e **comunicação com o PostgreSQL**,
> reaproveitando o backend Node já existente em `BD_2.2/server/`.

Pilha já pronta: Express + JWT + `pg` (dockerizado), frontend HTML servido pela
própria API (mesma origem), `apiFetch()` no `utils.js` já injeta o token.
A ideia é **estender esse mesmo backend** com rotas de dados e plugar as telas.

---

## Fase 0 — Confirmar o que já existe (auth mínima ✅)
- [x] Login admin-fallback (`.env`) e login real contra `usuarios` (bcrypt).
- [x] `POST /api/auth/login` e `GET /api/auth/me` emitindo/validando JWT.
- [x] Frontend: `login.html` guarda sessão; `utils.js` faz guarda de rota + `Bearer`.
- [ ] (Se necessário) conferir que `docker compose up --build` sobe `db` + `api`
      e que `http://localhost:3001/login.html` autentica.

---

## Fase 1 — Camada de acesso ao banco (Node, reaproveitando o `pool`) ✅
Arquivo: `BD_2.2/server/src/db/crud.ts` (criado e testado contra o Postgres).
- [x] Reutilizar o `pool` de `src/db/pool.ts`.
- [x] Helpers genéricos: `listar`, `obter`, `inserir`, `atualizar`, `remover`
      (+ `proximoId` para PKs `integer` como `usuarios`).
- [x] **CHAR(n)**: rtrim genérico em JS na leitura (`trimRow`) — cobre `matricula`,
      `patrimonio`, `login` sem precisar saber o tipo de cada coluna.
- [x] **Bit** (`usuarios."tipoUsuario"`): volta como string `"0"/"1"` (já tratado no auth).
- [x] Schema sempre prefixado (`"tabelasInventarioMaquina"`); identificadores
      validados por `ident()` e valores parametrizados (`$1, $2, ...`).
- [x] Smoke test ok: listar(status), inserir/obter/atualizar/remover(departamentos), proximoId(usuarios).

## Fase 2 — Rotas REST de dados (mesmo padrão das rotas de auth) ✅
Arquivo: `BD_2.2/server/src/data/data.routes.ts` (`createDataRouter()`), montado e testado.
- [x] Montado no `index.ts`: `app.use("/api", authRequired, createDataRouter())`
      (as rotas `/api/auth` e `/api/health` são resolvidas antes, sem auth).
- [x] CRUD genérico (`registrarRecurso`) para:
  - [x] **Departamentos** (`departamentos`, pk `id`): GET, GET :id, POST, PUT, DELETE
  - [x] **Unidades** (`unidades`, pk `id`): idem
  - [x] **Equipamentos/Máquinas** (`equipamentos`, pk `patrimonio`): idem
  - [x] **Funcionários** (`funcionarios`, pk `matricula`): idem
  - [x] **Usuários** (`usuarios`): GET lista/by-id **sem `senhaHash`**, POST (bcrypt +
        `proximoId` + cast `$::bit` no `tipoUsuario`), DELETE
- [x] Rotas só-leitura de apoio: `status`, `tipos`, `secretarias`, `municipios`, `bairros`, `ruas`
- [x] Testado E2E: 401 sem token; GET/POST/PUT/DELETE departamentos; POST usuários +
      login do usuário criado (prova o hash); apoio (status) retornando o seed.
- [ ] (Opcional) **Fila/Chamados**: sem tabela direta — modelar via `movimentacoes`
      ou deixar em `localStorage` por enquanto.

## Fase 3 — Seed mínimo para as telas funcionarem ✅
Arquivo: `BD_2.2/db/init/02-seed.sql` (ampliado e aplicado).
- [x] `status` (3), `tipos` (2), `secretarias` (1), `departamentos` (1), `funcionarios` (1), `usuarios` (1).
- [x] Cadeia de localização `municipios → bairros → ruas` + 1 `unidades` ("Sede").
- [x] 1 `equipamentos` de exemplo (deixa a tela de Máquinas não-vazia).
- [x] Aplicado com `down -v && up --build`; conferido via API (`/api/unidades`, `/api/equipamentos`, etc.).

> **Frontend movido para `client/`** (os `.html` + `styles.css` + `utils.js` + logo saíram
> da raiz). Dockerfile, compose dev e o fallback do `index.ts` já apontam para `client/`.

## Fase 4 — Plugar o frontend (trocar `localStorage` por `apiFetch`) ✅
Todas as telas (em `client/`) passaram a usar a API. Os forms foram simplificados
para casar com as colunas reais do schema (vários campos antigos não existiam no DB).
- [x] **Departamentos** — `departments-list.html` (lista + secretaria resolvida) e
      `departments.html` (select de secretaria + nome + descrição); POST/PUT/DELETE.
- [x] **Unidades** — `unidades-list.html` / `unidades.html` com selects de
      secretaria/município/bairro/rua + nome/telefone/descrição.
- [x] **Máquinas** — `machines.html` (lista + form combinados); `patrimonio` como id,
      selects de tipo/status/departamento/unidade/funcionário; **CSV removido** (fora de escopo).
- [x] **Usuários** — `usuarios-list.html` (login/funcionário/tipo) e `usuarios.html`
      (select de funcionário + login/senha/tipo); POST cria com hash no servidor, DELETE.
- [x] **Dashboard** — `index.html`: gráfico de Máquinas agora vem de
      `/api/equipamentos` + `/api/status` (Chamados segue em `localStorage`).
- [x] `<select>` preenchidos pelas rotas de apoio (não mais valores fixos).
- [x] Verificado: páginas servidas 200; payloads de POST/PUT de cada entidade
      aceitos pela API; estado limpo ao final.
- [ ] (Fila/Chamados continua em `localStorage` — sem tabela; fora do mínimo.)

## Fase 5 — Rodar e verificar (end-to-end) ✅
- [x] Stack no ar (modo dev, raiz do projeto): `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`.
- [x] Login emitindo JWT; guarda de rota (sem token → 401).
- [x] **E2E verificado com persistência conferida no Postgres (`psql`)**:
      criar/editar/excluir Departamento, Unidade, Equipamento e Usuário via os
      payloads reais dos forms; usuário criado consegue logar (bcrypt no servidor);
      estado volta ao seed ao final.
- [x] Checagem estática: nenhuma tela usa mais `localStorage` para dados; todas
      chamam `apiFetch` nas rotas certas.
- [ ] **Pendente (manual):** clicar de fato no navegador em
      `http://localhost:3001/login.html` (`fiscal`/`fiscal123`) — o caminho de dados
      já está 100% provado via HTTP+psql; falta só a validação visual/DOM.

---

## ✔ Resumo — protótipo mínimo (auth + banco) COMPLETO
Fases 0–5 concluídas. Autenticação JWT (admin-fallback + login DB com bcrypt),
backend Node dockerizado (`BD_2.2/server`), CRUD REST protegido sobre o schema
`tabelasInventarioMaquina`, e o frontend (`client/`) plugado via `apiFetch`.

---

## Ordem sugerida de execução
1. Fase 1 (helpers de CRUD) → 2. Departamentos (rota + tela) ponta-a-ponta como
   **modelo**. 3. Repetir o mesmo padrão para Unidades, Máquinas, Usuários.
4. Selects de apoio. 5. Dashboard. (Fila fica por último / opcional.)

## Notas rápidas (schema `tabelasInventarioMaquina`)
- PKs: `departamentos.id`, `unidades.id` = `serial`; `equipamentos.patrimonio` e
  `funcionarios.matricula` = texto (informados pelo usuário); `usuarios.id` = `integer`
  (gerar manualmente).
- FKs obrigatórias: `departamentos.secretarias_id`, `funcionarios.departamentos_id`,
  `equipamentos.{status_id,tipos_id,departamentos_id,funcionarios_matricula,unidades_id}`,
  `unidades.{secretarias_id,municipios_id,bairros_id,ruas_id}` → os selects precisam
  vir das rotas de apoio para não violar FK ao inserir.
