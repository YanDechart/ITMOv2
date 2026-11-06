# Tasks: Mini My ITMO — единое приложение UI + логика

**Input**: [`spec.md`](spec.md), [`plan.md`](plan.md), [`../001-mini-myitmo-ui/spec.md`](../001-mini-myitmo-ui/spec.md), [`../../practices/practice_05/CONTRACT.md`](../../practices/practice_05/CONTRACT.md)

**Scope**: одно статическое приложение в `practices/practice_05/` на HTML5, CSS3 и vanilla JavaScript ES-модулях; локальный JSON; тесты через `node:test`; без авторизации, внешних API, сборщиков и сторонних библиотек.

**Unified story mapping**:

- **US1 (P1)** — открыть Mini My ITMO и увидеть профиль и корректное расписание текущего/выбранного дня, включая success, empty и error.
- **US2 (P2)** — переключать дни, повторять загрузку после ошибки и всегда видеть результат последнего запроса.
- **US3 (P3)** — получить полную неделю и увидеть доступные карточки занятий, включая необязательные поля.

## Format: `[ID] [P?] [Story] Description`

- **[P]** — задача может выполняться параллельно с соседними отмеченными задачами: используются разные файлы и отсутствует незавершённая зависимость.
- **[US1] / [US2] / [US3]** — единая пользовательская история из mapping выше.
- Каждый пункт содержит конкретный путь и проверяемый результат.
- Задачи выполняются без Git-коммитов; после каждой фазы допускается остановка для проверки.

---

## Phase 1: Подготовка структуры проекта

**Purpose**: подготовить минимальную структуру единственного приложения без конфигурации сборки и зависимостей.

- [x] T001 Создать каталоги `practices/practice_05/data/`, `practices/practice_05/js/` и `practices/practice_05/tests/`; результат: все будущие файлы находятся внутри `practice_05`, а `package.json`, второй проект и сторонние зависимости не добавлены.

**Checkpoint**: структура из `plan.md` готова для данных, модулей и тестов.

---

## Phase 2: Демонстрационные данные расписания и студента

**Purpose**: подготовить один локальный источник, покрывающий нормальный, пустой и неполный сценарии.

**Depends on**: T001.

- [x] T002 [US1] Создать `practices/practice_05/data/schedule.json` с непустыми `student.name` и `student.group`, ровно семью днями `dayId` 1–7 и метками Пн–Вс; результат: JSON парсится, dayId уникальны и непрерывны, внешние URL и абсолютные даты отсутствуют.
- [x] T003 [US1] [US3] Дополнить `practices/practice_05/data/schedule.json` проверочными данными: минимум один день с несколькими намеренно неотсортированными занятиями и одинаковыми `startTime`, минимум один пустой день, одно занятие без `room` и одно без `teacher`, а также допустимые пересечения/дубликаты; результат: один demo-файл позволяет проверить сортировку, empty и graceful degradation без отдельного приложения.

**Checkpoint**: локальные данные выражают все согласованные структуры `Student`, `Lesson`, `DaySchedule` и `WeekSchedule`.

---

## Phase 3: Логический модуль по CONTRACT.md

**Purpose**: реализовать единственный источник бизнес-правил и пять контрактных Promise-операций.

**Depends on**: T002–T003. Эта фаза блокирует UI-интеграцию и автоматические интеграционные тесты.

- [x] T004 [US1] Создать в `practices/practice_05/js/schedule-service.mjs` фабрику/класс сервиса с внедряемым async-загрузчиком, приватным состоянием и единым конструктором `ErrorObject`; результат: модуль импортируется в браузере и Node.js, не обращается к DOM и не содержит UI-текстов.
- [x] T005 [US1] Реализовать в `practices/practice_05/js/schedule-service.mjs` валидацию `Student`, ровно семи уникальных дней 1–7 и обязательных полей Lesson, включая `HH:MM` и `startTime < endTime`; результат: нарушения получают контрактную форму `DataFormatError`/`ValidationError`, все перечисленные в `CONTRACT.md` случаи используют точные каталожные коды, а пустые `room`/`teacher` принимаются.
- [x] T006 [US1] [US3] Реализовать в `practices/practice_05/js/schedule-service.mjs` нормализацию `isEmpty` и сортировку `startTime → endTime → subject` без учёта регистра `→ room` с пустыми аудиториями в конце; результат: пересечения и дубликаты сохраняются, UI не получает обязанность сортировать.
- [x] T007 [US1] [US2] [US3] Реализовать в `practices/practice_05/js/schedule-service.mjs` Promise-методы `init()`, `getStudent()`, `getWeek()`, `getDay(dayId)` и `retry()` с атомарной публикацией валидного состояния, `DomainError/INVALID_DAY`, нормализацией неожиданных ошибок в `UnknownError/UNKNOWN` и защитными копиями результатов; результат: Retry перечитывает источник, очищает ошибку и после успеха снова разрешает все getters.

**Checkpoint**: сервис полностью реализует разделы 2–8 и 11 контракта и остаётся независимым от UI.

---

## Phase 4: Unit-тесты логики

**Purpose**: доказать правила загрузки, валидации, сортировки, ошибок и повторной инициализации.

**Depends on**: T004–T007.

- [x] T008 [US1] [US3] Создать `practices/practice_05/tests/schedule-service.test.mjs` на `node:test` и `node:assert/strict` для успешных `init()`, `getStudent()`, `getWeek()` и `getDay()`; результат: проверены профиль, семь дней в порядке 1→7 и контрактные поля возвращаемых сущностей.
- [x] T009 [US1] Дополнить `practices/practice_05/tests/schedule-service.test.mjs` проверками сортировки по всем четырём ключам на неотсортированном вводе; результат: несколько занятий и одинаковые `startTime` всегда возвращаются в детерминированном порядке.
- [x] T010 [US1] [US3] Дополнить `practices/practice_05/tests/schedule-service.test.mjs` сценариями пустого дня, отсутствующих `room`/`teacher`, пересечений и дубликатов; результат: empty возвращает `lessons: []`/`isEmpty: true` без ошибки, а допустимые данные не теряются.
- [x] T011 [US1] [US2] Дополнить `practices/practice_05/tests/schedule-service.test.mjs` таблицей невалидных входов для `INVALID_DAY_STRUCT`, `MISSING_FIELD_*`, `INVALID_TIME_FORMAT`, `START_NOT_BEFORE_END` и `INVALID_DAY`, а также отдельным непредвиденным исключением для `UnknownError/UNKNOWN`; результат: каждый Promise отклоняется с ожидаемыми `type`, `code` и непустым `message`.
- [x] T012 [US2] Дополнить `practices/practice_05/tests/schedule-service.test.mjs` управляемым загрузчиком, который сначала выдаёт `DATA_UNAVAILABLE`, а после исправления успешно проходит `retry()`, и тестами защитных копий; результат: ошибка не публикует частичное состояние, Retry восстанавливает сервис, а изменение возвращённого объекта не меняет внутренние данные.

**Checkpoint**: `node --test practices/practice_05/tests/schedule-service.test.mjs` завершается с кодом 0 и покрывает обязательные logic-сценарии.

---

## Phase 5: HTML/CSS-интерфейс и адаптивная вёрстка

**Purpose**: построить семантическое, адаптивное и доступное представление без бизнес-логики.

**Depends on**: T001; использовать контрактные структуры из T004–T007. После T013 задачи T014 и T015 допускают параллельное выполнение.

- [x] T013 [US1] Создать `practices/practice_05/index.html` с семантическими `header`, подписанным `nav`, `main`, контейнерами профиля/дней/состояния и подключением `./js/app.mjs` как `type="module"`; результат: разметка имеет один понятный заголовок, точки вывода всех четырёх состояний и не содержит встроенных данных или бизнес-правил.
- [x] T014 [P] [US1] [US2] [US3] Создать `practices/practice_05/styles.css` с видимым `:focus-visible`, сеткой семи дней без горизонтальной прокрутки при 320 px, одной колонкой карточек на телефоне, двумя при достаточной ширине, переносом длинных значений и устойчивостью при zoom 200%; результат: цвет не является единственным индикатором выбора/ошибки, а интерактивные элементы имеют читаемые состояния.
- [x] T015 [P] [US1] [US3] Создать `practices/practice_05/js/schedule-view.mjs`, который через безопасные DOM-операции отображает профиль, семь нативных button-элементов, отметку «Сегодня», выбранный `aria-pressed` и сохраняет фокус на выбранной кнопке; результат: Tab, Enter и Space работают нативно, а view не вызывает service и не сортирует занятия.
- [x] T016 [US1] [US3] Дополнить `practices/practice_05/js/schedule-view.mjs` представлениями loading/success/empty/error, карточками `subject`, `startTime–endTime`, `room`, `teacher`, подстановкой `—`, `aria-live="polite"`, `role="alert"` и доступной кнопкой Retry; результат: каждое состояние взаимоисключающее и имеет требуемый видимый и screen-reader текст.

**Checkpoint**: DOM-view умеет отрисовать все состояния из готовых данных, но по-прежнему не управляет загрузкой или конкуренцией запросов.

---

## Phase 6: Интеграция UI с логикой

**Purpose**: связать реальный service и DOM-view одним контроллером, сохранив разделение ответственности.

**Depends on**: T007, T013, T015–T016; T014 должна завершиться до браузерной приёмки.

- [x] T017 [US1] Создать `practices/practice_05/js/schedule-controller.mjs` с внедряемыми service/view/clock, вычислением ISO-day через `getDay() || 7` и стартовым потоком `loading → init() → getStudent()+getWeek() → getDay(today)`; результат: профиль, дни и success/empty/error текущего дня отображаются только через view.
- [x] T018 [US2] Реализовать в `practices/practice_05/js/schedule-controller.mjs` выбор дня с сохранением `currentDayId`, немедленным loading и политикой latest-wins через монотонный `requestId` плюс проверку `dayId`; результат: поздние success и error старых запросов полностью игнорируются.
- [x] T019 [US1] [US2] Реализовать в `practices/practice_05/js/schedule-controller.mjs` маппинг контрактных ошибок и Retry как `retry() → refresh profile/week → getDay(currentDayId)`, блокируя повторный Retry и выбор дня на время переинициализации; результат: переходы `error → loading → success|empty|error` не теряют выбранный день.
- [x] T020 [US1] [US2] Создать `practices/practice_05/js/app.mjs` с загрузчиком `fetch('./data/schedule.json')`, проверкой HTTP-ответа, созданием реальных service/view/controller и запуском после готовности DOM; результат: приложение не обращается к внешним API и работает как единое целое через локальный HTTP-сервер.

**Checkpoint**: реальный браузерный UI использует реальный логический модуль; заглушки не входят в production-код.

---

## Phase 7: Интеграционные и end-to-end проверки

**Purpose**: проверить совместное поведение UI-оркестрации и реальной логики, затем статическую доставку и браузерную доступность.

**Depends on**: T008–T020.

- [x] T021 [US1] Создать `practices/practice_05/tests/schedule-controller.integration.test.mjs` с реальным `schedule-service.mjs`, внедряемым валидным загрузчиком и recording-view; результат: начальный поток фиксируется как `loading → success`, профиль и несколько карточек соответствуют отсортированным данным сервиса, а `getDay()` укладывается в 1 с.
- [x] T022 [US1] [US3] Дополнить `practices/practice_05/tests/schedule-controller.integration.test.mjs` выбором пустого дня и проверкой view-модели занятия без `room`/`teacher`; результат: UI-поток даёт `loading → empty` без error, а отсутствующие значения представлены символом `—`.
- [x] T023 [US1] [US2] Дополнить `practices/practice_05/tests/schedule-controller.integration.test.mjs` реальным service с stateful-загрузчиком: первая загрузка недоступна, Retry получает валидные данные, а отдельный невалидный набор даёт контрактный код; результат: проверены `loading → error → loading → success` и корректное сообщение для `ValidationError`.
- [x] T024 [US2] Дополнить `practices/practice_05/tests/schedule-controller.integration.test.mjs` тонкой задерживающей обёрткой над реальным service, завершить два `getDay()` в обратном порядке и проверить recording-view; результат: отображён только последний dayId, ни устаревший success, ни устаревший error не попадают в UI.
- [x] T025 [US1] Добавить в `practices/practice_05/tests/schedule-controller.integration.test.mjs` HTTP-smoke на `node:test`: запустить `python3 -m http.server` для `practices/practice_05/` на временном локальном порту, дождаться готовности, получить `/`, `/styles.css`, `/js/app.mjs` и `/data/schedule.json`, проверить статусы/ключевые ссылки и гарантированно остановить процесс; результат: приложение доставляется целиком без `file://` и внешней сети.
- [x] T026 [US1] [US2] [US3] Запустить `node --test practices/practice_05/tests/*.test.mjs` и устранить только дефекты файлов `practices/practice_05/`, пока весь suite не завершится с кодом 0; результат: совместно проходят success, empty, optional fields, invalid data, Retry и latest-wins.
- [x] T027 [US1] [US2] [US3] Запустить `python3 -m http.server 8000 --directory practices/practice_05` и проверить реальное приложение в браузере при 320 px, 768 px и desktop, zoom 200%, а также Tab/Shift+Tab/Enter/Space, видимый focus, Retry и быстрые клики по дням; результат: нет горизонтальной прокрутки, фокус не теряется, loading появляется сразу, смена дня укладывается в 1,5 с и последний выбор совпадает с показанными карточками.

**Checkpoint**: автоматические и ручные проверки подтверждают работу единого UI с реальной логикой и все обязательные сценарии пользователя.

---

## Phase 8: README и финальная проверка покрытия

**Purpose**: сделать запуск и демонстрацию воспроизводимыми и закрыть трассировку требований.

**Depends on**: T026–T027.

- [x] T028 Создать `practices/practice_05/README.md` с кратким назначением, архитектурой `app → controller → service/view → local JSON`, требованиями Node.js 18+/Python 3 и точными командами `python3 -m http.server 8000 --directory practices/practice_05` и `node --test practices/practice_05/tests/*.test.mjs`; результат: новый пользователь запускает сайт и тесты из корня репозитория без установки пакетов.
- [x] T029 [US1] [US2] [US3] Добавить в `practices/practice_05/README.md` пошаговую демонстрацию дня с занятиями, empty, `—`, Retry через временную блокировку/восстановление запроса JSON в DevTools, клавиатурной навигации и latest-wins; результат: каждый обязательный UI-сценарий воспроизводим без изменения production-данных.
- [x] T030 [US1] [US2] [US3] Добавить в `practices/practice_05/README.md` финальный checklist соответствия обеим спецификациям и `CONTRACT.md`, затем повторно выполнить команды запуска/тестов и проверить отсутствие React, TypeScript, сборщиков, внешних API и второго приложения; результат: checklist закрывает пять Promise-методов, структуры/ошибки/сортировку, четыре UI-состояния, Retry, latest-wins, адаптивность и доступность без пробелов.

**Final checkpoint**: Mini My ITMO готово к демонстрации как одно интегрированное приложение; все автоматические тесты зелёные, ручная приёмка пройдена, документация воспроизводима.

---

## Dependencies & Execution Order

### Phase dependencies

1. **Phase 1 — Setup**: начинается сразу.
2. **Phase 2 — Data**: зависит от T001.
3. **Phase 3 — Logic**: зависит от T002–T003 и блокирует интеграцию.
4. **Phase 4 — Logic tests**: зависит от T004–T007.
5. **Phase 5 — UI**: HTML начинается после T001; фактическая интеграция использует завершённый контрактный service.
6. **Phase 6 — UI + logic**: зависит от service и DOM-view.
7. **Phase 7 — Verification**: зависит от всей реализации.
8. **Phase 8 — README**: фиксирует только проверенный способ запуска и демонстрации.

### Critical path

```text
T001 → T002 → T003 → T004 → T005 → T006 → T007
     → T008 → T009 → T010 → T011 → T012
     → T013 → T015 → T016 → T017 → T018 → T019 → T020
     → T021 → T022 → T023 → T024 → T025 → T026 → T027
     → T028 → T029 → T030
```

T014 выполняется после T013 параллельно с T015 и должна завершиться до T027.

### Parallel opportunities

После T013 можно одновременно выполнить:

```text
T014: styles.css — адаптивность и focus
T015: schedule-view.mjs — DOM API профиля и дней
```

Другие соседние задачи намеренно не помечены `[P]`: они последовательно изменяют один и тот же файл либо проверяют результат предыдущего шага.

---

## Coverage Matrix

| Requirement / scenario | Implementation tasks | Verification tasks |
|---|---|---|
| Student, 7 days, camelCase, five Promise APIs | T002, T004–T007 | T008, T021 |
| Multiple lessons and full tie-break sorting | T003, T006 | T009, T021 |
| Empty day without error | T003, T006, T016–T018 | T010, T022, T026 |
| Missing `room`/`teacher` → `—` | T003, T005, T016 | T010, T022, T027 |
| Load error and successful Retry | T007, T016, T019–T020 | T012, T023, T026–T027 |
| Invalid data and exact error code | T005, T007, T019 | T011, T023 |
| Fast switching / latest-wins | T018 | T024, T026–T027 |
| UI with real logic, not only stubs | T017–T020 | T021–T025 |
| Mobile 320 px, zoom 200%, keyboard/focus | T013–T016 | T027 |
| Local HTTP run and reproducible demo | T020 | T025, T028–T030 |

## Implementation Strategy

1. Завершить foundation: структура, данные и logic service.
2. Проверить logic unit-тестами до подключения DOM.
3. Построить семантический view и связать его controller-ом с реальным service.
4. Пройти интеграционные сценарии и HTTP-smoke, затем ручную мобильную/клавиатурную приёмку.
5. Документировать только фактически проверенные команды и сценарии.

## Notes

- `[P]` применяется только к разным файлам без незавершённых зависимостей.
- Production-код не содержит test-only задержек или заглушек; управляемые загрузчики и задерживающая обёртка находятся только в `tests/`.
- UI доверяет сортировке service и не дублирует доменные правила.
- Пустой день — success-результат с `lessons: []`/`isEmpty: true`, а не исключение.
- Не выполнять `/speckit.implement`, не создавать коммиты и не изменять спецификации, `plan.md`, `CONTRACT.md`, `spec-history`, другие практики или конфигурацию OpenCode в рамках генерации этого списка.
