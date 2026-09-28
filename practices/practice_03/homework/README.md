Homework artifacts for Practice 3.

Reproduce A/B (from repo root):

1. Ensure runtime is prepared:
   - practices/practice_03/homework/runtime/opencode.json
   - practices/practice_03/homework/runtime/prompts/system_A.txt
   - practices/practice_03/homework/runtime/prompts/system_B.txt
   - practices/practice_03/homework/runtime/practices/practice_01
   - practices/practice_03/homework/runtime/practices/practice_02

2. Questions are in practices/practice_03/homework/questions/questions.md

3. Run each session separately, one question per run, with the same directory and model:

   opencode run --dir practices/practice_03/homework/runtime --agent hw-local-A --model ollama/itmo-agent --format json "<question>" > practices/practice_03/homework/results/A?.jsonl

   opencode run --dir practices/practice_03/homework/runtime --agent hw-local-B --model ollama/itmo-agent --format json "<question>" > practices/practice_03/homework/results/B?.jsonl

Do not combine runs; validate each JSONL after creation.

Speed benchmark (same dir/model):
- 1 warm-up (not recorded), then 3 measured runs; capture wall time and any available metrics.

Artifacts:
- Config: practices/practice_03/homework/runtime/opencode.json
- Prompts: practices/practice_03/homework/runtime/prompts/
- Questions: practices/practice_03/homework/questions/questions.md
- References: practices/practice_03/homework/references/expected.md
- Results: practices/practice_03/homework/results/*.jsonl
- Speed: practices/practice_03/homework/speed/*

Contents:
- config/opencode.json — OpenCode config with two agents: hw-local-A (baseline) and hw-local-B (strict). Identical model/limits; differ only by system prompt file.
- prompts/system_A.txt — Baseline system prompt.
- prompts/system_B.txt — Strict repository-grounded system prompt.
- questions/questions.md — Five questions for Practices 1–2.
- references/expected.md — Expected answers with file:line evidence and correctness criteria.
- results/ — Raw JSONL outputs for A1–A5 and B1–B5 (tool events included).
- speed/ — Warm-up and three warmed runs timing notes.

Run instructions (reproducible):
1. Ensure local Ollama API is running at http://localhost:11434/v1 with model tag ollama/itmo-agent available.
2. From repository root, run the ten sessions independently:
   - A1..A5 with agent hw-local-A, B1..B5 with agent hw-local-B.
3. Each command uses --dir set to the runtime directory and --format json. Examples:
   opencode run --dir practices/practice_03/homework/runtime --agent hw-local-A --model ollama/itmo-agent --format json "<question>" > practices/practice_03/homework/results/A1.jsonl
   opencode run --dir practices/practice_03/homework/runtime --agent hw-local-B --model ollama/itmo-agent --format json "<question>" > practices/practice_03/homework/results/B1.jsonl
4. Repeat for each question and both agents. Do not reuse sessions; each run is a fresh process.
5. For speed benchmark: perform one warm-up run, then three warmed runs with the same agent/model and prompt; record wall time. If tokens/sec is not provided, leave it as not available.

Notes:
- Tested model permissions are read-only tools: read, glob, grep. No write or shell.
- Do not place reference answers into any path visible to test agent.
