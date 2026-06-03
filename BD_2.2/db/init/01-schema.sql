-- Cria o schema e aplica o DDL original (SQL_Tabelas_2.2.sql), montado em /sql.
-- Roda automaticamente na primeira criação do volume do Postgres.
CREATE SCHEMA IF NOT EXISTS "tabelasInventarioMaquina";

\i /sql/SQL_Tabelas_2.2.sql
