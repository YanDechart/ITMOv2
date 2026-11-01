const DAY_LABELS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const ERROR_MESSAGES = Object.freeze({
  DATA_UNAVAILABLE: "Schedule data is unavailable",
  INVALID_DAY_STRUCT: "Week schedule must contain seven unique days",
  INVALID_TIME_FORMAT: "Lesson time must use HH:MM format",
  START_NOT_BEFORE_END: "Lesson start time must be before end time",
  MISSING_FIELD_SUBJECT: "Lesson subject is required",
  MISSING_FIELD_START_TIME: "Lesson start time is required",
  MISSING_FIELD_END_TIME: "Lesson end time is required",
  MISSING_FIELD_STUDENT_NAME: "Student name is required",
  MISSING_FIELD_STUDENT_GROUP: "Student group is required",
  INVALID_DAY: "Day id must be an integer between 1 and 7",
  UNKNOWN: "An unexpected schedule error occurred"
});

export function createContractError(type, code, message = ERROR_MESSAGES[code], details) {
  const error = {
    type,
    code,
    message: message || ERROR_MESSAGES.UNKNOWN
  };

  if (details !== undefined) {
    error.details = details;
  }

  return error;
}

export function isContractError(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof value.type === "string" &&
      typeof value.code === "string" &&
      typeof value.message === "string"
  );
}

function clone(value) {
  return structuredClone(value);
}

function requireNonEmptyString(value, code, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw createContractError("ValidationError", code, ERROR_MESSAGES[code], { field: label });
  }
  return value.trim();
}

function toMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateTime(value, missingCode, field) {
  const normalized = requireNonEmptyString(value, missingCode, field);
  if (!TIME_PATTERN.test(normalized)) {
    throw createContractError("ValidationError", "INVALID_TIME_FORMAT", undefined, {
      field,
      value
    });
  }
  return normalized;
}

function normalizeOptional(value, field) {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw createContractError(
      "DataFormatError",
      "INVALID_DAY_STRUCT",
      `${field} must be a string when provided`,
      { field }
    );
  }
  return value.trim();
}

function normalizeLesson(lesson, dayId, lessonIndex) {
  if (!lesson || typeof lesson !== "object" || Array.isArray(lesson)) {
    throw createContractError("DataFormatError", "INVALID_DAY_STRUCT", undefined, {
      dayId,
      lessonIndex
    });
  }

  const subject = requireNonEmptyString(
    lesson.subject,
    "MISSING_FIELD_SUBJECT",
    "subject"
  );
  const startTime = validateTime(
    lesson.startTime,
    "MISSING_FIELD_START_TIME",
    "startTime"
  );
  const endTime = validateTime(lesson.endTime, "MISSING_FIELD_END_TIME", "endTime");

  if (toMinutes(startTime) >= toMinutes(endTime)) {
    throw createContractError("ValidationError", "START_NOT_BEFORE_END", undefined, {
      dayId,
      lessonIndex,
      startTime,
      endTime
    });
  }

  const normalized = { subject, startTime, endTime };
  const room = normalizeOptional(lesson.room, "room");
  const teacher = normalizeOptional(lesson.teacher, "teacher");

  if (room !== undefined) normalized.room = room;
  if (teacher !== undefined) normalized.teacher = teacher;

  return normalized;
}

function compareOptionalRooms(left = "", right = "") {
  const leftEmpty = left.trim() === "";
  const rightEmpty = right.trim() === "";
  if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;
  return left.localeCompare(right, "ru", { sensitivity: "base" });
}

export function compareLessons(left, right) {
  return (
    left.startTime.localeCompare(right.startTime) ||
    left.endTime.localeCompare(right.endTime) ||
    left.subject.localeCompare(right.subject, "ru", { sensitivity: "base" }) ||
    compareOptionalRooms(left.room, right.room)
  );
}

function normalizeData(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw createContractError("DataFormatError", "INVALID_DAY_STRUCT");
  }

  const studentSource = raw.student;
  if (!studentSource || typeof studentSource !== "object" || Array.isArray(studentSource)) {
    throw createContractError("ValidationError", "MISSING_FIELD_STUDENT_NAME");
  }

  const student = {
    name: requireNonEmptyString(
      studentSource.name,
      "MISSING_FIELD_STUDENT_NAME",
      "student.name"
    ),
    group: requireNonEmptyString(
      studentSource.group,
      "MISSING_FIELD_STUDENT_GROUP",
      "student.group"
    )
  };

  if (!Array.isArray(raw.days) || raw.days.length !== 7) {
    throw createContractError("DataFormatError", "INVALID_DAY_STRUCT");
  }

  const seenDayIds = new Set();
  const days = raw.days.map((day, index) => {
    if (!day || typeof day !== "object" || Array.isArray(day)) {
      throw createContractError("DataFormatError", "INVALID_DAY_STRUCT", undefined, {
        index
      });
    }

    const { dayId } = day;
    if (!Number.isInteger(dayId) || dayId < 1 || dayId > 7 || seenDayIds.has(dayId)) {
      throw createContractError("DataFormatError", "INVALID_DAY_STRUCT", undefined, {
        dayId
      });
    }
    seenDayIds.add(dayId);

    if (!Array.isArray(day.lessons)) {
      throw createContractError("DataFormatError", "INVALID_DAY_STRUCT", undefined, {
        dayId,
        field: "lessons"
      });
    }

    const lessons = day.lessons
      .map((lesson, lessonIndex) => normalizeLesson(lesson, dayId, lessonIndex))
      .sort(compareLessons);

    return {
      dayId,
      label:
        typeof day.label === "string" && day.label.trim()
          ? day.label.trim()
          : DAY_LABELS[dayId - 1],
      lessons,
      isEmpty: lessons.length === 0
    };
  });

  days.sort((left, right) => left.dayId - right.dayId);
  const expectedIds = days.every((day, index) => day.dayId === index + 1);
  if (!expectedIds) {
    throw createContractError("DataFormatError", "INVALID_DAY_STRUCT");
  }

  return { student, week: { days } };
}

function normalizeProcessingError(error) {
  if (isContractError(error)) return error;
  if (error instanceof SyntaxError) {
    return createContractError("DataFormatError", "INVALID_DAY_STRUCT", error.message);
  }
  return createContractError("UnknownError", "UNKNOWN", undefined, {
    cause: error instanceof Error ? error.message : String(error)
  });
}

export function createScheduleService(loadData) {
  if (typeof loadData !== "function") {
    throw new TypeError("createScheduleService requires an async data loader");
  }

  let state = null;
  let lastError = null;

  async function init() {
    let raw;
    try {
      raw = await loadData();
    } catch (error) {
      const normalized = isContractError(error)
        ? error
        : createContractError("LoadError", "DATA_UNAVAILABLE", undefined, {
            cause: error instanceof Error ? error.message : String(error)
          });
      lastError = normalized;
      throw clone(normalized);
    }

    try {
      const nextState = normalizeData(raw);
      state = nextState;
      lastError = null;
    } catch (error) {
      const normalized = normalizeProcessingError(error);
      lastError = normalized;
      throw clone(normalized);
    }
  }

  function requireState() {
    if (!state) {
      const error =
        lastError || createContractError("LoadError", "DATA_UNAVAILABLE", "Call init() first");
      throw clone(error);
    }
    return state;
  }

  async function getStudent() {
    return clone(requireState().student);
  }

  async function getWeek() {
    return clone(requireState().week);
  }

  async function getDay(dayId) {
    if (!Number.isInteger(dayId) || dayId < 1 || dayId > 7) {
      throw createContractError("DomainError", "INVALID_DAY");
    }
    const day = requireState().week.days.find((item) => item.dayId === dayId);
    return clone(day);
  }

  async function retry() {
    lastError = null;
    await init();
  }

  return Object.freeze({ init, getStudent, getWeek, getDay, retry });
}
