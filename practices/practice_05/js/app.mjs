import { createScheduleService } from "./schedule-service.mjs";
import { createScheduleController } from "./schedule-controller.mjs";
import { createScheduleView } from "./schedule-view.mjs";

async function loadScheduleData() {
  const response = await fetch("./data/schedule.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Schedule request failed with HTTP ${response.status}`);
  }
  return response.json();
}

function boot() {
  const service = createScheduleService(loadScheduleData);
  const view = createScheduleView(document);
  const controller = createScheduleController({ service, view });

  view.bindDaySelect((dayId) => controller.selectDay(dayId));
  view.bindRetry(() => controller.retry());
  controller.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
