const GENERIC_LOAD_MESSAGE = "Не удалось загрузить расписание. Повторите попытку.";

export function mapErrorToMessage(error) {
  if (error?.type === "ValidationError") return "Некорректные данные расписания.";
  if (error?.type === "DomainError" && error?.code === "INVALID_DAY") {
    return "Выбран неверный день.";
  }
  return GENERIC_LOAD_MESSAGE;
}

export function toIsoDay(date) {
  return date.getDay() || 7;
}

export function createScheduleController({ service, view, now = () => new Date() }) {
  if (!service || !view) throw new TypeError("Controller requires service and view");

  let currentDayId = toIsoDay(now());
  let requestId = 0;
  let retrying = false;

  function isCurrent(token, dayId = currentDayId) {
    return token === requestId && dayId === currentDayId;
  }

  function renderDay(day) {
    if (day.isEmpty || day.lessons.length === 0) {
      view.showEmpty(day);
      return;
    }
    view.showSuccess(day);
  }

  async function refreshChrome(token) {
    const [student, week] = await Promise.all([service.getStudent(), service.getWeek()]);
    if (token !== requestId) return null;
    view.renderStudent(student);
    view.renderDays(week.days, {
      todayId: toIsoDay(now()),
      currentDayId
    });
    return week;
  }

  async function resolveDay(dayId, token) {
    try {
      const day = await service.getDay(dayId);
      if (!isCurrent(token, dayId)) return;
      renderDay(day);
    } catch (error) {
      if (!isCurrent(token, dayId)) return;
      view.showError(mapErrorToMessage(error));
    }
  }

  async function start() {
    const token = ++requestId;
    currentDayId = toIsoDay(now());
    view.showLoading();
    try {
      await service.init();
      if (token !== requestId) return;
      await refreshChrome(token);
      if (!isCurrent(token)) return;
      view.setSelectedDay(currentDayId);
      await resolveDay(currentDayId, token);
    } catch (error) {
      if (token !== requestId) return;
      view.showError(mapErrorToMessage(error));
    }
  }

  async function selectDay(dayId) {
    if (retrying) return;
    currentDayId = dayId;
    const token = ++requestId;
    view.setSelectedDay(dayId);
    view.showLoading();
    await resolveDay(dayId, token);
  }

  async function retry() {
    if (retrying) return;
    retrying = true;
    const token = ++requestId;
    view.setInteractionsDisabled(true);
    view.showLoading();

    try {
      await service.retry();
      if (token !== requestId) return;
      await refreshChrome(token);
      if (!isCurrent(token)) return;
      view.setSelectedDay(currentDayId);
      await resolveDay(currentDayId, token);
    } catch (error) {
      if (token === requestId) view.showError(mapErrorToMessage(error));
    } finally {
      if (token === requestId) {
        retrying = false;
        view.setInteractionsDisabled(false);
      }
    }
  }

  return Object.freeze({ start, selectDay, retry });
}
