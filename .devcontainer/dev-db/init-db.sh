#!/usr/bin/env bash
set -eo pipefail  # 添加更严格的错误处理

# 设置数据库操作函数
function create_database() {
    local db_name=$1
    export PGPASSWORD=$POSTGRESQL_POSTGRES_PASSWORD
    psql -v ON_ERROR_STOP=1 --username "postgres" <<-EOSQL
        CREATE DATABASE ${db_name};
        GRANT ALL PRIVILEGES ON DATABASE ${db_name} TO $POSTGRESQL_USERNAME;
        ALTER DATABASE ${db_name} OWNER TO $POSTGRESQL_USERNAME;
EOSQL
}

# 设置备份函数
function backup_database() {
    local db_name=$1
    local backup_file="/bitnami/postgresql/${db_name}.backup"
    export PGPASSWORD=${BACKUP_REMOTE_POSTGRES_PASSWORD}
    pg_dump --file "$backup_file" \
            --host ${BACKUP_REMOTE_HOST} \
            --port ${BACKUP_REMOTE_PORT} \
            --username ${BACKUP_REMOTE_USERNAME} \
            --dbname "${db_name}" \
            --verbose --role "postgres" \
            --format=c --blobs \
            --encoding "UTF8"
}

# 设置恢复函数
function restore_database() {
    local db_name=$1
    local backup_file="/bitnami/postgresql/${db_name}.backup"
    export PGPASSWORD=$POSTGRESQL_POSTGRES_PASSWORD
    pg_restore --host "localhost" \
               --port "5432" \
               --username "postgres" \
               --role "postgres" \
               --dbname "${db_name}" \
               --verbose "$backup_file"
}

# 修改主要执行流程部分
for db in "multipost_db"; do
    echo "Processing database: $db"
    create_database "$db"
    backup_database "$db"
    restore_database "$db"
done