import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { createScheduleService } from "../js/schedule-service.mjs";
import {
  createScheduleController,
  mapErrorToMessage
} from "../js/schedule-controller.mjs";
import { formatOptional } from "../js/schedule-view.mjs";

const TEST_NOW = () => new Date("2026-11-02T12:00:00+03:00");

function lesson(overrides = {}) {
  return {
    subject: "Алгоритмы",
    startTime: "10:00",
    endTime: "11:30",
    room: "Ауд. 101",
    teacher: "Иванов И.И.",
    ...overrides
  };
}

function validData() {
  return {
    student: { name: "Тестовый Студент", group: "P0001" },
    days: Array.from({ length: 7 }, (_, index) => ({
      dayId: index + 1,
      label: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index],
      lessons:
        index === 0
          ? [
              lesson({ subject: "Поздняя пара", startTime: "12:00", endTime: "13:30" }),
              lesson({ subject: "Ранняя пара", startTime: "08:20", endTime: "09:50" })
            ]
          : index === 1
            ? [lesson({ subject: "Вторник", room: "", teacher: undefined })]
            : [],
      isEmpty: index > 1
    }))
  };
}

function recordingView() {
  const record = {
    states: [],
    profile: null,
    days: null,
    selectedDayId: null,
    disabled: false
  };

  return {
    record,
    renderStudent(student) {
      record.profile = structuredClone(student);
    },
    renderDays(days, context) {
      record.days = structuredClone(days);
      record.dayContext = { ...context };
    },
    setSelectedDay(dayId) {
      record.selectedDayId = dayId;
    },
    setInteractionsDisabled(disabled) {
      record.disabled = disabled;
      record.states.push({ type: disabled ? "disabled" : "enabled" });
    },
    showLoading() {
      record.states.push({ type: "loading" });
    },
    showSuccess(day) {
      record.states.push({ type: "success", day: structuredClone(day) });
    },
    showEmpty(day) {
      record.states.push({ type: "empty", day: structuredClone(day) });
    },
    showError(message) {
      record.states.push({ type: "error", message });
    }
  };
}

function stateTypes(view) {
  return view.record.states.map((state) => state.type);
}

test("real service and UI controller complete loading → success", async () => {
  const service = createScheduleService(async () => validData());
  const view = recordingView();
  const controller = createScheduleController({ service, view, now: TEST_NOW });

  const startedAt = performance.now();
  await controller.start();

  assert.deepEqual(stateTypes(view), ["loading", "success"]);
  assert.deepEqual(view.record.profile, { name: "Тестовый Студент", group: "P0001" });
  assert.equal(view.record.days.length, 7);
  assert.equal(view.record.selectedDayId, 1);
  assert.deepEqual(
    view.record.states.at(-1).day.lessons.map((item) => item.subject),
    ["Ранняя пара", "Поздняя пара"]
  );
  assert.ok(performance.now() - startedAt < 1000);
});

test("selecting an empty day completes loading → empty without error", async () => {
  const service = createScheduleService(async () => validData());
  const view = recordingView();
  const controller = createScheduleController({ service, view, now: TEST_NOW });
  await controller.start();

  await controller.selectDay(7);
  assert.deepEqual(stateTypes(view).slice(-2), ["loading", "empty"]);
  assert.equal(view.record.states.at(-1).day.isEmpty, true);
  assert.equal(view.record.selectedDayId, 7);
});

test("real view formatting converts missing optional fields to an em dash", async () => {
  const service = createScheduleService(async () => validData());
  await service.init();
  const tuesday = await service.getDay(2);

  assert.equal(formatOptional(tuesday.lessons[0].room), "—");
  assert.equal(formatOptional(tuesday.lessons[0].teacher), "—");
  assert.equal(formatOptional(" Ауд. 101 "), "Ауд. 101");
});

test("a load error followed by retry reaches success through the real service", async () => {
  let attempts = 0;
  const service = createScheduleService(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary outage");
    return validData();
  });
  const view = recordingView();
  const controller = createScheduleController({ service, view, now: TEST_NOW });

  await controller.start();
  assert.equal(view.record.states.at(-1).type, "error");
  assert.equal(view.record.states.at(-1).message, "Не удалось загрузить расписание. Повторите попытку.");

  await controller.retry();
  assert.deepEqual(stateTypes(view).slice(-4), ["disabled", "loading", "success", "enabled"]);
  assert.equal(attempts, 2);
  assert.equal(view.record.selectedDayId, 1);
});

test("invalid real data is mapped to the validation UI message", async () => {
  const invalid = validData();
  invalid.days[0].lessons[0].subject = "";
  const service = createScheduleService(async () => invalid);
  const view = recordingView();
  const controller = createScheduleController({ service, view, now: TEST_NOW });

  await controller.start();
  assert.equal(view.record.states.at(-1).type, "error");
  assert.equal(view.record.states.at(-1).message, "Некорректные данные расписания.");
  assert.equal(
    mapErrorToMessage({ type: "DomainError", code: "INVALID_DAY" }),
    "Выбран неверный день."
  );
});

test("latest-wins ignores a stale error after a newer real result", async () => {
  const realService = createScheduleService(async () => validData());
  const releases = new Map();
  let delayed = false;
  const delayedService = {
    init: () => realService.init(),
    getStudent: () => realService.getStudent(),
    getWeek: () => realService.getWeek(),
    retry: () => realService.retry(),
    getDay(dayId) {
      if (!delayed) return realService.getDay(dayId);
      return new Promise((resolvePromise, rejectPromise) => {
        releases.set(dayId, async () => {
          if (dayId === 2) {
            rejectPromise({ type: "LoadError", code: "DATA_UNAVAILABLE", message: "stale" });
            return;
          }
          try {
            resolvePromise(await realService.getDay(dayId));
          } catch (error) {
            rejectPromise(error);
          }
        });
      });
    }
  };

  const view = recordingView();
  const controller = createScheduleController({ service: delayedService, view, now: TEST_NOW });
  await controller.start();
  delayed = true;

  const staleRequest = controller.selectDay(2);
  const currentRequest = controller.selectDay(3);
  await releases.get(3)();
  await currentRequest;
  await releases.get(2)();
  await staleRequest;

  const terminalStates = view.record.states.filter((state) =>
    ["success", "empty", "error"].includes(state.type)
  );
  assert.equal(terminalStates.at(-1).type, "empty");
  assert.equal(terminalStates.at(-1).day.dayId, 3);
  assert.equal(
    terminalStates.some((state) => state.type === "error" && state.message.includes("загрузить")),
    false
  );
  assert.equal(view.record.selectedDayId, 3);
});

async function availablePort() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? rejectPromise(error) : resolvePromise(port)));
    });
  });
}

async function waitUntilReady(url) {
  let lastError;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 75));
  }
  throw lastError || new Error("HTTP server did not become ready");
}

test("the complete app is available from a local HTTP server", { timeout: 10000 }, async (context) => {
  const testDirectory = dirname(fileURLToPath(import.meta.url));
  const practiceDirectory = resolve(testDirectory, "..");
  const port = await availablePort();
  const server = spawn(
    "python3",
    ["-m", "http.server", String(port), "--bind", "127.0.0.1"],
    { cwd: practiceDirectory, stdio: "ignore" }
  );

  context.after(() => {
    if (!server.killed) server.kill("SIGTERM");
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitUntilReady(`${baseUrl}/`);

  const [page, styles, appModule, data] = await Promise.all([
    fetch(`${baseUrl}/`),
    fetch(`${baseUrl}/styles.css`),
    fetch(`${baseUrl}/js/app.mjs`),
    fetch(`${baseUrl}/data/schedule.json`)
  ]);

  for (const response of [page, styles, appModule, data]) assert.equal(response.status, 200);
  const html = await page.text();
  assert.match(html, /Mini My ITMO/);
  assert.match(html, /type="module" src="\.\/js\/app\.mjs"/);
  assert.match(await styles.text(), /\.day-selector/);
  assert.match(await appModule.text(), /createScheduleController/);
  const json = await data.json();
  assert.equal(json.days.length, 7);
});
