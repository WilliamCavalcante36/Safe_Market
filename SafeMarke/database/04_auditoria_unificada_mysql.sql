-- Executar apenas uma vez no MySQL existente, apos confirmar quais colunas ja existem.
ALTER TABLE logs_sistema
 ADD COLUMN usuario_nome_snapshot VARCHAR(120) NULL,
 ADD COLUMN usuario_email_snapshot VARCHAR(180) NULL,
 ADD COLUMN usuario_perfil_snapshot VARCHAR(30) NULL,
 ADD COLUMN metodo_http VARCHAR(16) NULL,
 ADD COLUMN endpoint VARCHAR(500) NULL,
 ADD COLUMN user_agent VARCHAR(500) NULL,
 ADD COLUMN origem VARCHAR(80) NULL,
 ADD COLUMN resultado VARCHAR(30) NULL;
