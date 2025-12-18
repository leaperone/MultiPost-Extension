Update PR title/description and manage bot comments.

## Part 1: Update PR

1. Get branch diff against base branch (usually `main`)
2. Update PR title in conventional commit format (e.g., `fix:`, `feat:`, `chore:`)
3. Update PR description in Chinese with summary and test plan

```bash
gh pr view --json number,title,body,baseRefName,headRefName
git log origin/main..HEAD --oneline
gh pr diff --name-only
gh pr edit {number} --title "new title" --body "new body"
```

## Part 2: Manage Bot Comments

Keep only the **latest** comment visible for each bot type, hide older ones.

**Bot types**: `claude[bot]`, `claude`, `leaperone-bot`

```bash
# Get PR number
gh pr view --json number -q '.number'

# Get bot comments
gh api repos/{owner}/{repo}/issues/{pr_number}/comments \
  --jq '.[] | select(.user.login == "claude[bot]" or .user.login == "claude" or .user.login == "leaperone-bot") | {id, node_id, user: .user.login, created_at}'

# Hide old comment (keep latest only)
gh api graphql -f query='
  mutation {
    minimizeComment(input: {subjectId: "{node_id}", classifier: RESOLVED}) {
      minimizedComment { isMinimized }
    }
  }
'
```

Report results as table showing total/hidden/kept for each bot type.
