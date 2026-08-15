# esse meu init-db.sh é um script de inicialização para o banco de dados PostgreSQL usado na aplicação Korp. 
# Ele é executado quando o container do banco de dados é iniciado, criando os bancos de dados necessários 
#para os serviços de estoque e faturamento, e garantindo que o usuário do PostgreSQL tenha as permissões adequadas para acessar esses bancos.

#!/bin/bash
set -e

echo "📦 Criando bancos de dados da aplicação Korp..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    CREATE DATABASE estoque_db;
    CREATE DATABASE faturamento_db;
    GRANT ALL PRIVILEGES ON DATABASE estoque_db TO $POSTGRES_USER;
    GRANT ALL PRIVILEGES ON DATABASE faturamento_db TO $POSTGRES_USER;
EOSQL

echo "✅ Bancos estoque_db e faturamento_db criados com sucesso."
