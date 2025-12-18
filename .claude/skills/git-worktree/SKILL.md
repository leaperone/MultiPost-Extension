---
name: git-worktree
description: Git worktree setup for this project. Use when creating new git worktrees, setting up parallel development environments, or working on multiple branches simultaneously.
---

# Git Worktree Setup

## Create a New Worktree

```bash
git worktree add <new-worktree-path> <branch-name>
# Example:
git worktree add ../2SOMEren-feature feature/new-feature
```

## Required Setup Steps

### 1. Copy Environment Variables

```bash
cp /root/2SOMEren/.env.local <new-worktree-path>/.env.local
```

### 2. Generate Prisma Clients

```bash
cd <new-worktree-path> && make generate_db_client
```

### 3. Install Dependencies

```bash
cd <new-worktree-path> && pnpm i
```

## Quick Setup Script

```bash
NEW_WORKTREE_PATH="../2SOMEren-feature"
BRANCH_NAME="feature/new-feature"

git worktree add $NEW_WORKTREE_PATH $BRANCH_NAME && \
cp /root/2SOMEren/.env.local $NEW_WORKTREE_PATH/.env.local && \
cd $NEW_WORKTREE_PATH && \
pnpm i && \
make generate_db_client
```

## Managing Worktrees

```bash
# List all worktrees
git worktree list

# Remove a worktree
git worktree remove <worktree-path>

# Prune stale worktree references
git worktree prune
```

## Notes

- Each worktree shares Git history but has independent working directories
- Changes in one worktree don't affect others until committed and pulled
- Useful for working on multiple features simultaneously
