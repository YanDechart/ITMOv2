export function formatOptional(value) {
  return typeof value === "string" && value.trim() ? value.trim() : "—";
}

function element(document, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createScheduleView(document = globalThis.document) {
  const studentName = document.querySelector("#student-name");
  const studentGroup = document.querySelector("#student-group");
  const studentInitial = document.querySelector("#student-initial");
  const daysRoot = document.querySelector("#day-selector");
  const stateRoot = document.querySelector("#schedule-state");
  const scheduleTitle = document.querySelector("#schedule-title");

  if ([studentName, studentGroup, studentInitial, daysRoot, stateRoot, scheduleTitle].some((node) => !node)) {
    throw new Error("Mini My ITMO markup is incomplete");
  }

  let daySelectHandler = () => {};
  let retryHandler = () => {};

  daysRoot.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-day-id]");
    if (!button || button.disabled) return;
    daySelectHandler(Number(button.dataset.dayId));
  });

  stateRoot.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action='retry']");
    if (!button || button.disabled) return;
    retryHandler();
  });

  function bindDaySelect(handler) {
    daySelectHandler = handler;
  }

  function bindRetry(handler) {
    retryHandler = handler;
  }

  function renderStudent(student) {
    studentName.textContent = student.name;
    studentGroup.textContent = `Группа ${student.group}`;
    studentInitial.textContent = student.name.trim().charAt(0).toLocaleUpperCase("ru-RU");
  }

  function renderDays(days, { todayId, currentDayId }) {
    const fragment = document.createDocumentFragment();
    for (const day of days) {
      const button = element(document, "button", "day-button");
      button.type = "button";
      button.dataset.dayId = String(day.dayId);
      button.dataset.label = day.label;
      button.setAttribute("aria-pressed", String(day.dayId === currentDayId));
      button.setAttribute(
        "aria-label",
        day.dayId === todayId ? `${day.label}, сегодня` : day.label
      );

      button.append(element(document, "span", "day-label", day.label));
      button.append(
        element(
          document,
          "span",
          day.dayId === todayId ? "day-caption is-today" : "day-caption",
          day.dayId === todayId ? "Сегодня" : " "
        )
      );
      fragment.append(button);
    }
    daysRoot.replaceChildren(fragment);
    setSelectedDay(currentDayId);
  }

  function setSelectedDay(dayId) {
    for (const button of daysRoot.querySelectorAll("button[data-day-id]")) {
      const selected = Number(button.dataset.dayId) === dayId;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-selected", selected);
      if (selected) scheduleTitle.textContent = `Расписание · ${button.dataset.label}`;
    }
  }

  function setInteractionsDisabled(disabled) {
    for (const button of daysRoot.querySelectorAll("button[data-day-id]")) {
      button.disabled = disabled;
      button.setAttribute("aria-disabled", String(disabled));
    }
    const retry = stateRoot.querySelector("button[data-action='retry']");
    if (retry) retry.disabled = disabled;
  }

  function beginState(className) {
    stateRoot.setAttribute("aria-busy", "false");
    const section = element(document, "section", `schedule-panel ${className}`);
    return section;
  }

  function showLoading() {
    stateRoot.setAttribute("aria-busy", "true");
    const section = element(document, "section", "schedule-panel loading-state");
    const spinner = element(document, "span", "spinner");
    spinner.setAttribute("aria-hidden", "true");
    const copy = element(document, "div", "state-copy");
    copy.append(element(document, "h3", "state-title", "Загружаем расписание"));
    copy.append(element(document, "p", "state-description", "Это займёт всего несколько секунд."));
    section.append(spinner, copy);
    stateRoot.replaceChildren(section);
  }

  function lessonMeta(icon, label, value) {
    const item = element(document, "div", "lesson-meta-item");
    const iconNode = element(document, "span", "meta-icon", icon);
    iconNode.setAttribute("aria-hidden", "true");
    const copy = element(document, "span", "meta-copy");
    copy.append(element(document, "span", "meta-label", label));
    copy.append(element(document, "span", "meta-value", formatOptional(value)));
    item.append(iconNode, copy);
    return item;
  }

  function lessonCard(lesson) {
    const card = element(document, "article", "lesson-card");
    const time = element(document, "div", "lesson-time");
    time.append(element(document, "strong", "lesson-start", lesson.startTime));
    time.append(element(document, "span", "lesson-end", lesson.endTime));

    const content = element(document, "div", "lesson-content");
    content.append(element(document, "h3", "lesson-subject", lesson.subject));
    const meta = element(document, "div", "lesson-meta");
    meta.append(lessonMeta("⌖", "Аудитория", lesson.room));
    meta.append(lessonMeta("●", "Преподаватель", lesson.teacher));
    content.append(meta);
    card.append(time, content);
    return card;
  }

  function showSuccess(day) {
    const section = beginState("success-state");
    const summary = element(
      document,
      "p",
      "schedule-summary",
      `${day.lessons.length} ${day.lessons.length === 1 ? "занятие" : "занятия"}`
    );
    const list = element(document, "div", "lesson-list");
    list.setAttribute("aria-label", `Занятия: ${day.label}`);
    day.lessons.forEach((lesson) => list.append(lessonCard(lesson)));
    section.append(summary, list);
    stateRoot.replaceChildren(section);
  }

  function showEmpty(day) {
    const section = beginState("empty-state");
    const icon = element(document, "div", "state-icon", "✓");
    icon.setAttribute("aria-hidden", "true");
    section.append(icon);
    section.append(element(document, "h3", "state-title", "На выбранный день занятий нет"));
    section.append(
      element(document, "p", "state-description", `${day.label} можно посвятить отдыху или своим проектам.`)
    );
    stateRoot.replaceChildren(section);
  }

  function showError(message) {
    const section = beginState("error-state");
    section.setAttribute("role", "alert");
    const icon = element(document, "div", "state-icon", "!");
    icon.setAttribute("aria-hidden", "true");
    const button = element(document, "button", "retry-button", "Повторить");
    button.type = "button";
    button.dataset.action = "retry";
    section.append(icon);
    section.append(element(document, "h3", "state-title", "Не удалось загрузить расписание"));
    section.append(element(document, "p", "state-description", message));
    section.append(button);
    stateRoot.replaceChildren(section);
  }

  return Object.freeze({
    bindDaySelect,
    bindRetry,
    renderStudent,
    renderDays,
    setSelectedDay,
    setInteractionsDisabled,
    showLoading,
    showSuccess,
    showEmpty,
    showError
  });
}
