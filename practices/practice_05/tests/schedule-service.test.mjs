import test from "node:test";
import assert from "node:assert/strict";

import {
  createContractError,
  createScheduleService
} from "../js/schedule-service.mjs";

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
      lessons: index === 0 ? [lesson()] : [],
      isEmpty: index !== 0
    }))
  };
}

function clone(value) {
  return structuredClone(value);
}

function expectContractError(type, code) {
  return (error) => {
    assert.equal(error.type, type);
    assert.equal(error.code, code);
    assert.equal(typeof error.message, "string");
    assert.ok(error.message.length > 0);
    return true;
  };
}

test("init exposes Student, WeekSchedule and DaySchedule as promises", async () => {
  const service = createScheduleService(async () => validData());

  assert.equal(service.init() instanceof Promise, true);
  await service.init();
  const [student, week, monday] = await Promise.all([
    service.getStudent(),
    service.getWeek(),
    service.getDay(1)
  ]);

  assert.deepEqual(student, { name: "Тестовый Студент", group: "P0001" });
  assert.equal(week.days.length, 7);
  assert.deepEqual(
    week.days.map((day) => day.dayId),
    [1, 2, 3, 4, 5, 6, 7]
  );
  assert.equal(monday.dayId, 1);
  assert.equal(monday.lessons[0].subject, "Алгоритмы");
});

test("lessons use every contract sorting key", async () => {
  const data = validData();
  data.days[0].lessons = [
    lesson({ subject: "Языки", startTime: "12:00", endTime: "13:00", room: "A" }),
    lesson({ subject: "Бета", startTime: "10:00", endTime: "11:20", room: "A" }),
    lesson({ subject: "альфа", startTime: "10:00", endTime: "11:30", room: "B" }),
    lesson({ subject: "Альфа", startTime: "10:00", endTime: "11:30", room: "" }),
    lesson({ subject: "Альфа", startTime: "10:00", endTime: "11:30", room: "A" })
  ];

  const service = createScheduleService(async () => data);
  await service.init();
  const day = await service.getDay(1);

  assert.deepEqual(
    day.lessons.map(({ subject, endTime, room }) => [subject, endTime, room]),
    [
      ["Бета", "11:20", "A"],
      ["Альфа", "11:30", "A"],
      ["альфа", "11:30", "B"],
      ["Альфа", "11:30", ""],
      ["Языки", "13:00", "A"]
    ]
  );
});

test("an empty day resolves successfully with isEmpty=true", async () => {
  const service = createScheduleService(async () => validData());
  await service.init();

  const sunday = await service.getDay(7);
  assert.deepEqual(sunday.lessons, []);
  assert.equal(sunday.isEmpty, true);
});

test("optional room and teacher may be absent or blank", async () => {
  const data = validData();
  data.days[0].lessons = [
    { subject: "Без аудитории", startTime: "08:00", endTime: "09:00" },
    lesson({ subject: "Без преподавателя", teacher: "" })
  ];
  const service = createScheduleService(async () => data);

  await service.init();
  const day = await service.getDay(1);
  assert.equal("room" in day.lessons[0], false);
  assert.equal(day.lessons[0].teacher, undefined);
  assert.equal(day.lessons[1].teacher, "");
});

test("overlaps and exact duplicates are preserved", async () => {
  const data = validData();
  const duplicate = lesson({ startTime: "10:00", endTime: "12:00" });
  data.days[0].lessons = [duplicate, clone(duplicate), lesson({ startTime: "11:00" })];
  const service = createScheduleService(async () => data);

  await service.init();
  const day = await service.getDay(1);
  assert.equal(day.lessons.length, 3);
  assert.deepEqual(day.lessons[0], day.lessons[1]);
});

const invalidCases = [
  {
    name: "week must have seven days",
    mutate(data) {
      data.days.pop();
    },
    type: "DataFormatError",
    code: "INVALID_DAY_STRUCT"
  },
  {
    name: "day ids must be unique",
    mutate(data) {
      data.days[6].dayId = 1;
    },
    type: "DataFormatError",
    code: "INVALID_DAY_STRUCT"
  },
  {
    name: "subject is required",
    mutate(data) {
      data.days[0].lessons[0].subject = "";
    },
    type: "ValidationError",
    code: "MISSING_FIELD_SUBJECT"
  },
  {
    name: "startTime is required",
    mutate(data) {
      delete data.days[0].lessons[0].startTime;
    },
    type: "ValidationError",
    code: "MISSING_FIELD_START_TIME"
  },
  {
    name: "endTime is required",
    mutate(data) {
      delete data.days[0].lessons[0].endTime;
    },
    type: "ValidationError",
    code: "MISSING_FIELD_END_TIME"
  },
  {
    name: "time must use HH:MM",
    mutate(data) {
      data.days[0].lessons[0].startTime = "25:00";
    },
    type: "ValidationError",
    code: "INVALID_TIME_FORMAT"
  },
  {
    name: "start must be before end",
    mutate(data) {
      data.days[0].lessons[0].startTime = "12:00";
      data.days[0].lessons[0].endTime = "11:00";
    },
    type: "ValidationError",
    code: "START_NOT_BEFORE_END"
  }
];

for (const invalidCase of invalidCases) {
  test(`validation: ${invalidCase.name}`, async () => {
    const data = validData();
    invalidCase.mutate(data);
    const service = createScheduleService(async () => data);
    await assert.rejects(
      service.init(),
      expectContractError(invalidCase.type, invalidCase.code)
    );
  });
}

test("getDay rejects values outside the ISO day range", async () => {
  const service = createScheduleService(async () => validData());
  await service.init();
  await assert.rejects(service.getDay(0), expectContractError("DomainError", "INVALID_DAY"));
  await assert.rejects(service.getDay(1.5), expectContractError("DomainError", "INVALID_DAY"));
  await assert.rejects(service.getDay("1"), expectContractError("DomainError", "INVALID_DAY"));
});

test("loader failure becomes LoadError/DATA_UNAVAILABLE", async () => {
  const service = createScheduleService(async () => {
    throw new Error("file missing");
  });
  await assert.rejects(
    service.init(),
    expectContractError("LoadError", "DATA_UNAVAILABLE")
  );
});

test("unexpected processing failures become UnknownError/UNKNOWN", async () => {
  const raw = new Proxy(validData(), {
    get(target, property, receiver) {
      if (property === "student") throw new Error("unexpected getter failure");
      return Reflect.get(target, property, receiver);
    }
  });
  const service = createScheduleService(async () => raw);
  await assert.rejects(service.init(), expectContractError("UnknownError", "UNKNOWN"));
});

test("retry reloads data after a failure", async () => {
  let attempts = 0;
  const service = createScheduleService(async () => {
    attempts += 1;
    if (attempts === 1) throw new Error("temporary failure");
    return validData();
  });

  await assert.rejects(
    service.init(),
    expectContractError("LoadError", "DATA_UNAVAILABLE")
  );
  await service.retry();
  assert.equal(attempts, 2);
  assert.equal((await service.getDay(1)).lessons.length, 1);
});

test("contract errors thrown by a loader are preserved", async () => {
  const expected = createContractError("LoadError", "DATA_UNAVAILABLE", "Known failure");
  const service = createScheduleService(async () => {
    throw expected;
  });
  await assert.rejects(service.init(), expectContractError("LoadError", "DATA_UNAVAILABLE"));
});

test("returned values are defensive copies", async () => {
  const service = createScheduleService(async () => validData());
  await service.init();

  const week = await service.getWeek();
  week.days[0].lessons[0].subject = "Изменено снаружи";
  week.days.push({ dayId: 8 });

  const fresh = await service.getWeek();
  assert.equal(fresh.days.length, 7);
  assert.equal(fresh.days[0].lessons[0].subject, "Алгоритмы");
});

test("getDay resolves within the one-second demo budget", async () => {
  const service = createScheduleService(async () => validData());
  await service.init();
  const startedAt = performance.now();
  await service.getDay(1);
  assert.ok(performance.now() - startedAt < 1000);
});
