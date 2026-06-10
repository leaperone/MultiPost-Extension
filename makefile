.PHONY: clean_dev_db start_dev_db db_build_source db_lint db_diff dev_deploy_db dbdev dev clean-dev

clean_dev_db:
	docker compose -f .devcontainer/dev-db/docker-compose.yml down --volumes postgres-multipost

start_dev_db:
	docker compose -f .devcontainer/dev-db/docker-compose.yml up -d postgres-multipost
	sleep 3

db_build_source:
	pnpm db:build:source

db_lint: db_build_source
	pnpm db:lint:no-dml
	atlas migrate lint --env local --config file://db/atlas/atlas.hcl --latest=1

db_diff: db_build_source
	atlas migrate diff --env local --config file://db/atlas/atlas.hcl

dev_deploy_db: db_build_source
	atlas migrate apply --env local --config file://db/atlas/atlas.hcl

dbdev: dev_deploy_db

dev: start_dev_db dev_deploy_db

clean-dev: clean_dev_db start_dev_db
