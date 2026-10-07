// OpenCode V2 plugin: run Practice 4 verification after edits (TypeScript)
// This plugin runs the trusted runner (our check.sh) after the agent edits project files
// and returns PASS/FAIL to the agent. It does not modify project files.

import { Plugin } from "@opencode/plugin"
import fsp from "node:fs/promises"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

export default Plugin.define({
  id: "practice4.check-after-edit",
  async setup(ctx) {
    // Avoid recursive triggering by tagging our own synthetic messages
    const SELF_TAG = "practice4-check"

    // Track the active session ID from session/execution events
    let activeSessionID: string | undefined
    const eventsAbort = new AbortController()
    ;(async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: eventsAbort.signal })) {
          // Session/execution events carry the sessionID
          // Types come from @opencode/client generated EventSubscribeOutput
          // Using runtime checks to avoid importing types here
          if (
            event &&
            typeof (event as any).type === "string" &&
            (event as any).data &&
            typeof (event as any).data.sessionID === "string"
          ) {
            const type = (event as any).type as string
            if (type === "session.execution.started" || type === "session.step.started") {
              activeSessionID = (event as any).data.sessionID as string
            }

            // Capture sessionID from file-editing tool events within this project
            if (
              type === "session.tool.called" ||
              type === "session.tool.success" ||
              type === "session.tool.failed"
            ) {
              const ev: any = event as any
              const locDir: string | undefined = ev?.location?.directory
              const thisProjectDir = ctx.location.project?.directory ?? ctx.location.directory
              // For any tool event originating from this project directory, capture the sessionID
              if (locDir === thisProjectDir) {
                activeSessionID = ev.data.sessionID as string
              }
            }
          }
        }
      } catch {
        // Swallow subscription errors; plugin will clean up on unload
      }
    })()

    // Helper to run the check script and summarize result
    async function runCheck(): Promise<{ pass: boolean; output: string }> {
      const projectRoot = ctx.location.project?.directory ?? ctx.location.directory
      const script = `${projectRoot}/practices/practice_04/scripts/check.sh`
      const execFileAsync = promisify(execFile)

      try {
        const { stdout = "" } = await execFileAsync(script, {
          cwd: projectRoot,
          timeout: 120_000,
          encoding: "utf8",
          env: process.env,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer to avoid truncation
        } as any)
        // execFile resolves on exit code 0 -> tests passed
        return { pass: true, output: stdout }
      } catch (error: unknown) {
        const err = error as { message?: string; stdout?: string; stderr?: string }
        const message = typeof err?.message === "string" ? err.message : String(error)
        const stdout = err?.stdout ?? ""
        const stderr = err?.stderr ?? ""
        const output = [message, stdout, stderr].filter(Boolean).join("\n").trim()
        return { pass: false, output }
      }
    }

    // File-system watcher: run verification automatically after edits to Practice 4 files.
    // Debounced, ignores __pycache__/ and *.pyc to avoid loops from test artifacts.
    const projectRoot = ctx.location.project?.directory ?? ctx.location.directory
    const practiceDir = path.join(projectRoot, "practices", "practice_04")

    // Ensure directory exists before watching
    try {
      await fsp.access(practiceDir)
    } catch {
      // Nothing to watch
      return
    }

    let debounceTimer: NodeJS.Timeout | undefined
    let running = false

    const shouldIgnore = (file: string | undefined): boolean => {
      // If filename is missing, do not ignore solely on that basis; macOS may omit it
      if (!file) return false
      return (
        file.includes("__pycache__") ||
        file.endsWith(".pyc") ||
        file.endsWith(".pyo") ||
        file.includes(".pytest_cache")
      )
    }

    const scheduleRun = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(async () => {
        if (running) return
        running = true
        try {
          const { pass, output } = await runCheck()
          const statusText = pass ? "PASS" : "FAIL"
          const summary = `[Practice 4 Check] ${statusText}\n\n${output}`.trim()
          // Post result to the active session (steer delivery) when available
          if (activeSessionID) {
            await ctx.session.synthetic({
              sessionID: activeSessionID,
              text: summary,
              metadata: { source: SELF_TAG },
              delivery: "steer",
            })
          }
          // Optional: write a temp status file for out-of-band checks
          try {
            const outDir = path.join(os.tmpdir(), "opencode")
            await fsp.mkdir(outDir, { recursive: true })
            const outPath = path.join(outDir, "practice4-check-latest.json")
            await fsp.writeFile(
              outPath,
              JSON.stringify({ timestamp: Date.now(), pass, output }, null, 2),
              "utf8",
            )
          } catch {
            // ignore temp write errors
          }
        } finally {
          running = false
        }
      }, 400)
    }

    const watcher = fs.watch(practiceDir, { recursive: true }, (_eventType, filename) => {
      // If filename provided and it's a cache artifact, ignore; otherwise schedule
      if (filename && shouldIgnore(String(filename))) return
      scheduleRun()
    })

    return () => {
      try {
        watcher.close()
      } catch {}
      try {
        eventsAbort.abort()
      } catch {}
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  },
})
