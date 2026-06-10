# Atlas Community configuration. db/atlas/_source.sql is pre-composed by
# db/scripts/atlas-build-source.sh from drizzle-kit export output.

env "local" {
  src = "file://db/atlas/_source.sql?format=postgres"
  dev = "docker://postgres/16/dev?search_path=public"
  migration {
    dir = "file://db/atlas/migrations"
  }
  exclude = ["public._prisma_migrations"]
}

env "production" {
  src = "file://db/atlas/_source.sql?format=postgres"
  url = getenv("MULTIPOST_DATABASE_URL")
  dev = "docker://postgres/16/dev?search_path=public"
  migration {
    dir = "file://db/atlas/migrations"
    baseline = "20260414100000"
  }
  exclude = ["public._prisma_migrations"]
}
