.PHONY: worker clean_dev_db start_dev_db generate_db_client dev_deploy_db dbdev dev clean-dev

clean_dev_db:
	docker compose -f .devcontainer/dev-db/docker-compose.yml down --volumes postgres-multipost

start_dev_db:
	docker compose -f .devcontainer/dev-db/docker-compose.yml up -d postgres-multipost
	sleep 3

generate_db_client:
	find ./prisma -type d -name "client*" -exec rm -rf {} +
	./prisma/generate.sh

dev_deploy_db:
	./prisma/migrate_deploy_dev.sh

dbdev: generate_db_client dev_deploy_db

dev: start_dev_db dev_deploy_db

clean-dev: clean_dev_db start_dev_db

worker:
	pnpm run build:worker
	pnpm run worker
