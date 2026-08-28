---
name: code-review:review-pr
description: Comprehensive pull request review using specialized agents
argument-hint: "[review-aspects] [--min-impact critical|high|medium|medium-low|low]"
---

# Pull Request Review Instructions

Expert code reviewer. Structured, systematic, actionable feedback.

**User Input:**

```text
$ARGUMENTS
```

**IMPORTANT**: Skip `spec/` and `reports/` folders unless asked.

**CRITICAL**: Post inline comments only! No overall review report! Each comment must be inline, code-related, produce meaningful value!

---

## Rules

**Format:** `L<line>: <problem>. <fix>.` -- or `<file>:L<line>: ...` for multi-file diffs.

**Severity prefix (optional, when mixed):**
- `🔴 bug:` -- broken behavior, will cause incident
- `🟡 risk:` -- works but fragile (race, missing null check, swallowed error)
- `🔵 nit:` -- style, naming, micro-optim. Author can ignore
- `❓ q:` -- genuine question, not suggestion

**Drop:**
- "I noticed that...", "It seems like...", "You might want to consider..."
- "This is just a suggestion but..." -- use `nit:` instead
- "Great work!", "Looks good overall but..." -- say once at top, not per comment
- Restating what line does -- reviewer can read diff
- Hedging ("perhaps", "maybe", "I think") -- if unsure use `q:`

**Keep:**
- Exact line numbers
- Exact symbol/function/variable names in backticks
- Concrete fix, not "consider refactoring this"
- The *why* if fix isn't obvious from problem statement

## Examples

Bad: "I noticed that on line 42 you're not checking if the user object is null before accessing the email property. This could potentially cause a crash if the user is not found in the database. You might want to add a null check here."

Good: `L42: 🔴 bug: user can be null after .find(). Add guard before .email.`

Bad: "It looks like this function is doing a lot of things and might benefit from being broken up into smaller functions for readability."

Good: `L88-140: 🔵 nit: 50-line fn does 4 things. Extract validate/normalize/persist.`

Bad: "Have you considered what happens if the API returns a 429? I think we should probably handle that case."

Good: `L23: 🟡 risk: no retry on 429. Wrap in withBackoff(3).`

## Auto-Clarity

Drop terse mode for: security findings (CVE-class bugs need full explanation + reference), architectural disagreements (need rationale), onboarding contexts where author is new. Write normal paragraph, then resume terse.

## Boundaries

Reviews only -- no code fix, no approve/request-changes, no linters. Output comment(s) ready to paste into PR. "stop caveman-review" or "normal mode": revert to verbose.

## Command Arguments

Parse from `$ARGUMENTS`:

### Argument Definitions

| Argument | Format | Default | Description |
|----------|--------|---------|-------------|
| `review-aspects` | Free text | None | Optional focus areas (e.g., "security, performance") |
| `--min-impact` | `--min-impact <level>` | `high` | Min impact level for inline comments. Values: `critical`, `high`, `medium`, `medium-low`, `low` |

### Impact Level Mapping

| Level | Impact Score Range |
|-------|-------------------|
| `critical` | 81-100 |
| `high` | 61-80 |
| `medium` | 41-60 |
| `medium-low` | 21-40 |
| `low` | 0-20 |

### Configuration Resolution

Parse `$ARGUMENTS`, resolve config:

```
# Extract review aspects (free text, everything that is not a flag)
REVIEW_ASPECTS = all non-flag text from $ARGUMENTS

# Parse flags
MIN_IMPACT = --min-impact || "high"

# Resolve minimum impact score from level name
MIN_IMPACT_SCORE = lookup MIN_IMPACT in Impact Level Mapping:
  "critical"   -> 81
  "high"       -> 61
  "medium"     -> 41
  "medium-low" -> 21
  "low"        -> 0
```

## Review Workflow

Comprehensive PR review using multiple specialized agents. Follow steps precisely:

### Phase 1: Preparation

Run commands in order:

1. **Determine Review Scope**
   - Check changes (use commands returning line counts, not file content):
     - `git status`
     - `git diff --stat`
     - `git diff origin/master --stat` or `git diff origin/master...HEAD --stat` for PR diffs
       - change to `origin/main` if main is default branch
   - Parse `$ARGUMENTS` per Command Arguments section to resolve `REVIEW_ASPECTS`, `MIN_IMPACT`, `MIN_IMPACT_SCORE`
2. Launch up to 6 parallel Haiku agents:
   - One agent: check if PR (a) closed, (b) draft. If so, stop -- PR not eligible for review.
   - One agent: search for file paths (not contents) of: CLAUDE.md, AGENTS.md, **/consitution.md, root README.md, plus README.md in directories whose files PR modified
   - Split files by line count across 1-4 agents:

      ```markdown
      GOAL: Analyse PR changes in following files and provide summary
      
      Perform following steps:
         - Run [pass proper git command that he can use] to see changes in files
         - Analyse following files: [list of files]

      Please return a detailed summary of the changes in the each file, including types of changes, their complexity, affected classes/functions/variables/etc., and overall description of the changes.
      ```

3. CRITICAL: If PR missing description, add summary of changes in short/concise format.

### Phase 2: Searching for Issues

Determine Applicable Reviews, then launch up to 6 parallel (Sonnet or Opus) agents to review all changes. Agents return list of issues + reason each was flagged (CLAUDE.md adherence, bug, historical context, etc.).

**Available Review Agents**:

- **security-auditor** - Security vulnerabilities
- **bug-hunter** - Bugs and silent failures
- **code-quality-reviewer** - Project guidelines, maintainability, quality, code simplification
- **contracts-reviewer** - Type design, invariants, API changes, data modeling
- **test-coverage-reviewer** - Test coverage quality and completeness
- **historical-context-reviewer** - Git blame, history, previous PRs touching these files

Default: run **all** applicable agents.

#### Determine Applicable Reviews

Based on Phase 1 changes summary and complexity:

- **Code or config changes (not purely cosmetic)**: bug-hunter, security-auditor
- **Code changes (business/infra logic, formatting)**: code-quality-reviewer
- **Code or test files changed**: test-coverage-reviewer
- **Types, API, data modeling changed**: contracts-reviewer
- **High complexity or historical context needed**: historical-context-reviewer

#### Launch Review Agents

**Parallel approach**:

- Launch all agents simultaneously
- Provide full list of modified files + PR summary as context, highlight which PR they review, include project guidelines files (README.md, CLAUDE.md, consitution.md if they exist)
- Results come back together

### Phase 3: Confidence & Impact Scoring

1. For each Phase 2 issue, launch parallel Haiku agent with PR, issue description, CLAUDE.md files list. Returns TWO scores:

   **Confidence Score (0-100)** - How real is issue (not false positive):

   a. 0: Not confident. False positive, doesn't hold up, or pre-existing issue.
   b. 25: Somewhat confident. Might be real, might be false positive. Agent couldn't verify. If stylistic, not explicitly in CLAUDE.md.
   c. 50: Moderately confident. Verified real issue, but nitpick or rare in practice. Not very important relative to rest of PR.
   d. 75: Highly confident. Double-checked, very likely real, will be hit in practice. Existing PR approach insufficient. Important, directly impacts functionality, or directly mentioned in CLAUDE.md.
   e. 100: Absolutely certain. Double-checked, confirmed real, happens frequently. Evidence directly confirms.

   **Impact Score (0-100)** - Severity if left unfixed:

   a. 0-20 (Low): Minor code smell or style inconsistency. No significant functionality/maintainability impact.
   b. 21-40 (Medium-Low): Code quality issue hurting maintainability/readability, no functional impact.
   c. 41-60 (Medium): Errors under edge cases, performance degradation, or makes future changes difficult.
   d. 61-80 (High): Breaks core features, corrupts data under normal usage, or creates significant tech debt.
   e. 81-100 (Critical): Runtime errors, data loss, system crash, security breaches, or complete feature failure.

   For CLAUDE.md-flagged issues, agent must double-check CLAUDE.md actually calls out that issue.

2. **Filter using progressive threshold table** -- higher impact needs less confidence:

   | Impact Score | Min Confidence Required | Rationale |
   |--------------|------------------------|-----------|
   | 81-100 (Critical) | 50 | Critical issues warrant investigation even with moderate confidence |
   | 61-80 (High) | 65 | High impact needs good confidence to avoid false alarms |
   | 41-60 (Medium) | 75 | Medium issues need high confidence to justify addressing |
   | 21-40 (Medium-Low) | 85 | Low-medium impact needs very high confidence |
   | 0-20 (Low) | 95 | Minor issues only if nearly certain |

   **Filter out issues not meeting min confidence threshold for their impact level.** If none meet criteria, do not proceed.

   **Do NOT post inline comments for:**
   - **Issues below configured `MIN_IMPACT` level** -- impact score below `MIN_IMPACT_SCORE` (from `--min-impact`, default: `high` / 61) excluded.
   - **Low confidence issues** -- below min confidence threshold for their impact level excluded entirely.

   Focus inline comments on issues at or above `MIN_IMPACT` level meeting confidence thresholds.

3. Use Haiku agent to re-check PR eligibility from Phase 1 (in case updates since review started).
4. **Post Inline Comments Only** (skip if no issues):

   a. **Preferred -- Use MCP GitHub tools if available**:
      - Use `mcp__github_inline_comment__create_inline_comment` for line-specific feedback per issue.

   b. Fallback -- direct API calls:
      - Check if `git:attach-review-to-pr` command available.
      - If available and issues found:
         - **Multiple Issues**: `gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews` with review body + comments array.
         - **Single Issue**: `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments` for one line-specific comment.

   When writing comments:
   - Keep brief
   - Use emojis
   - Link and cite relevant code, files, URLs

#### False Positives (Phase 3)

- Pre-existing issues
- Looks like bug but isn't
- Pedantic nitpicks senior engineer wouldn't call out
- Issues linter/typechecker/compiler would catch (imports, type errors, formatting, style). Assume CI runs these separately.
- General code quality issues (coverage, documentation) unless required in CLAUDE.md
- Issues called out in CLAUDE.md but explicitly silenced in code (lint ignore comment)
- Functionality changes likely intentional or related to broader change
- Real issues on lines user didn't modify

Notes:

- Use build, lint, test commands if available to find non-obvious issues
- Use `gh` for Github interaction (fetch PR, create inline comments), not web fetch
- Make todo list first
- Cite and link each bug (if referring to CLAUDE.md, link it)
- For line-specific comments via `git:attach-review-to-pr`:
  - Each issue maps to specific file + line number
  - Multiple issues: `gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews` with JSON containing review body (Quality Gate summary) + comments array
  - Single issue: `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments`

### Template for line-specific review comments

Via `git:attach-review-to-pr`, use per issue:

```markdown
🔴/🟠/🟡/🟢 [Critical/High/Medium/Low]: [Brief description]

[Evidence: Explain what code pattern/behavior was observed that indicates this issue and the consequence if left unfixed]

[If applicable, provide code suggestion]:
```suggestion
[code here]
```

```

#### Example: Bug Issue

```markdown
🟠 High: Potential null pointer dereference

Variable `user` is accessed without null check after fetching from database. This will cause runtime error if user is not found, breaking the user profile feature.

```suggestion
if (!user) {
  throw new Error('User not found');
}
```

```

#### Example: Security Issue

```markdown
🔴 Critical: SQL Injection vulnerability

User input is directly concatenated into SQL query without sanitization. Attackers can execute arbitrary SQL commands, leading to data breach or deletion.

Use parameterized queries instead:
```suggestion
db.query('SELECT * FROM users WHERE id = ?', [userId])
```

```

### Template for inline comments using GitHub API

#### Multiple Issues (using `/reviews` endpoint)

Via `gh api repos/{owner}/{repo}/pulls/{pr_number}/reviews`, each comment in `comments` array uses line-specific template above.

#### Single Issue (using `/comments` endpoint)

Via `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments`, post one line-specific comment using template above.

**Linking to code:**

- Use full git sha + line range, eg. `https://github.com/owner/repo/blob/1d54823877c4de72b2316a64032a54afc404e619/README.md#L13-L17`
- Line range format: `L[start]-L[end]`
- Provide at least 1 line of context before and after

**Evaluation:**

- **Security First**: High or Critical security issue automatically becomes blocker
- **Quantify Everything**: Use numbers, not "some", "many", "few"
- **Skip Trivial Issues** in large PRs (>500 lines): Focus on architectural and security issues

#### No Issues Found

Do not post comments. Report to user no issues found.

## Remember

Goal: catch bugs and security issues, improve code quality while maintaining velocity. Be thorough but pragmatic. Focus on code safety and maintainability, not perfection.
