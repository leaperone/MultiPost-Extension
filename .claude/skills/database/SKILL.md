---
name: database
description: Database operations including Prisma migrations, schema changes, and MCP queries. Use when creating migrations, modifying database schemas, querying databases via MCP, or setting up database connections.
---

# Database Operations

## Database Architecture

The project uses **three separate PostgreSQL databases**:

| Database | Env Variable | Schema | Client Output |
|----------|-------------|--------|---------------|
| Main | `TWOSOMEREN_DATABASE_URL` | `prisma/schema_twosomeren.prisma` | `prisma/client_twosomeren` |
| Region | `REGION_DATABASE_URL` | `prisma/schema_region.prisma` | `prisma/client_region` |
| Bilibili | `TWOSOMEREN_BILI_DATABASE_URL` | `prisma/twosomeren_bili/schema_twosomeren_bili.prisma` | `prisma/twosomeren_bili/client_twosomeren_bili` |

## Generate Prisma Client

```bash
make generate_db_client
# or manually: ./prisma/generate.sh
```

## Create New Migrations

```bash
# Main business database
./prisma/migrate.sh <migration_name>

# Bilibili database
./prisma/migrate_bili.sh <migration_name>
```

## Deploy Migrations

```bash
# Production (main database only)
./prisma/migrate_deploy.sh

# Development (all databases)
./prisma/migrate_deploy_dev.sh
```

## Quick Setup

```bash
make dev              # Start dev DB + deploy migrations
make dbdev            # Generate Prisma clients + deploy migrations
make clean-dev        # Clean and restart dev DB
```

## Migration Best Practices

- Use descriptive English names: `add_user_profile_fields`
- Always backup data before migrations
- Test in dev environment first
- Remember: 3 separate databases require independent management

## MCP Database Query

Query development databases directly via MCP. Configuration: `.mcp.json`.

| MCP Server | Database | Description |
|------------|----------|-------------|
| `devdb-main` | twosomeren_db | Main business database |
| `devdb-bili` | twosomeren_bili_db | Bilibili live streaming database |
| `devdb-region` | region_db | Chinese region database |

### Usage

```
# Search database objects
mcp__devdb-main__search_objects(object_type="table", detail_level="summary")

# Execute SQL queries
mcp__devdb-main__execute_sql(sql="SELECT * FROM \"User\" LIMIT 10")
mcp__devdb-bili__execute_sql(sql="SELECT * FROM \"GiftRaw\" LIMIT 10")
mcp__devdb-region__execute_sql(sql="SELECT * FROM provinces")
```

### Notes

- Use double quotes for table names (PostgreSQL is case-sensitive)
- Development environment only - do not modify production data
- Use LIMIT to restrict result size for large queries
