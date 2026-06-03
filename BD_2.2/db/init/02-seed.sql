-- Dados mínimos para o protótipo de autenticação.
-- Cria 1 secretaria, 1 departamento, 1 funcionário e 1 usuário de login.
--
-- Usuário de demonstração (login via banco, bcrypt):
--   login: fiscal   |   senha: fiscal123   |   tipoUsuario: 0 (usuário comum)
-- (O usuário "admin" NÃO fica no banco: usa o admin-fallback por env.)

SET search_path TO "tabelasInventarioMaquina";

-- Alguns status e tipos básicos de equipamento (úteis para evolução).
INSERT INTO status (nome, descricao) VALUES
  ('Disponível', 'Equipamento disponível'),
  ('Alocado',    'Equipamento em uso'),
  ('Manutenção', 'Em manutenção');

INSERT INTO tipos (nome, descricao) VALUES
  ('Desktop',  'Computador de mesa'),
  ('Notebook', 'Computador portátil');

-- Hierarquia mínima para satisfazer as FKs de funcionarios/usuarios.
WITH sec AS (
  INSERT INTO secretarias (nome, descricao)
  VALUES ('Secretaria de Tecnologia', 'Seed inicial')
  RETURNING id
), dep AS (
  INSERT INTO departamentos (secretarias_id, nome, descricao)
  SELECT id, 'GECOTEC', 'Seed inicial' FROM sec
  RETURNING id
)
INSERT INTO funcionarios (matricula, departamentos_id, cpf, nome, "nomeCompleto")
SELECT '100001', id, '00000000000', 'Fiscal', 'Fiscal de Inventário' FROM dep;

-- Usuário de login (senha "fiscal123" com bcrypt).
INSERT INTO usuarios (id, funcionarios_matricula, "tipoUsuario", login, "senhaHash")
VALUES (
  1,
  '100001',
  B'0',
  'fiscal',
  '$2a$10$dWq676YK3oD0q1c.Gz5wLOkB0mHBgZLMkk786DaePIQCMTuVAmkZ6'
);
