Practice 4 — Reflection

This reflection summarizes the actual setup and work documented in the repo and HANDOFF.md, focusing on what helped, what hindered, where human intervention was required, and brief conclusions.

1) What helped
- AGENTS.md as the project contract: It clearly scoped the work (stdlib-only, minimal changes, preserve behavior), pointed to the implementation/tests layout, and provided a single verification command. This reduced ambiguity and kept edits focused.
- TDD skill and RED → GREEN → VERIFY workflow: The dedicated skill (.opencode/skills/test-driven-development) reinforced a disciplined loop and aligned with the project’s small, focused changes. Feature A and B each have targeted tests (tests/test_password_policy.py, tests/test_password_suggestions.py), making verification fast and reliable.
- Context7 MCP for documentation: Configured in opencode.json. It provides up-to-date docs lookups for libraries/frameworks when needed, while the project itself remains stdlib-only. This avoided stale knowledge for any doc queries without adding new dependencies.
- Automatic check-after-edit hook: The OpenCode plugin (.opencode/plugins/check-after-edit) runs practices/practice_04/scripts/check.sh and posts PASS/FAIL back to the session, also writing a brief summary to $TMPDIR/opencode/practice4-check-latest.json. This gave immediate feedback after edits and kept the feedback loop tight.
- Separate worktree/branch for Feature B: Feature B was developed on practice-04-b and fast-forward merged into practice_4. This isolated suggestion-related changes and kept history clear while making it easy to verify that HEAD contains both A and B.
- HANDOFF.md for transferring context: It concisely restated goals, rules, commands, branch history, MCP configuration, and current test status (14 tests OK). This let a fresh agent resume without prior conversation history.
- Custom practice4-password MCP: The server (mcp.servers.practice4-password) starts practices/practice_04/mcp_server.py and exposes the check_password_policy tool. It delegates to check_policy + suggest_improvements so the policy logic stays in one place. OpenCode validates the tool’s input schema before the Python server executes; the server also implements JSON‑RPC -32602 handling for invalid input that reaches it. This ensured one source of truth and made it easy to validate via MCP.

2) What hindered
- Automatic check-after-edit feedback reliability: Initially, the hook did not consistently post feedback to the active session after edits. We learned that assuming a single “current session” is brittle; the hook must correlate to real session.tool events tied to the project path to target the correct session.
- Event schema misunderstanding: During debugging we discovered that session.tool.* event.data.id is a per-call ID rather than the tool name. Misinterpreting this caused incorrect routing. The fix—and lesson—was to derive identity from the event type (called/success/failed) plus its contextual metadata, not from the id alone.
- Verifying the hook end-to-end: After corrections, we validated by editing a Practice 4 file without running tests manually and observed the automatic “Practice 4 Check PASS” message. This highlighted the importance of verifying the full integration path, not just the script.
- Separate worktree plugin dependencies: In the Feature B worktree the OpenCode plugin failed to load because node_modules (ignored by git) was missing. Running npm install in .opencode/plugins/check-after-edit restored @opencode/plugin. We learned that each worktree needs explicit plugin bootstrapping.
- MCP protocol/schema alignment: The custom MCP server required adjustments (initialize/serverInfo, tools capability, inputSchema naming, tools/call result content format) before OpenCode accepted it. The lesson was to keep the server a thin adapter over library code and validate against OpenCode’s MCP expectations early.

3) Where human intervention was required
- Diagnosing and correcting the check-after-edit hook: We traced missing feedback to session correlation and updated the hook to capture the active session from session.tool.called/success/failed events associated with the Practice 4 directory. We learned to instrument event streams and reason about correlation instead of assuming state.
- Clarifying event identifiers: Recognizing that session.tool.* event.data.id is a call ID (not a tool name) changed how we keyed routing. The learning was to key by event type/context and avoid overloading opaque IDs.
- Restoring plugin dependencies in the Feature B worktree: Running npm install in .opencode/plugins/check-after-edit recreated the ignored local node_modules and fixed plugin loading. We learned that worktrees isolate local dependencies and require explicit setup.
- MCP protocol/schema corrections: We aligned initialize/serverInfo, tools capability, inputSchema naming, and tools/call result content to match OpenCode’s expectations. The lesson was to verify the contract using small real calls and keep the adapter thin.
- Human review before commits and merge: Changes were reviewed prior to committing and before the fast-forward merge from practice-04-b to practice_4. This preserved the small-changes discipline and ensured clean integration.
- Verifying MCP success and invalid-input paths: We executed both a valid tool call and a non-string input. The valid call returned no violations/suggestions. The invalid-input call (password=123) was rejected by OpenCode’s input‑schema validation before the Python MCP server ran, producing a client‑side argument error. The server does implement JSON‑RPC -32602 handling that mirrors the library’s TypeError for invalid input that reaches it, but that server path was not exercised in the observed OpenCode call.

4) Brief conclusions
- Useful environment connections: The combination of AGENTS.md constraints, the TDD skill, the check-after-edit hook, and the practice4-password MCP server created a tight, reliable loop: write/change code → immediate local and plugin-driven verification → MCP-level validation using the project’s own logic. Context7 MCP adds trustworthy, current docs when needed without altering the codebase.
- Possible improvements: Add lightweight telemetry or a brief status pane for the check-after-edit hook; include sample commands/snippets for invoking the MCP tool from within the repository docs; consider an integration test that exercises the MCP tool process as part of the suite; and provide a short template/checklist for the final demonstration steps (including the MCP success/error runs and captured outputs).

Appendix: What is implemented (from repo/HANDOFF)
- Feature A: check_policy(password) → ordered violation keys: [min_length, uppercase, digit, special].
- Feature B: suggest_improvements(password) → human-readable messages mapped from violations.
- Base behavior: check_password(password) returns {"length": int} and validates input type.
- MCP: practice4-password.check_password_policy delegates to library logic; observed behavior: OpenCode rejected a non-string password at tool-schema validation before server execution; the Python server implements JSON-RPC -32602 for invalid input that reaches it.
- Verification: scripts/check.sh or python3 -m unittest discover -s practices/practice_04 -p 'test*.py'; as of HANDOFF, 14 tests pass.
