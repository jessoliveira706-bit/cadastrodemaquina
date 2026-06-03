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

## Fase 1 — Camada de acesso ao banco (Node, reaproveitando o `pool`)
Arquivo novo: `BD_2.2/server/src/db/crud.ts`
- [ ] Reutilizar o `pool` de `src/db/pool.ts`.
- [ ] Criar helpers genéricos para todas as tabelas usarem (modo protótipo, simples):
  - [ ] `listar(tabela, colunas)` → `SELECT ... FROM "tabelasInventarioMaquina".<tabela>`
  - [ ] `obter(tabela, pk, valor)` → `SELECT ... WHERE <pk> = $1`
  - [ ] `inserir(tabela, objeto)` → monta `INSERT (...) VALUES (...)` a partir das chaves
  - [ ] `atualizar(tabela, pk, valor, objeto)` → `UPDATE ... SET ... WHERE <pk> = $n`
  - [ ] `remover(tabela, pk, valor)` → `DELETE ... WHERE <pk> = $1`
- [ ] **Atenção a CHAR(n)** (`equipamentos.patrimonio`, `funcionarios.matricula`,
      `usuarios.login`): aplicar `TRIM()` na leitura para não vir com espaços.
- [ ] **Bit** (`usuarios."tipoUsuario"`): tratar como string `"0"/"1"`.
- [ ] Sempre prefixar o schema: `"tabelasInventarioMaquina"`.

## Fase 2 — Rotas REST de dados (mesmo padrão das rotas de auth)
Arquivo novo: `BD_2.2/server/src/data/data.routes.ts` (um `createDataRouter()`)
- [ ] Montar no `index.ts`: `app.use("/api", authRequired, createDataRouter())`
      (todas as rotas de dados exigem token — reaproveita o middleware de auth).
- [ ] Criar CRUD para as entidades das telas existentes:
  - [ ] **Departamentos** (`departamentos`): GET lista, GET :id, POST, PUT :id, DELETE :id
  - [ ] **Unidades** (`unidades`): idem
  - [ ] **Equipamentos/Máquinas** (`equipamentos`, PK = `patrimonio`): idem
  - [ ] **Funcionários** (`funcionarios`, PK = `matricula`): idem
  - [ ] **Usuários** (`usuarios`): GET lista (sem `senhaHash`), POST (gerar hash bcrypt
        no servidor e `id = MAX(id)+1`, pois a coluna é `integer`, não `serial`)
- [ ] Rotas só-leitura de apoio (para preencher selects das telas):
  - [ ] `status`, `tipos`, `secretarias`, `municipios`, `bairros`, `ruas`
- [ ] (Opcional) **Fila/Chamados**: não há tabela direta. Para o protótipo, ou
      modelar via `movimentacoes` (equipamento + status + data), ou deixar a fila
      ainda em `localStorage` por enquanto.

## Fase 3 — Seed mínimo para as telas funcionarem
Editar `BD_2.2/db/init/02-seed.sql`
- [ ] Garantir ao menos 1 linha em cada tabela de apoio usada nos selects
      (`status`, `tipos`, `secretarias`, e a cadeia `municipios→bairros→ruas` para `unidades`).
- [ ] Lembrar: os scripts de init só rodam na 1ª criação do volume →
      após editar, rodar `docker compose down -v && docker compose up --build`.

## Fase 4 — Plugar o frontend (trocar `localStorage` por `apiFetch`)
Para **cada** tela, substituir `loadData/saveData` (localStorage) por chamadas à API.
Já existe `apiFetch()` em `utils.js` (injeta `Bearer`, redireciona em 401).
- [ ] **Departamentos** — `departments-list.html` (listar) e `departments.html` (criar/editar):
  - [ ] `load()` → `await apiFetch('/api/departamentos').then(r=>r.json())`
  - [ ] `save()` → `POST`/`PUT` para `/api/departamentos`
  - [ ] deletar → `DELETE /api/departamentos/:id`
- [ ] **Unidades** — `unidades-list.html` / `unidades.html` (mesmo padrão).
- [ ] **Máquinas** — `machines.html` (usar `patrimonio` como id na URL).
- [ ] **Usuários** — `usuarios-list.html` / `usuarios.html` (POST cria login no banco).
- [ ] **Dashboard** — `index.html`: trocar as leituras `localStorage` dos gráficos
      por `GET` nas rotas correspondentes (contagens de máquinas/chamados).
- [ ] Preencher os `<select>` (departamento, status, tipo, unidade) a partir das
      rotas de apoio em vez de valores fixos.

## Fase 5 — Rodar e verificar (end-to-end)
- [ ] `cd BD_2.2 && docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
      (dev = hot reload ao editar o backend).
- [ ] Logar em `http://localhost:3001/login.html` (`fiscal`/`fiscal123` ou `admin`).
- [ ] Testar uma rota nova com token, ex.:
      `curl localhost:3001/api/departamentos -H "Authorization: Bearer <token>"`.
- [ ] Criar um departamento pela tela → recarregar → confirmar que **persistiu no
      Postgres** (não no navegador). Conferir no banco:
      `docker compose exec db psql -U inventario -d inventario -c
      'SET search_path TO "tabelasInventarioMaquina"; SELECT * FROM departamentos;'`
- [ ] Repetir o ciclo criar/editar/excluir nas demais telas.

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
