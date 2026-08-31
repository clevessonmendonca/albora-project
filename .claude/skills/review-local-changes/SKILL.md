---
name: code-review:review-local-changes
description: Comprehensive review of local uncommitted changes using specialized agents with code improvement suggestions
argument-hint: "[review-aspects] [--min-impact critical|high|medium|medium-low|low] [--json]"
---

# Local Changes Review Instructions

Expert code reviewer. Thorough evaluation of local uncommitted changes. Review structured, systematic, actionable feedback with improvement suggestions.

**User Input:**

```text
$ARGUMENTS
```

**IMPORTANT**: Skip reviewing changes in `spec/` and `reports/` folders unless specifically asked.

---


## Rules

**Format:** `L<line>: <problem>. <fix>.` — or `<file>:L<line>: ...` for multi-file diffs.

**Severity prefix (optional, when mixed):**
- `🔴 bug:` — broken behavior, will cause incident
- `🟡 risk:` — works but fragile (race, missing null check, swallowed error)
- `🔵 nit:` — style, naming, micro-optim. Author can ignore
- `❓ q:` — genuine question, not suggestion

**Drop:**
- "I noticed that...", "It seems like...", "You might want to consider..."
- "This is just a suggestion but..." — use `nit:` instead
- "Great work!", "Looks good overall but..." — say once at top, not per comment
- Restating what line does — reviewer can read diff
- Hedging ("perhaps", "maybe", "I think") — if unsure use `q:`

**Keep:**
- Exact line numbers
- Exact symbol/function/variable names in backticks
- Concrete fix, not "consider refactoring this"
- The *why* if fix isn't obvious from problem statement

## Examples

❌ "I noticed that on line 42 you're not checking if the user object is null before accessing the email property. This could potentially cause a crash if the user is not found in the database. You might want to add a null check here."

✅ `L42: 🔴 bug: user can be null after .find(). Add guard before .email.`

❌ "It looks like this function is doing a lot of things and might benefit from being broken up into smaller functions for readability."

✅ `L88-140: 🔵 nit: 50-line fn does 4 things. Extract validate/normalize/persist.`

❌ "Have you considered what happens if the API returns a 429? I think we should probably handle that case."

✅ `L23: 🟡 risk: no retry on 429. Wrap in withBackoff(3).`

## Auto-Clarity

Drop terse mode for: security findings (CVE-class bugs need full explanation + reference), architectural disagreements (need rationale, not one-liner), onboarding contexts where author is new and needs the "why". Write normal paragraph, then resume terse for rest.

## Boundaries

Reviews only — no code fix, no approve/request-changes, no linters. Output comment(s) ready to paste into PR. "stop caveman-review" or "normal mode": revert to verbose review style.

## Command Arguments

Parse following arguments from `$ARGUMENTS`:

### Argument Definitions

| Argument | Format | Default | Description |
|----------|--------|---------|-------------|
| `review-aspects` | Free text | None | Optional review aspects or focus areas (e.g., "security, performance") |
| `--min-impact` | `--min-impact <level>` | `high` | Minimum impact level for reported issues. Values: `critical`, `high`, `medium`, `medium-low`, `low` |
| `--json` | Flag | `false` | Output results in JSON format instead of markdown |

### Flag Interaction

When `--min-impact` and `--json` used together, `--min-impact` filters issues in JSON output. Example: `--min-impact medium --json` outputs only issues with impact score 41+, formatted as JSON. `--json` controls output format only, no filtering. `--min-impact` controls filtering only, works identically regardless of output format.

### Usage Examples

```bash
# Review all local changes with default settings (min-impact: high, markdown output)
/review-local-changes

# Focus on security and performance, lower the threshold to medium
/review-local-changes security, performance --min-impact medium

# Critical-only issues in JSON for programmatic consumption
/review-local-changes --min-impact critical --json
```

### Impact Level Mapping

| Level | Impact Score Range |
|-------|-------------------|
| `critical` | 81-100 |
| `high` | 61-80 |
| `medium` | 41-60 |
| `medium-low` | 21-40 |
| `low` | 0-20 |

### Configuration Resolution

Parse `$ARGUMENTS` and resolve configuration:

```
# Extract review aspects (free text, everything that is not a flag)
REVIEW_ASPECTS = all non-flag text from $ARGUMENTS

# Parse flags
MIN_IMPACT = --min-impact || "high"
JSON_OUTPUT = --json flag present (true/false)

# Resolve minimum impact score from level name
MIN_IMPACT_SCORE = lookup MIN_IMPACT in Impact Level Mapping:
  "critical"   -> 81
  "high"       -> 61
  "medium"     -> 41
  "medium-low" -> 21
  "low"        -> 0
```

## Review Workflow

Comprehensive code review of local uncommitted changes using multiple specialized agents, each focusing on different aspect of code quality. Follow steps precisely:

### Phase 1: Preparation

Run following commands in order:

1. **Determine Review Scope**
   - Check following commands to understand changes, use only commands that return amount of lines changed, not file content:
     - `git status --short`
     - `git diff --stat` (unstaged changes)
     - `git diff --cached --stat` (staged changes)
     - `git diff --name-only`
     - `git diff --cached --name-only`
   - **Staged vs unstaged**: Differentiate between staged (`git diff --cached`) and unstaged (`git diff`) changes. Review both by default. When reporting issues, indicate whether affected change is staged or unstaged so user knows which changes are ready to commit and which are still in progress.
   - Parse `$ARGUMENTS` per Command Arguments section above to resolve `REVIEW_ASPECTS`, `MIN_IMPACT`, `MIN_IMPACT_SCORE`, and `JSON_OUTPUT`
   - If no changes, inform user and exit

2. Launch up to 6 parallel Haiku agents for following tasks:
   - One agent to search and return list of file paths to (not contents of) any relevant agent instruction files if they exist: CLAUDE.md, AGENTS.md, **/constitution.md, root README.md, any README.md files in directories whose files were modified
   - Split changed files by lines changed between other 1-5 agents and ask them:

      ```markdown
      GOAL: Analyse local uncommitted changes in following files and provide summary

      Perform following steps:
         - Run `git diff -- [list of files]` and `git diff --cached -- [list of files]` to see both unstaged and staged changes
         - Analyse following files: [list of files]

      Please return a detailed summary of the changes in each file, including types of changes, their complexity, affected classes/functions/variables/etc., and overall description of the changes. For each file, indicate whether changes are staged, unstaged, or both.
      ```

### Phase 2: Searching for Issues and Improvements

Determine Applicable Reviews, then launch up to 6 parallel (Sonnet or Opus) agents to independently code review all local changes. Agents should return list of issues and reason each issue was flagged (e.g. CLAUDE.md or constitution.md adherence, bug, historical git context, etc.).

**Note**: code-quality-reviewer agent should also provide code improvement and simplification suggestions with specific examples and reasoning.

**Available Review Agents**:

- **security-auditor** - Analyze code for security vulnerabilities
- **bug-hunter** - Scan for bugs and issues, including silent failures
- **code-quality-reviewer** - General code review for project guidelines, maintainability and quality. Simplifying code for clarity and maintainability
- **contracts-reviewer** - Analyze code contracts, including: type design and invariants (if new types added), API changes, data modeling, etc.
- **test-coverage-reviewer** - Review test coverage quality and completeness
- **historical-context-reviewer** - Review historical context of code, including git blame and history of modified code, and previous commits touching these files.

Default: run **all** applicable review agents.

#### Determine Applicable Reviews

Based on changes summary from phase 1 and complexity, determine applicable review agents:

- **Code or configuration changes, except purely cosmetic**: bug-hunter, security-auditor
- **Code changes, including business or infrastructure logic, formatting, etc.**: code-quality-reviewer (general quality)
- **Code or test files changed**: test-coverage-reviewer
- **Types, API, data modeling changed**: contracts-reviewer
- **High complexity changes or historical context needed**: historical-context-reviewer

#### Launch Review Agents

**Parallel approach**:

- Launch all agents simultaneously
- Provide full list of modified files and changes summary as context, explicitly highlight what local changes they are reviewing, also provide list of files with project guidelines and standards, including README.md, CLAUDE.md and constitution.md if they exist.
- Results should come back together

### Phase 3: Confidence & Impact Scoring

Phase uses `MIN_IMPACT_SCORE` resolved in Configuration Resolution block of Command Arguments above (default: 61 for `high`).

1. For each issue found in Phase 2, launch parallel Haiku agent that takes changes, issue description, and list of CLAUDE.md files (from step 2), and returns TWO scores:

   **Confidence Score (0-100)** - Confidence level that issue is real, not false positive:

   a. 0: Not confident. False positive that doesn't stand up to light scrutiny, or pre-existing issue.
   b. 25: Somewhat confident. Might be real issue, may also be false positive. Agent couldn't verify. If stylistic, not explicitly called out in relevant CLAUDE.md.
   c. 50: Moderately confident. Agent verified real issue, but might be nitpick or rare in practice. Relatively unimportant vs rest of changes.
   d. 75: Highly confident. Agent double-checked, verified very likely real issue hit in practice. Existing approach insufficient. Very important, directly impacts functionality, or explicitly mentioned in relevant CLAUDE.md.
   e. 100: Absolutely certain. Agent confirmed definitely real issue, happens frequently. Evidence directly confirms.

   **Impact Score (0-100)** - Severity and consequence if left unfixed:

   a. 0-20 (Low): Minor code smell or style inconsistency. No significant functional or maintainability impact.
   b. 21-40 (Medium-Low): Code quality issue hurting maintainability or readability, no functional impact.
   c. 41-60 (Medium): Causes errors under edge cases, degrades performance, or makes future changes difficult.
   d. 61-80 (High): Breaks core features, corrupts data under normal usage, or creates significant technical debt.
   e. 81-100 (Critical): Causes runtime errors, data loss, system crash, security breaches, or complete feature failure.

   For issues flagged via CLAUDE.md instructions, agent should verify CLAUDE.md actually calls out that issue specifically.

2. **Filter issues using progressive threshold table below** — Higher impact issues require less confidence to pass:

   | Impact Score | Minimum Confidence Required | Rationale |
   |--------------|----------------------------|-----------|
   | 81-100 (Critical) | 50 | Critical issues warrant investigation even with moderate confidence |
   | 61-80 (High) | 65 | High impact issues need good confidence to avoid false alarms |
   | 41-60 (Medium) | 75 | Medium issues need high confidence to justify addressing |
   | 21-40 (Medium-Low) | 85 | Low-medium impact issues need very high confidence |
   | 0-20 (Low) | 95 | Minor issues only included if nearly certain |

   **Filter out issues not meeting minimum confidence threshold for their impact level.** If no issues meet criteria, do not proceed.

   **IMPORTANT: Do NOT report:**
   - **Issues below configured `MIN_IMPACT` level** — Any issue with impact score below `MIN_IMPACT_SCORE` (resolved from `--min-impact` argument, default: `high` / 61) must be excluded.
   - **Low confidence issues** — Any issue below minimum confidence threshold for its impact level excluded entirely.

   **Filter application order**: Apply both filters sequentially. Issue must satisfy BOTH conditions to be included:
   1. **Min-impact cutoff (applied first)**: Exclude any issue with impact score below `MIN_IMPACT_SCORE` (resolved from `--min-impact` argument in Command Arguments section above, default: `high` / 61).
   2. **Progressive confidence threshold (applied second)**: For remaining issues, exclude any whose confidence score is below minimum required for its impact level (from progressive threshold table above).

   **Concrete example**: With `--min-impact medium` (MIN_IMPACT_SCORE = 41), consider issue with impact 45 (medium) and confidence 70. Step 1 passes: 45 >= 41. Step 2 fails: medium impact requires confidence >= 75, but issue has only 70. Result: **excluded**. Conversely, issue with impact 30 (medium-low) and confidence 95 excluded at Step 1 because 30 < 41, regardless of high confidence.

   Focus review report on issues passing both filters.

3. Format and output review report including:
   - All confirmed issues from Phase 2 that passed filtering
   - Code improvement suggestions from code-quality-reviewer agent
   - Prioritize improvements by impact and alignment with project guidelines

#### Examples of false positives, for Phase 3

- Pre-existing issues in unchanged code
- Something that looks like bug but isn't
- Pedantic nitpicks senior engineer wouldn't call out
- Issues linter, typechecker, or compiler would catch (e.g. missing or incorrect imports, type errors, broken tests, formatting issues, pedantic style issues like newlines). No need to run build steps — safe to assume they run separately in CI.
- General code quality issues (e.g. lack of test coverage, general security issues, poor documentation), unless explicitly required in CLAUDE.md
- Issues called out in CLAUDE.md but explicitly silenced in code (e.g. via lint ignore comment)
- Functionality changes likely intentional or directly related to broader change

Notes:

- Use build, lint and tests commands if available. Help find potential issues not obvious from code changes.
- Make todo list first
- Cite each bug/issue/suggestion with file path and line numbers

### Review Report Output

If `JSON_OUTPUT` is `true`, output report using JSON template below. Otherwise use markdown template.

#### Markdown Template

##### If you found issues or improvements

```markdown
# Local Changes Review Report

**Quality Gate**: PASS / FAIL
**Issues**: X critical, X high, X medium, X medium-low, X low
**Min Impact Filter**: [configured level]

---

## Issues

[For each issue, use this format:]

🔴/🟠/🟡/🟢 [Critical/High/Medium/Low]: [Brief description]
**File**: `path/to/file:lines`

[Evidence: What code pattern/behavior was observed and the consequence if left unfixed]

```language
[Suggestion: Optional fix or code suggestion]
```

---

## Improvements

[Code improvement suggestions from code-quality-reviewer, if any:]

1. **[Description]** - `file:location` - [Reasoning and benefit]
```

##### If you found no issues

```markdown
# Local Changes Review Report

**Quality Gate**: PASS
No issues found above the configured threshold.

**Checked**: bugs, security, code quality, test coverage, guidelines compliance
```

#### JSON Template

When `--json` flag set, output results in this JSON structure:

```jsonc
{
  "quality_gate": "PASS",       // "PASS" or "FAIL" - FAIL when any critical or high issue exists
  "summary": {
    "total_issues": 0,          // count of issues after both filters applied
    "critical": 0,              // count at impact 81-100
    "high": 0,                  // count at impact 61-80
    "medium": 0,                // count at impact 41-60
    "medium_low": 0,            // count at impact 21-40
    "low": 0                    // count at impact 0-20
  },
  "issues": [
    {
      "severity": "critical",   // severity label derived from impact_score range
      "file": "src/auth/session.ts",
      "lines": "42-48",         // affected line range in the diff
      "description": "Session token not invalidated on password change",
      "evidence": "Old sessions remain active after credential reset, allowing unauthorized access",
      "impact_score": 90,       // 0-100, maps to severity level (see Impact Level Mapping)
      "confidence_score": 80,   // 0-100, likelihood issue is real (see Confidence Score rubric)
      "suggestion": "Call invalidateAllSessions(userId) before issuing new token"  // optional fix
    },
    {
      "severity": "medium",
      "file": "src/api/handlers.ts",
      "lines": "115-120",
      "description": "Missing error handling for database timeout",
      "evidence": "Database query has no timeout or retry logic, will hang indefinitely under load",
      "impact_score": 55,
      "confidence_score": 78,
      "suggestion": "Add timeout option to query call and wrap in try/catch with retry"
    }
  ],
  "improvements": [             // from code-quality-reviewer agent; may be empty array
    {
      "description": "Improvement description",
      "file": "path/to/file",
      "location": "function/method/class",  // target symbol or code region
      "reasoning": "Why this improvement matters",
      "effort": "low"           // "low", "medium", or "high"
    }
  ]
}
```

`quality_gate` is `"FAIL"` if any critical or high severity issue exists, `"PASS"` otherwise. `suggestion` field in issues is optional, may be omitted.

## Evaluation Guidelines

- **Pre-Commit Opportunity**: Review runs on uncommitted local changes, before code enters version history. Last line of defense: catch bugs, security holes, and contract violations while cheapest to fix. Issues found here never reach teammates or CI.
- **Security First**: Any High or Critical security issue automatically makes code not ready to commit
- **Quantify Everything**: Use numbers, not words like "some", "many", "few"
- **Be Pragmatic**: Focus on real issues and high-impact improvements
- **Skip Trivial Issues** in large changes (>500 lines):
  - Focus on architectural and security issues
  - Ignore minor naming conventions unless CLAUDE.md explicitly requires them
  - Prioritize bugs over style
- **Improvements Should Be Actionable**: Each suggestion should include concrete code examples
- **Consider Effort vs Impact**: Prioritize improvements with high impact and reasonable effort
- **Align with Project Standards**: Reference CLAUDE.md and project guidelines when suggesting improvements
- **Terminal Readability**: Report consumed in terminal/console. Use fixed-width-friendly formatting: short lines, clear section separators (`---`), concise tables. Avoid deeply nested bullet lists or long prose paragraphs that wrap poorly in narrow terminals.

## Remember

Goal: catch bugs and security issues, improve code quality while maintaining development velocity — not enforce perfection. Thorough but pragmatic, focus on what matters for code safety, maintainability, and continuous improvement.

Review happens **before commit** — great opportunity to catch issues early and improve code quality proactively. Don't block reasonable changes for minor style issues — those can be addressed in future iterations.