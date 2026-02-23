#!/usr/bin/env bash
set -Eeu -o pipefail

# This script runs as postgres user (uid 70) in DHI images

file_env() {
    local var="$1"
    local fileVar="${var}_FILE"
    local default="${2:-}"

    if [ -n "${!var:-}" ] && [ -n "${!fileVar:-}" ]; then
        cat >&2 <<-EOE
            ERROR: Both ${var} and ${fileVar} are set, but they are mutually exclusive options.
EOE
        exit 1
    fi

    local value="$default"
    if [ -n "${!fileVar:-}" ]; then
        value="$(< "${!fileVar}")"
    elif [ -n "${!var:-}" ]; then
        value="${!var}"
    fi
    export "$var"="$value"
    unset "$fileVar"
}

file_env 'POSTGRES_USER' 'postgres'
file_env 'POSTGRES_PASSWORD'
file_env 'POSTGRES_DB' "$POSTGRES_USER"
file_env 'POSTGRES_INITDB_ARGS'

ALREADY_INITIALIZED=false

# Initialize the database if it doesn't already exist.
# Check for postgresql.conf instead of just the directory, as mounted volumes create empty directories
if [ ! -s "$PGDATA/PG_VERSION" ]; then
    echo "ENTRYPOINT: Initializing database..."

    # Prevent insecure configurations.
    case "${POSTGRES_HOST_AUTH_METHOD:-}" in
        md5|scram-sha-256|'')
            if [ -z "$POSTGRES_PASSWORD" ]; then
                cat >&2 <<-EOE
                    ERROR: Database is uninitialized and the superuser password is not specified.
                           POSTGRES_PASSWORD or POSTGRES_PASSWORD_FILE must be set to a non-empty value.
EOE
                exit 1
            fi
            ;;
        trust|password)
            cat >&2 <<-EOE
                ERROR: POSTGRES_HOST_AUTH_METHOD=${POSTGRES_HOST_AUTH_METHOD} is not allowed, as it would result
                       in an insecure configuration. Refer to the PostgreSQL documentation for more information:
                       https://www.postgresql.org/docs/${PG_MAJOR}/auth-${POSTGRES_HOST_AUTH_METHOD}.html
EOE
            exit 1
            ;;
        *)
            cat >&2 <<-EOE
                ERROR: POSTGRES_HOST_AUTH_METHOD=${POSTGRES_HOST_AUTH_METHOD} is an invalid value. Valid values are
                       one of "md5" or "scram-sha-256. Refer to the PostgreSQL documentation for more information:
                       https://www.postgresql.org/docs/${PG_MAJOR}/auth-password.html
EOE
            exit 1
            ;;
    esac

    if [ -n "${POSTGRES_INITDB_WALDIR:-}" ]; then
        postgres_initdb_waldir_args='--waldir '"$POSTGRES_INITDB_WALDIR"''
    fi

    # --pwfile refuses to handle a properly-empty file (hence the "\n"): https://github.com/docker-library/postgres/issues/1025.
    eval 'initdb --username="${POSTGRES_USER}" --pwfile=<(printf "%s\n" "$POSTGRES_PASSWORD") '"${postgres_initdb_waldir_args:-}"' '"${POSTGRES_INITDB_ARGS}"''

    # Allow remote hosts to connect with the POSTGRES_HOST_AUTH_METHOD, using the default value if unset.
    default_auth="$(postgres -C password_encryption)"
    printf '\nhost all all all %s\n' "${POSTGRES_HOST_AUTH_METHOD:-$default_auth}" \
        >> "$PGDATA/pg_hba.conf"

    # Create the default database if it does not already exist.
    # Postgres creates a database named 'postgres' by default.
    default_db="${POSTGRES_DB}"
    if [ "$default_db" != 'postgres' ]; then
        # Set credentials in environment in case --auth{,host,local}= is used with POSTGRES_INITDB_ARGS.
        # We checked that the password is not empty earlier in the script.
        export PGUSER="${POSTGRES_USER}"
        export PGPASSWORD="${POSTGRES_PASSWORD}"
        # Temporarily start the database, and create the default database.
        pg_ctl -D "$PGDATA" -o '-c listen_addresses=' -w start
        createdb --no-password "$default_db"
        pg_ctl -D "$PGDATA" -m fast -w stop
        # Unset credentials.
        unset PGUSER PGPASSWORD
    fi
else
    ALREADY_INITIALIZED=true
fi

# Run init scripts from /docker-entrypoint-initdb.d/
if [ "$ALREADY_INITIALIZED" = false ] && [ -d /docker-entrypoint-initdb.d ]; then
    echo "ENTRYPOINT: Running init scripts..."

    # Start postgres temporarily for init scripts (with JIT disabled)
    export PGUSER="${POSTGRES_USER}"
    export PGPASSWORD="${POSTGRES_PASSWORD}"
    pg_ctl -D "$PGDATA" -o '-c listen_addresses=localhost -c jit=off' -w start

    for f in /docker-entrypoint-initdb.d/*; do
        case "$f" in
            *.sh)
                if [ -x "$f" ]; then
                    echo "ENTRYPOINT: Running $f"
                    "$f"
                else
                    echo "ENTRYPOINT: Sourcing $f"
                    . "$f"
                fi
                ;;
            *.sql)
                echo "ENTRYPOINT: Running $f"
                psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$f"
                ;;
            *.sql.gz)
                echo "ENTRYPOINT: Running $f"
                gunzip -c "$f" | psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB"
                ;;
            *)
                echo "ENTRYPOINT: Ignoring $f"
                ;;
        esac
    done

    pg_ctl -D "$PGDATA" -m fast -w stop
    unset PGUSER PGPASSWORD
fi

echo "ENTRYPOINT: Starting database..."
exec postgres "$@"
