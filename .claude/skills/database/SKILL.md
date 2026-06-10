---
name: database
description: Database operations including Drizzle schema changes, Atlas migrations, and MCP queries. Use when creating migrations, modifying database schemas, querying databases via MCP, or setting up database connections.
---

# Database Operations

## Database Architecture

MultiPost uses PostgreSQL through Drizzle ORM and Atlas migrations.

| Database | Env Variable | Drizzle Schema | Atlas Config |
|----------|--------------|----------------|--------------|
| Main | `MULTIPOST_DATABASE_URL` | `db/schema/` | `db/atlas/atlas.hcl` |

## Create New Migrations

```bash
pnpm db:build:source
make db_diff
```

## Deploy Migrations

```bash
# Production deploy contract entrypoint
sh prisma/migrate_deploy.sh

# Development
make dbdev
```

## Quick Setup

```bash
make dev              # Start dev DB + deploy migrations
make dbdev            # Build Drizzle source + deploy Atlas migrations
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
