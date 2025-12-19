---
name: cicd
description: View and debug CI/CD pipeline status, build logs, and deployment errors. Use when checking GitHub Actions status, viewing failed builds, or troubleshooting deployment issues.
---

# CI/CD Pipeline Operations

## Architecture

This project uses a **two-repository CI/CD setup**:

| Repository | Purpose |
|------------|---------|
| `leaperone/MultiPost` | Source code, triggers deployments |
| `leaperone/leaperone-releases` | Deployment workflows, Docker builds |

When code is pushed to `MultiPost`, it triggers a `repository_dispatch` event to `leaperone-releases`, which handles the actual build and deployment.

## View CI/CD Status

### Check Recent Runs (Source Repo)

```bash
# List recent workflow runs in source repo
gh run list --limit 10

# View specific run details
gh run view <run_id>
```

### Check Deployment Runs (Releases Repo)

```bash
# List recent deployment runs
gh run list --repo leaperone/leaperone-releases --limit 10

# View failed run logs
gh run view <run_id> --repo leaperone/leaperone-releases --log-failed

# View full logs
gh run view <run_id> --repo leaperone/leaperone-releases --log
```

## Common Commands

### View Failed Build Details

```bash
# Get failed job logs (most useful for debugging)
gh run view <run_id> --repo leaperone/leaperone-releases --log-failed | tail -100
```

### Check PR Build Status

```bash
# List PR comments (includes build status from bot)
gh api repos/:owner/:repo/issues/<pr_number>/comments

# Check specific PR
gh pr view <pr_number> --comments
```

### View Workflow Jobs

```bash
# Get job details for a run
gh api repos/leaperone/leaperone-releases/actions/runs/<run_id>/jobs
```

## Deployment Workflow

The deployment workflow (`deploy-twssomeren.yml`) includes these steps:

1. **Validate and set ref** - Determine branch/PR to build
2. **Checkout code** - Clone from `leaperone/MultiPost`
3. **Check Skip CI** - Skip if commit contains "noci"
4. **Build Docker images** - `docker compose -f ./docker/docker-compose-build.yml build`
5. **Push to Aliyun Registry** - Shanghai & Hong Kong regions
6. **Run Database Migrations** - Prisma migrations
7. **Deploy to Production** - SSH deploy to servers

## Common Issues & Solutions

### Container Name Conflict

```
Error: The container name "xxx" is already in use
```

**Solution**: Clean up orphaned containers on production server:

```bash
docker rm -f <container_name>
# or
docker compose down --remove-orphans
docker container prune -f
```

### Build Docker Images Failed

Check the build logs for:
- TypeScript compilation errors
- Missing dependencies
- Dockerfile issues

```bash
# Test build locally
docker compose -f ./docker/docker-compose-build.yml build
```

### Migration Failed

Check database connectivity and migration status:

```bash
# View migration logs in CI
gh run view <run_id> --repo leaperone/leaperone-releases --log | grep -A 20 "Execute Migrations"
```

## Environment

| Environment | Registry | Server |
|-------------|----------|--------|
| Shanghai | `registry.cn-shanghai.aliyuncs.com/leaperone/multipost` | Production CN |
| Hong Kong | `registry.cn-hongkong.aliyuncs.com/leaperone/multipost` | Production HK |

## Triggering Deployments

Deployments are automatically triggered by:
- Push to `main` branch
- PR creation/update (for preview builds)

To skip CI, include "noci" in commit message.
