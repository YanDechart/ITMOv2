Practice 4 — Password Policy Checker (Handoff)

Audience: A fresh agent session with no prior conversation history.

Summary
- Goal: A small, standard-library-only Python project that checks passwords against a policy (Feature A) and produces improvement suggestions (Feature B). Keep edits minimal, focused, and covered by tests.
- Implementation lives in practices/practice_04/password_checker/ with unittests in practices/practice_04/tests/.

What’s already completed
- Base behavior: check_password(password: str) validates input type and returns {"length": <int>}.
- Feature A: Policy validation via check_policy(password: str) returning a list of violation keys.
  - Rules: minimum 12 characters ("min_length"), at least one uppercase ("uppercase"), at least one digit ("digit"), at least one special character from string.punctuation ("special").
  - Tested in practices/practice_04/tests/test_password_policy.py.
- Feature B: Human‑readable suggestions via suggest_improvements(password: str), mapping violations to messages.
  - Mapping: min_length → "Use at least 12 characters.", uppercase → "Include at least one uppercase letter.", digit → "Include at least one digit.", special → "Include at least one special character."
  - Tested in practices/practice_04/tests/test_password_suggestions.py.
- Custom MCP server (practice4-password): practices/practice_04/mcp_server.py exposes one tool check_password_policy and delegates to check_policy + suggest_improvements (no duplicated logic). Configured in opencode.json.
- Automatic check-after-edit hook: .opencode/plugins/check-after-edit runs the Practice 4 verification script after edits and posts PASS/FAIL to the active OpenCode session.
- TDD skill: .opencode/skills/test-driven-development provides a concise RED → GREEN → VERIFY workflow tailored for this project.
- Context7 MCP: Configured in opencode.json as "context7" for up-to-date library/framework documentation queries.

Feature A behavior
- Function: practices/practice_04/password_checker/__init__.py → check_policy(password: str) -> list[str].
- Input validation: non-strings raise TypeError("password must be a string, got <type>").
- Returns an ordered list of violation keys (subset of: min_length, uppercase, digit, special). No violations → []

Feature B behavior
- Function: suggest_improvements(password: str) -> list[str].
- Delegates validation to check_policy; preserves the same TypeError message for non-string inputs.
- Returns human‑readable suggestions corresponding to each violation; [] when compliant.

How to run the Practice 4 verification script
- Full suite (script):
  - bash practices/practice_04/scripts/check.sh
- Full suite (direct unittest):
  - python3 -m unittest discover -s practices/practice_04 -p 'test*.py'

Automatic check-after-edit hook
- Location: .opencode/plugins/check-after-edit/index.ts
- Behavior: Watches practices/practice_04 for changes, runs scripts/check.sh, and posts a steering message to the active OpenCode session with “[Practice 4 Check] PASS/FAIL” and test output. Ignores __pycache__ and *.pyc.
- Also writes a temp summary to $TMPDIR/opencode/practice4-check-latest.json.

Test‑Driven‑Development skill
- Location: .opencode/skills/test-driven-development/SKILL.md
- Use: Follow RED (write/confirm failing test) → GREEN (smallest change to pass) → VERIFY (run full suite; review diff).
- Constraints: Use only Python stdlib, keep changes small, preserve existing behavior unless the task changes it, and update/add tests when behavior changes.

Context7 MCP
- Config: opencode.json → mcp.servers.context7 remote endpoint.
- Purpose: Fetch current documentation for libraries, frameworks, SDKs, CLIs, and cloud services. Use it for doc lookups even for well-known tools; not for general refactors or business logic.

Custom MCP: practice4-password and its tool
- Server: opencode.json → mcp.servers.practice4-password runs ["python3", "practices/practice_04/mcp_server.py"].
- Tool: check_password_policy
  - Input: { "password": "<string>" }
  - Success result content (JSON text): { "violations": ["…"], "suggestions": ["…"] }
- Errors: OpenCode may reject a non‑string password during tool input‑schema validation before the server executes (client‑side argument error). The Python server also implements JSON‑RPC -32602 with the same TypeError message when invalid input reaches it.
- In OpenCode, call the MCP tool from the practice4-password server to validate passwords using the project’s implementation.

Separate worktree/branch for Feature B and merge
- Branches:
  - practice_4 (current HEAD)
  - practice-04-b (Feature B: suggestions)
- History (git log --graph --oneline):
  - 073c120 feat(practice-4): add password policy checker and agent environment (Feature A)
  - b8868c0 feat(practice-4): add password improvement suggestions (Feature B) on practice-04-b
  - fdd6e57 feat(practice-4): add password policy MCP server (on practice_4, includes Feature B)
- Merge note: Feature B branch (practice-04-b) was fast‑forward merged into practice_4; HEAD includes both A and B.

Current test status
- As of this handoff, all tests pass locally:
  - Ran 14 tests with OK.
- Re‑run to confirm in your environment using the commands above.

What still remains to finish the assignment (per README)
- Ensure you can demonstrate the configured environment in action (AGENTS.md rules applied, TDD skill referenced, MCP tool invoked, and automatic verification observed).
- Provide brief confirmations of real runs: successful MCP tool call and an error case (non‑string password), plus test outputs from the hook or script.
- Write reflection.md with concrete observations on what helped, what hindered, and any interventions.
- Optional: prepare a short HTML presentation with deep links, or plan to demonstrate live.

Important constraints (from AGENTS.md)
- Use only the Python standard library unless explicitly instructed otherwise.
- Preserve existing behavior unless the current task explicitly changes it.
- Make small, focused changes; when behavior changes, add/update unit tests accordingly.
- Verify locally with: python3 -m unittest discover -s practices/practice_04 -p 'test*.py'
- Do not modify course files:
  - practices/practice_04/README.md
  - practices/practice_04/presentation.pdf
  - practices/practice_04/presentation.pptx
- Do not touch files outside practices/practice_04/.
- Do not commit changes unless explicitly asked.

Quick start for a fresh agent
- Open the repository in OpenCode. The MCP servers (context7 and practice4-password) and the check-after-edit plugin are configured via opencode.json and .opencode/.
- Run the verification: bash practices/practice_04/scripts/check.sh (or use the automatic hook by editing a Practice 4 file).
- For documentation lookups, query the Context7 MCP. For password checks via MCP, call practice4-password.check_password_policy.
