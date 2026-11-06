# Implementation Plan: Mini My ITMO — единое приложение UI + логика

**Branch**: `practice_05` | **Date**: 2026-11-01  
**Specs**: [`../001-mini-myitmo-ui/spec.md`](../001-mini-myitmo-ui/spec.md), [`spec.md`](spec.md)  
**Contract**: [`../../practices/practice_05/CONTRACT.md`](../../practices/practice_05/CONTRACT.md)

**Input**: согласованные UI- и logic-спецификации Mini My ITMO и единый контракт UI ↔ логика. Этот документ является общим планом одной реализации; отдельные планы для UI и логики не создаются.

## Summary

Реализовать внутри `practices/practice_05/` одностраничный личный кабинет студента с расписанием на неделю. Приложение загружает один локальный JSON, валидирует и сортирует данные в логическом модуле, а UI-контроллер показывает профиль, выбор дня и состояния `loading`, `success`, `empty`, `error`. Для быстрых переключений применяется `latest-wins`: представление обновляет только последний запрошенный день.

Решение использует HTML5, CSS3 и vanilla JavaScript в ES-модулях `.mjs`. Расширение `.mjs` позволяет запускать те же модули в браузере и в `node:test` без добавления `package.json`, сборщика или зависимостей.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2022; Node.js 18+ только для тестов  
**Primary Dependencies**: отсутствуют; Web APIs (`fetch`, DOM) и стандартная библиотека Node.js  
**Storage**: один локальный JSON-файл с профилем и семью днями расписания  
**Testing**: встроенный `node:test` + `node:assert/strict`  
**Target Platform**: современные настольные и мобильные браузеры; локальная раздача по HTTP  
**Project Type**: статическое одностраничное веб-приложение  
**Performance Goals**: начало показа loading не позднее 0,3 с; итог смены дня не позднее 1,5 с для локальных данных; `getDay()` не позднее 1 с  
**Constraints**: без авторизации, внешних API, React/Vue/TypeScript, сборщиков и сторонних библиотек; ширина от 320 px; масштаб текста 200%; все данные и код практики находятся в `practices/practice_05/`  
**Scale/Scope**: один студент, одна неделя, ровно 7 дней, один экран, локальная демонстрация

## Constitution Check

На момент планирования файл `.specify/memory/constitution.md` содержал незаполненный шаблон и не задавал проектных ворот. Конституция была формализована после первоначальной реализации 2026-11-01 как описание фактически применённых принципов; это не означает, что `/speckit.constitution` выполнялась до создания спецификаций. Поэтому исходными воротами этого плана остаются согласованные спецификации и `CONTRACT.md`, а позднее формализованная конституция подтверждает их и не вводит ретроспективных требований:

- PASS — один интегрированный проект внутри `practices/practice_05/`.
- PASS — только HTML/CSS/vanilla JavaScript, локальный JSON и встроенные средства тестирования.
- PASS — публичные операции и структуры данных соответствуют контракту без переименований.
- PASS — сортировка и валидация принадлежат логике; состояния и `latest-wins` принадлежат UI.
- PASS — предусмотрены unit- и интеграционные проверки всех обязательных сценариев.
- PASS — план не требует изменений спецификаций, контракта, `spec-history`, других практик или настроек Spec Kit.

Повторная проверка после проектирования: нарушений и требующих обоснования усложнений нет.

## Project Structure

### Documentation (this feature)

```text
specs/002-mini-myitmo-logic/
├── spec.md
├── plan.md              # единый план UI + логика (этот файл)
└── checklists/
    └── requirements.md
```

На этапе планирования не создаются `tasks.md`, `research.md`, `data-model.md`, отдельная копия контракта или исходный код. Исследовательских неопределённостей нет: стек, модель данных и граница UI ↔ логика уже зафиксированы входными документами и сведены в этот план.

### Planned source code

```text
practices/practice_05/
├── index.html
├── styles.css
├── data/
│   └── schedule.json
├── js/
│   ├── app.mjs
│   ├── schedule-service.mjs
│   ├── schedule-controller.mjs
│   └── schedule-view.mjs
└── tests/
    ├── schedule-service.test.mjs
    └── schedule-controller.integration.test.mjs
```

Существующие `CONTRACT.md`, `spec-history/` и материалы практики сохраняются без изменений.

**Structure Decision**: статическое приложение разделяется на сервис доменной логики, контроллер сценариев и DOM-представление. Это минимальная граница, которая изолирует `fetch`/DOM, делает правила контракта тестируемыми в Node.js и не вводит фреймворк или дублирующий слой моделей.

## Architecture

```text
index.html
   │
   ▼
app.mjs ── создаёт зависимости и запускает init
   │
   ▼
schedule-controller.mjs ── состояния UI, выбранный день, requestId, retry
   │                                      │
   ▼                                      ▼
schedule-service.mjs                 schedule-view.mjs
fetch → schedule.json                DOM + accessibility
validation/sorting/API
```

### Module responsibilities

#### `app.mjs`

- Создаёт загрузчик `fetch('./data/schedule.json')` и преобразует неуспешный HTTP-ответ или сбой чтения в `LoadError/DATA_UNAVAILABLE`.
- Создаёт service, view и controller через явную передачу зависимостей.
- Запускает начальную инициализацию после готовности DOM.
- Не содержит правил сортировки, валидации или разметки карточек.

#### `schedule-service.mjs`

- Хранит приватное валидированное состояние `Student` и `WeekSchedule`.
- Предоставляет строго пять Promise-операций: `init()`, `getStudent()`, `getWeek()`, `getDay(dayId)`, `retry()`.
- Преобразует непредвиденные исключения в объект контрактного вида `{ type, code, message, details? }`.
- Клонирует возвращаемые структуры, чтобы UI не мог изменить внутреннее состояние.
- Принимает загрузчик как зависимость: в браузере это `fetch`, в тестах — управляемая async-функция без файловой сети.

#### `schedule-controller.mjs`

- Оркестрирует сервис и view, но не обращается к DOM напрямую.
- Хранит `currentDayId` и монотонный `requestId`.
- Вычисляет сегодняшний ISO-day: `new Date().getDay() || 7`.
- На старте показывает loading, вызывает `init()`, затем получает профиль и неделю, строит переключатель дней и загружает текущий день.
- При выборе дня сразу обновляет выбранную кнопку, показывает loading и запрашивает `getDay(dayId)`.
- Маппит результат дня в `success` или `empty`, а ошибки — в `error` с сообщением из каталога контракта.
- Выполняет Retry как `retry()` → обновление профиля/недели → `getDay(currentDayId)`.

#### `schedule-view.mjs`

- Один раз находит DOM-узлы, создаёт кнопки дней и карточки занятий безопасными DOM-операциями через `textContent`.
- Предоставляет контроллеру методы отображения профиля, выбранного дня и четырёх состояний.
- Подставляет `—`, если `room` или `teacher` отсутствуют либо содержат пустую строку.
- Не сортирует данные и не вызывает сервис.

## Data Model and Local JSON

Корень `schedule.json`:

```text
{
  student: Student,
  days: DaySchedule[7]
}
```

Контрактные сущности сохраняются без адаптеров имён:

- `Student`: `{ name: string, group: string }` — обе строки непустые.
- `Lesson`: `{ subject, startTime, endTime, room?, teacher? }`.
- `DaySchedule`: `{ dayId, label, lessons, isEmpty }`.
- `WeekSchedule`: `{ days }`; необязательное `meta` допускается, но v1 его не использует.
- `ErrorObject`: `{ type, code, message, details? }`.

При `init()` сервис работает в следующем порядке:

1. Загружает JSON во временную переменную, не меняя текущее валидное состояние.
2. Проверяет корневую структуру, `Student` и наличие ровно семи дней.
3. Проверяет уникальную непрерывную последовательность `dayId` 1–7.
4. Для каждого занятия проверяет обязательные поля, формат `HH:MM` и `startTime < endTime`; пустые `room`/`teacher` допустимы.
5. Создаёт нормализованную копию каждого дня и вычисляет `isEmpty` из `lessons.length === 0`, чтобы флаг не мог противоречить массиву.
6. Сортирует занятия по `startTime`, затем `endTime`, `subject` без учёта регистра и `room`, помещая пустую аудиторию в конец.
7. Только после полной успешной проверки атомарно заменяет внутреннее состояние.

Дубликаты и пересечения занятий сохраняются. Абсолютные даты не добавляются.

## Public Logic Operations

### `init(): Promise<void>`

Повторно читает локальный источник, валидирует и сортирует данные. При успехе очищает сохранённую ошибку; при неуспехе отклоняет Promise с `ErrorObject` и не публикует частично подготовленные данные.

### `getStudent(): Promise<Student>`

После успешного `init()` возвращает копию студента. Вызов до инициализации преобразуется в `LoadError/DATA_UNAVAILABLE`, а не возвращает `undefined`.

### `getWeek(): Promise<WeekSchedule>`

После успешного `init()` возвращает копию всех семи дней в порядке 1→7; занятия уже отсортированы, пустые дни имеют `lessons: []` и `isEmpty: true`.

### `getDay(dayId): Promise<DaySchedule>`

Сначала требует целое число от 1 до 7, иначе возвращает `DomainError/INVALID_DAY`. Затем возвращает копию найденного дня. Пустой день является успешным результатом.

### `retry(): Promise<void>`

Сбрасывает сохранённую ошибку и выполняет полный `init()` заново. Выбор текущего дня остаётся в контроллере; после успеха контроллер отдельно вызывает `getDay(currentDayId)` согласно контракту.

## UI State Flow

### Initial load

```text
page open → loading → init
  ├─ reject  → error
  └─ resolve → getStudent + getWeek → getDay(today)
                                      ├─ lessons > 0 → success
                                      ├─ lessons = 0 → empty
                                      └─ reject      → error
```

### Day switching and latest-wins

Каждый запрос дня получает номер `myRequestId = ++requestId`. Контроллер устанавливает `currentDayId`, отражает выбранную кнопку и показывает loading до вызова `getDay()`. В обработчиках успеха и ошибки UI обновляется только при одновременном выполнении двух условий:

- `myRequestId === requestId`;
- запрошенный `dayId === currentDayId`.

Поэтому поздний ответ предыдущего дня игнорируется полностью, включая его ошибку. Физическая отмена Promise или `AbortController` не требуются.

### Retry

В состоянии error кнопка Retry запускает новый `requestId`, показывает loading и временно блокируется от повторного нажатия. Контроллер выполняет `retry()`, заново получает профиль и неделю и затем текущий день. При новом сбое снова показывает error. Кнопки дней на время полной переинициализации получают `disabled` и `aria-disabled="true"`, а обработчик дополнительно игнорирует выбор, чтобы `getDay()` не выполнялся против промежуточного состояния.

### Error message mapping

- `LoadError`, `DataFormatError`, `UnknownError` → «Не удалось загрузить расписание. Повторите попытку.»
- `ValidationError` → «Некорректные данные расписания.»
- `DomainError/INVALID_DAY` → «Выбран неверный день.»
- Любая неклассифицированная ошибка сначала нормализуется в `UnknownError/UNKNOWN`.

## HTML, Responsive Layout, and Accessibility

- Семантические области: `header`, `nav` с доступной подписью выбора дня и `main` с заголовком текущего расписания.
- Семь дней реализуются обычными `<button type="button">`; выбранный получает `aria-pressed="true"`. Это обеспечивает Tab, Enter и Space без создания нестандартной клавиатурной модели.
- Фокус остаётся на нажатой кнопке при загрузке результата; обновление контента не перехватывает фокус.
- Область состояния использует `aria-live="polite"`; ошибки получают `role="alert"`; loading содержит визуальный индикатор и текст «Загрузка расписания…» для скрин-ридера.
- Retry является настоящей кнопкой с видимым `:focus-visible`.
- Контрол дней — CSS Grid из семи `minmax(0, 1fr)` колонок с короткими метками. При 320 px он помещается без горизонтальной прокрутки.
- Карточки: одна колонка на телефоне, две только при достаточной ширине. Длинные значения переносятся через `overflow-wrap: anywhere`.
- Размеры задаются относительными единицами; layout проверяется при масштабе текста 200% и не скрывает контент.
- Цвет — не единственный признак выбора, loading или ошибки; сохраняется достаточный контраст текста, границ и фокуса.
- Время выводится уже в контрактном формате `HH:MM`; UI соединяет значения в `startTime–endTime` и не применяет 12-часовой формат.

## Verification Strategy

### Unit tests: `schedule-service.test.mjs`

1. `init()` загружает корректные данные, а `getStudent()` возвращает имя и группу.
2. `getWeek()` возвращает ровно семь дней 1→7 и корректно вычисленные `isEmpty`.
3. `getDay()` сортирует по всем четырём ключам, сохраняя дубликаты и пересечения.
4. Пустой день возвращается как успешный `{ lessons: [], isEmpty: true }`.
5. Отсутствующие `room`/`teacher` не вызывают ошибку.
6. Невалидный `dayId`, структура недели, обязательные поля и время дают точные `type/code` из каталога.
7. Сбой загрузчика становится `LoadError/DATA_UNAVAILABLE`.
8. Первый сбой и последующий успешный `retry()` заменяют ошибочное состояние валидными данными.
9. Возвращённые копии нельзя использовать для изменения внутреннего состояния сервиса.

### Integration tests: `schedule-controller.integration.test.mjs`

Контроллер запускается с реальным `schedule-service.mjs` и тестовым view-adapter, который записывает состояния вместо DOM. Это проверяет интеграцию UI-оркестрации и логики без сторонней DOM-библиотеки.

1. **Успешный сценарий**: `loading → success`; профиль и карточки соответствуют данным сервиса.
2. **Пустой день**: выбор дня без занятий даёт `loading → empty`, а не error.
3. **Ошибка + Retry**: загрузчик сначала отклоняет Promise, затем возвращает валидные данные; переходы `loading → error → loading → success` и повторный текущий `dayId` проверяются явно.
4. **Быстрое переключение**: тонкая тестовая обёртка над реальным service задерживает завершение двух `getDay()`; Promise завершаются в обратном порядке, view принимает только результат последнего выбранного дня, а устаревший success/error не отображается.
5. **Необязательные поля**: view-model передаёт `—` для пустых `room`/`teacher`.

### Manual acceptance checks

- Открыть страницу на ширинах 320 px, 768 px и desktop; убедиться в отсутствии горизонтальной прокрутки.
- Пройти Tab/Shift+Tab, Enter и Space по дням и Retry; проверить видимый фокус и сохранение фокуса.
- Увеличить текст до 200%.
- Проверить loading, success, empty и error (ошибка может временно моделироваться только в локальной проверочной копии данных, не в итоговом demo JSON).
- Быстро выбрать несколько дней и убедиться, что заголовок, подсветка и карточки относятся к последнему выбору.
- Проверить длинные предмет, ФИО и аудиторию, а также `—` для отсутствующих значений.

## Run Commands

Из корня репозитория:

```bash
python3 -m http.server 8000 --directory practices/practice_05
```

Открыть `http://localhost:8000/`. Прямое открытие `index.html` через `file://` не используется, потому что браузер должен загрузить JSON и ES-модули по HTTP.

Запуск всех автоматических тестов из корня репозитория:

```bash
node --test practices/practice_05/tests/*.test.mjs
```

Эквивалентно из каталога практики:

```bash
cd practices/practice_05
node --test tests/*.test.mjs
```

## Implementation Sequence (not tasks)

Этот порядок фиксирует зависимости будущей реализации, но не заменяет `/speckit.tasks` и не создаёт список назначаемых задач:

1. Добавить локальный JSON, затем реализовать и покрыть unit-тестами контрактный service.
2. Реализовать controller как независимую от DOM машину переходов и покрыть четыре интеграционных сценария.
3. Создать семантический HTML и DOM-view, подключить их через `app.mjs`.
4. Добавить адаптивные стили и выполнить ручные проверки доступности.
5. Запустить весь `node:test`, локальный HTTP-сервер и пройти acceptance checks из обеих спецификаций.

## Traceability

| Requirement area | Planned owner | Verification |
|---|---|---|
| Student, week, day and five Promise APIs | `schedule-service.mjs` | service unit tests |
| Validation, sorting, empty days, typed errors | `schedule-service.mjs` | unit tests for valid and invalid fixtures |
| loading/success/empty/error | controller + view | four integration scenarios + manual check |
| Retry = `retry()` → `getDay(currentDayId)` | controller | error/retry integration test |
| Latest-wins | controller `requestId` | reversed-resolution integration test |
| Optional `room`/`teacher` → `—` | view | integration assertion + manual check |
| Responsive UI ≥320 px and text at 200% | HTML/CSS/view | manual viewport and zoom checks |
| Keyboard and screen-reader semantics | HTML/view | keyboard pass and accessibility inspection |
| No auth, external API or extra technology | app/data boundary | source review and offline local run |

## Risks and Mitigations

- **Stale asynchronous responses**: centralized `requestId` gate in the controller; no rendering outside that gate.
- **Partial state after invalid JSON**: validate into temporary values and publish atomically only after all checks pass.
- **Browser/Node module mismatch**: use `.mjs`, inject data loading and keep DOM imports out of service/controller tests.
- **Contract drift between two specs**: use camelCase entities and exact error codes from `CONTRACT.md`; traceability table is checked before implementation completion.
- **Testing UI without a dependency**: keep the controller dependent on a small view interface and test state/output integration with a recording adapter; reserve visual/accessibility behavior for the manual browser pass.

## Complexity Tracking

No constitution violations or additional technologies require justification. Four JavaScript modules are the minimum separation needed to keep data rules, async coordination, and DOM behavior independently verifiable.

## Planning Outcome

План покрывает обе согласованные спецификации и единый контракт. Неразрешённых технических вопросов перед будущим созданием `/speckit.tasks` нет. Реализация, задачи и коммиты в рамках этого этапа не выполняются.
