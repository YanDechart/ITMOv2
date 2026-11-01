# Feature Specification: Mini My ITMO — Schedule Logic (Aligned v1)

**Feature Branch**: `[002-mini-myitmo-logic]`

**Created**: 2026-11-01

**Status**: Aligned to CONTRACT v1

**Input (context)**: Итерация после согласования контракта UI ↔ Логика (см. practices/practice_05/CONTRACT.md). Данные — локальные демо-данные; без авторизации и внешних API.

## User Scenarios & Testing (mandatory)

### User Story 1 - Расписание на выбранный день (P1)
Студент получает список занятий на выбранный dayId недели на основе локальных демо-данных.

Independent Test: Загрузить демо-данные через init(), запросить getDay(dayId), убедиться в корректной сортировке, валидации и корректной обработке пустых дней (lessons = []).

Acceptance Scenarios:
1. Given демо-данные загружены (init()), When getDay(dayId=1), Then возвращается DaySchedule с lessons, отсортированными по startTime ASC; поля Lesson: subject, startTime, endTime, room?, teacher?.
2. Given демо-данные загружены, When getDay(dayId=7) и занятий нет, Then возвращается lessons: [] и isEmpty: true (без ошибок).
3. Given несколько занятий с одинаковым startTime, When формируется список, Then применяется вторичная сортировка (endTime, затем subject, затем room).

---

### User Story 2 - Повторная попытка после ошибки (P2)
Если загрузка/валидация завершилась ошибкой, клиент может выполнить retry().

Independent Test: Смоделировать LoadError/ValidationError и удостовериться, что retry() повторно инициализирует данные; после исправления retry приводит к успешной загрузке.

Acceptance Scenarios:
1. Given источник демо-данных недоступен, When init(), Then reject ErrorObject { type: 'LoadError', code: 'DATA_UNAVAILABLE' }.
2. Given произошла ошибка, When retry() после исправления источника, Then resolve и данные доступны для getDay().
3. Given неверные времена (startTime >= endTime), When init(), Then reject ValidationError/START_NOT_BEFORE_END; When retry() после исправления, Then resolve.

---

### User Story 3 - Недельное расписание (P3)
Клиент получает полное расписание недели.

Independent Test: getWeek() возвращает 7 DaySchedule (dayId 1→7), каждый с lessons, отсортированными по правилам; пустые дни имеют isEmpty: true.

Acceptance Scenarios:
1. Given демо-данные загружены, When getWeek(), Then возвращается структура из 7 DaySchedule (Пн–Вс), lessons отсортированы.
2. Given часть дней пустые, When getWeek(), Then пустые дни представлены lessons: [] и isEmpty: true.

### Edge Cases
- Все занятия пересекаются по времени: сортировка по startTime сохраняется; пересечения допустимы.
- Дубликаты занятий: допускаются; возвращаются как есть; UI может объединять/подсвечивать.
- Пустой subject/startTime/endTime — ValidationError/MISSING_FIELD_*.
- Неверный формат времени — ValidationError/INVALID_TIME_FORMAT.
- Запрос dayId вне 1–7 — DomainError/INVALID_DAY.
- Неделя != 7 дней — DataFormatError/INVALID_DAY_STRUCT.

## Requirements (mandatory)

### Functional Requirements
- FR-001: Предоставлять Student: name (string, non-empty), group (string, non-empty).
- FR-002: Предоставлять WeekSchedule: days (ровно 7 DaySchedule; ISO-8601: Mon=1 … Sun=7).
- FR-003: Операции: init(), getStudent(), getWeek(), getDay(dayId), retry(); все возвращают Promise.
- FR-004: Пустые дни возвращать как lessons: [], isEmpty: true — без ошибок.
- FR-005: Сортировать lessons по startTime ASC; при равенстве — endTime ASC, затем subject ASC (case-insensitive), затем room ASC (пустые в конце).
- FR-006: Валидировать: subject, startTime, endTime обязательны; HH:MM (00:00–23:59); startTime < endTime; dayId ∈ [1,7]. room и teacher — опциональны.
- FR-007: Классифицировать ошибки: LoadError, DataFormatError, ValidationError, DomainError, UnknownError; содержать code/message.
- FR-008: retry() переинициализирует внутреннее состояние, сбрасывая ошибки; повторные обращения после retry доступны.
- FR-009: Независимость от авторизации и внешних API; данные — локальные демо.

### Key Entities (camelCase)
- Student: { name: string, group: string }
- Lesson: { subject: string, startTime: string, endTime: string, room?: string, teacher?: string }
- DaySchedule: { dayId: number (1–7), label: string, lessons: Lesson[], isEmpty: boolean }
- WeekSchedule: { days: DaySchedule[], meta?: object }
- ErrorObject: { type: 'LoadError' | 'DataFormatError' | 'ValidationError' | 'DomainError' | 'UnknownError', code: string, message: string, details?: any }

### Business Rules: Retrieval, Validation, Sorting
1) Retrieval
- init(): загружает/валидирует Student и WeekSchedule из локального источника.
- getDay(dayId): принимает число 1–7; при ином вводе — DomainError/INVALID_DAY.
- getStudent(), getWeek(): возвращают текущие сущности после init().
2) Validation
- Student: name и group непустые строки.
- Week: 7 дней; dayId уникальны и непрерывны (1→7).
- Lessons: обязательны subject/startTime/endTime; HH:MM; startTime < endTime; room/teacher могут отсутствовать.
3) Sorting
- startTime ASC; при равенстве — endTime ASC; затем subject ASC (case-insensitive); затем room ASC.
4) Empty days
- lessons: []; isEmpty: true; не ошибка.
5) Errors & Retry
- Любая ошибка возвращается как ErrorObject.
- retry(): читает источник заново и повторно валидирует.

### Exposed Operations
- init(): Promise<void>
- getStudent(): Promise<Student>
- getWeek(): Promise<WeekSchedule>
- getDay(dayId: number): Promise<DaySchedule>
- retry(): Promise<void>

### Error Catalogue (минимальный)
- LoadError / DATA_UNAVAILABLE
- DataFormatError / INVALID_DAY_STRUCT
- ValidationError / INVALID_TIME_FORMAT
- ValidationError / START_NOT_BEFORE_END
- ValidationError / MISSING_FIELD_SUBJECT | MISSING_FIELD_START_TIME | MISSING_FIELD_END_TIME
- DomainError / INVALID_DAY
- UnknownError / UNKNOWN

### Acceptance Scenarios Summary
- Успешный день с занятиями — см. User Story 1.
- Пустой день — см. User Story 1.
- Ошибка и retry — см. User Story 2.
- Неделя — см. User Story 3.

### Open Questions (Resolved in CONTRACT)
1) Формат day selector — dayId 1–7 (ISO-8601), подтверждено.
2) Локаль label — логика может передавать краткие метки; UI локализует маркировку «Сегодня» самостоятельно.
3) Пересечения занятий — допускаются; UI отображает упорядоченный список.
4) Статус пустого дня — определяется по lessons=[], isEmpty=true; отдельного статуса не требуется.

## Success Criteria (mandatory)
- SC-001: 100% списков lessons внутри дня отсортированы по правилам.
- SC-002: 100% пустых дней возвращаются как lessons: [] и isEmpty: true без ошибок.
- SC-003: 100% ошибок имеют корректный type/code и message; retry очищает состояние ошибки.
- SC-004: Ответ getDay() для демо возвращается ≤ 1 сек при наличии данных.
