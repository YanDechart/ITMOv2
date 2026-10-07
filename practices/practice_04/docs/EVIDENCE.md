Practice 4 — Evidence Checklist

This file lists concrete evidence from the repository, HANDOFF.md, reflection.md, git history, and live verification performed now.

1) Environment
- AGENTS.md exists and served as the project contract:
  - Path: practices/practice_04/AGENTS.md
  - Scope/constraints and the verification command are documented there.
- TDD skill and RED → GREEN → VERIFY workflow:
  - Path: .opencode/skills/test-driven-development/SKILL.md
  - Used to guide small, focused changes with fast verification.
- Context7 MCP configuration:
  - Path: opencode.json → mcp.servers.context7 (type: remote, url: https://mcp.context7.com/mcp)
- Automatic check-after-edit hook and verification command:
  - Hook path: .opencode/plugins/check-after-edit/index.ts (watches practices/practice_04, runs scripts/check.sh, posts “[Practice 4 Check] …”).
  - Verification command: bash practices/practice_04/scripts/check.sh (also python3 -m unittest discover -s practices/practice_04 -p 'test*.py').
- Why Context7 and the automatic hook:
  - Context7 provides current docs lookups without adding dependencies to this stdlib-only project.
  - The automatic hook shortens the feedback loop by running the full suite on edits and delivering PASS/FAIL to the active session.

2) Feature A / TDD
- Commit (Feature A):
  - Hash: 073c120
  - Message: feat(practice-4): add password policy checker and agent environment
- Tests covering Feature A:
  - Path: practices/practice_04/tests/test_password_policy.py
- Current verification result:
  - Ran via scripts/check.sh → PASS (14 tests OK).

3) Feature B / Worktree
- Commit (Feature B):
  - Hash: b8868c0 (on branch practice-04-b)
  - Message: feat(practice-4): add password improvement suggestions
- Branch/worktree workflow:
  - practice-04-b used for Feature B; later fast-forward merged into practice_4.
- Evidence Feature B is present on practice_4 after merge:
  - Git log shows fdd6e57 (MCP server) atop b8868c0 (suggestions) and 073c120 (policy). HEAD on practice_4 includes both A and B.
- Tests covering Feature B:
  - Path: practices/practice_04/tests/test_password_suggestions.py

4) Automatic hook
- Demonstrated automatic PASS after an edit without manually running tests:
  - Evidence documented in reflection.md and HANDOFF.md. The plugin watches Practice 4, runs scripts/check.sh, and posted “[Practice 4 Check] PASS” after an edit.
  - Note: Exact historical terminal output is not stored in the repo; this is recorded as documented demonstration evidence, not fabricated output.

5) MCP
- opencode mcp list (current):
  - context7 connected
  - practice4-password connected
- Context7 connected: Confirmed above; configured in opencode.json.
- practice4-password connected: Confirmed above; configured in opencode.json to run ["python3", "practices/practice_04/mcp_server.py"].
- Custom tool and implementation path:
  - Tool: check_password_policy
  - Implementation: practices/practice_04/mcp_server.py delegates to password_checker.check_policy + suggest_improvements.
- Real OpenCode MCP tool calls (practice4-password.check_password_policy):
  - Successful call now:
    - Input: { "password": "Abcdefghij9!" }
    - Result: { "violations": [], "suggestions": [] }
  - Invalid-input call now:
    - Input: { "password": 123 }
    - Result: Error: Invalid arguments for tool "practice4-password_check_password_policy":
      - password: Expected string

      Arguments provided:
      {
        "password": 123
      }

      Update the arguments and call the tool again.

6) Handoff
- HANDOFF.md path: practices/practice_04/docs/HANDOFF.md
- A fresh OpenCode session read AGENTS.md and HANDOFF.md and ran the verification suite successfully in this session.
- Current test result: PASS (14 tests OK).

7) Reflection
- Path: practices/practice_04/reflection.md
- Key human-intervention topics documented:
  - Debugging the check-after-edit hook and correlating the active session via session.tool.called/success/failed events.
  - Understanding that session.tool.* event.data.id is a call ID, not a tool name, and adjusting routing accordingly.
  - Restoring plugin dependencies (npm install) in the Feature B worktree for .opencode/plugins/check-after-edit.
  - MCP protocol/schema alignment (initialize/serverInfo, tools capability, inputSchema naming, tools/call result format).
  - Human review prior to commits and before the fast-forward merge; explicit MCP success and invalid-input checks.
