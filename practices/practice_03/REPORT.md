# Отчёт: локальные модели

Отчёт ведёт OpenCode по фактическим результатам команд и вашим сообщениям в чате. Поручите агенту заполнить разделы и показать diff. Выводы студента он записывает после обсуждения; отсутствующие измерения отмечает как невыполненные.

## Окружение

ОС / CPU / GPU / RAM / VRAM / свободный диск:
macOS 27.0 (Build 26A428) / Apple M4 / Apple M4 (integrated) / 24 GB / — (unified memory, not separately reported) / 286 GiB free
Ollama или LM Studio / OpenCode / Python, версии:
Ollama 0.34.4 / OpenCode 1.18.33 / Python 3.13.5 / curl 8.7.1 / GNU Make 3.81
Модель, разработчик, семейство, тег и ID:
qwen3.5:4b; ID 2a654d98e6fb; разработчик: Qwen; семейство: qwen35
Формат, квантизация, лицензия, источник:
quantization Q4_K_M; лицензия Apache-2.0; источник: Ollama registry (`ollama pull qwen3.5:4b`)
Контекст/размещение:
- Базовая модель qwen3.5:4b (ollama show): context length 262144 (метаданные модели)
- Фактически запущенный itmo-agent (ollama ps): CONTEXT 65536; PROCESSOR 100% GPU
Почему выбрана эта конфигурация:
На устройстве 24 GB RAM. По PREPARATION.md для 24–32 GB рекомендуется начинать с qwen3.5:4b или :9b; 4b выбрана как более безопасный старт для стабильной загрузки на CPU/унифицированной памяти без риска нехватки ресурсов. После подтверждения стабильности можно будет попробовать 9b.

## Сравнение семейств

| Разработчик / модель | Задача | Параметры / формат | Лицензия | Язык / tools | Источник |
|---|---|---|---|---|---|
| Qwen / qwen3.5:4b | General-purpose LLM; code/assistant | ~4.7B params; gguf; quant Q4_K_M (в Ollama билде) | Apache-2.0 | Русский: заявлен; Tools: заявлены | Официальная карточка Ollama qwen3.5:4b (ollama show) |
| Google / Gemma 2 2B (пример) | General-purpose LLM; research | ~2B params; gguf (Ollama build) | Gemma License | Русский: не подтверждено; Tools: не подтверждено | Официальная model card Gemma 2 (документация Google); Ollama model page |

## Воспроизведение

Команды и файлы конфигурации:
make install; make test (из lab/)
`ollama create itmo-local -f Modelfile`; `ollama run itmo-local "Объясни разницу между моделью и сервером двумя предложениями"` ->
«Модель — это набор данных и алгоритмов, которые содержат знания и логику для решения интеллектуальных задач. Сервер же является технической инфраструктурой, которая хранит эти данные и обеспечивает их доступ пользователям через сеть.»
Подтверждение локального endpoint и скачанных весов:
`curl --fail http://localhost:11434/api/tags` -> {"models":[]} (успешный ответ; до загрузки моделей локально не было)
`ollama list` -> содержит qwen3.5:4b (SIZE ~3.4 GB, ID 2a654d98e6fb)
Проверка без сети после подготовки:
- Ollama запускался с `OLLAMA_NO_CLOUD=1`.
- После подготовки пользователь физически отключил интернет.
- При отключённом интернете выполнено:
  `ollama run itmo-local "Ответь одним словом: READY"`
- Локальная генерация успешно началась (Thinking...), точный «READY» получен не был.
Если работали в паре, чей компьютер и почему:

## Эксперимент

Фактор A/B:
Baseline vs System (меняется только system prompt из lab/system.txt)

Неизменные условия:
- модель: qwen3.5:4b
- вопрос: "Какая CI-система запускает тесты проекта?"
- temperature=0.2; seed=42; think=false
- переданный контекст: содержимое demo/README.md
- num_ctx=4096; num_predict=512

Baseline (API chat):
- Путь: lab/results/baseline.json
- Ответ: В предоставленном описании задачи не указана конкретная CI-система... (подробно см. JSON)
- Метрики: wall_seconds=22.1215; load_seconds=0.00441; total_seconds=22.0983; decode_tokens_per_second=9.1402

System (API chat с system.txt):
- Команда: python3 experiment.py --mode system --output results/system.json
- Путь: lab/results/system.json
- Ответ: В предоставленных материалах нет ответа. Основание: указаны только функциональные требования и зависимости; конкретная CI не упоминается.
- Метрики: wall_seconds=6.6740; load_seconds=2.8240; total_seconds=6.6618; decode_tokens_per_second=24.7206

Наблюдения:
- Выдуманных сведений о CI не появилось в обоих ответах.
- В варианте System модель явно признаёт отсутствие данных и соблюдает требуемый формат: короткий ответ + основание из контекста.
- Между A и B отличается только наличие system-сообщения (подтверждено по request.messages в JSON).

Temperature experiment (40–50):
- Изменяемый фактор: temperature (0.2 vs 0.8); фиксированы: модель qwen3.5:4b, mode=system, один и тот же system prompt (lab/system.txt), вопрос и контекст (demo/README.md), think=false, num_ctx=4096, num_predict=512.
- Seeds: 42/43/44 для обеих температур.

Файлы и метрики:
- results/cold42.json: t=0.2, seed=42; ответ: «В предоставленных материалах нет ответа.» + основание; wall=3.4847; load=0.00433; total=3.4774; dps=22.7666
- results/cold43.json: t=0.2, seed=43; ответ: «В предоставленных материалах нет ответа.» + основание; wall=7.0289; load=0.00159; total=7.0225; dps=21.5880
- results/cold44.json: t=0.2, seed=44; ответ: «В предоставленных материалах нет ответа.» + основание; wall=9.5244; load=0.00507; total=9.5148; dps=22.1361
- results/hot42.json:  t=0.8, seed=42; ответ: «В предоставленных материалах нет ответа.» + основание; wall=10.8900; load=2.8181; total=10.8796; dps=22.4318
- results/hot43.json:  t=0.8, seed=43; ответ: «В предоставленных материалах нет ответа.» + основание; wall=8.5716; load=2.8027; total=8.5636; dps=23.9805
- results/hot44.json:  t=0.8, seed=44; ответ: «В предоставленных материалах нет ответа.» + основание; wall=5.4108; load=2.7509; total=5.4050; dps=24.8332

Наблюдения по фактам:
- Во всех шести ответах модель признаёт отсутствие данных о CI; неподтверждённых предположений нет; требуемый формат system.txt соблюдён.
- Условия A/B соблюдены: различается только temperature при совпадающих model/mode/system/user/контексте/options.

## Локальная модель в OpenCode

- Создание профиля: `ollama create itmo-agent -f Modelfile.agent` (FROM qwen3.5:4b; PARAMETER num_ctx 65536)
- Загрузка: `ollama run itmo-agent "Ответь: READY"`
- Фактический `ollama ps`:
  NAME                 ID              SIZE      PROCESSOR    CONTEXT    UNTIL
  itmo-agent:latest    3465bc38f59d    5.6 GB    100% GPU     65536      4 minutes from now
- Фактический CONTEXT: 65536
- Фактическое размещение PROCESSOR: 100% GPU (по ollama ps)
- Локальный endpoint OpenCode: http://localhost:11434/v1 (из demo/opencode.json)
- Агент: local-guide (read-only), модель: ollama/itmo-agent
- Команда проверки:
  opencode run --dir demo --agent local-guide --model ollama/itmo-agent --format json \
    "Прочитай README.md инструментом read. Назови команду тестирования со ссылкой на файл" \
    > results/read-check.jsonl
- Результат: файл lab/results/read-check.jsonl
- Доказательство реального вызова read: событие `type":"tool_use"` с `tool":"read"` и входом `filePath":".../lab/demo/README.md`, возвращённый контент содержит строки 1–8 README.
- Итоговый ответ модели: «Команда тестирования: `make test`. Ссылка: `/Users/yandechart/.../lab/demo/README.md`, строка 6.»

Проверка без Ollama Cloud (по PREPARATION.md):
- Сервер Ollama был запущен с переменной окружения `OLLAMA_NO_CLOUD=1` (локальный запуск процесса serve); подтверждение локального каталога моделей через `curl --fail http://localhost:11434/api/tags` показало локальные модели (itmo-agent, itmo-local, qwen3.5:4b).
- Использовались уже скачанные веса; физическое отключение интернета не выполнялось в рамках этого шага.
- Ограничения: не проводилось сетевое трассирование; проверка базировалась на переменной окружения сервера и списке локальных моделей.

- Дополнительная офлайн-проверка: после подготовки выполнен запрос при физически отключённом интернете.
  - Команда: `ollama run itmo-local "Ответь одним словом: READY"`
  - Фактический результат: локальная генерация успешно началась без сети (модель показала «Thinking...»); точного ответа «READY» не получено — модель следовала инструкциям и ушла в рассуждение.

## 65–80. Проверка на проекте

Пять независимых запусков (sessionID все разные), пути к результатам:
- question-1.jsonl (ses_f27fdbe3effeJ20ymSa1deWo5U)
- question-2.jsonl (ses_f27fb1a83ffeaXol6zP3VbI9wy)
- question-3.jsonl (ses_f27f6bb04ffeH0j8E69tLlOif2)
- question-4.jsonl (ses_f27f1d9abffemaIzSodItbThMP)
- question-5.jsonl (ses_f27ed1073ffexf6zj7CqJNdlW6)

Вопрос 1: «Как запустить тесты? Укажи файл-источник.» -> results/question-1.jsonl
- tool calls: read каталога demo; read demo/test_service.py; read demo/Makefile
- прочитанные файлы: demo/test_service.py; demo/Makefile
- финальный ответ local-guide (text): указаны два способа: «make test» (источник Makefile:2-3) и «python3 -m unittest -v» (источник test_service.py:24)
- эталон (проект): demo/README.md:6 («Проверка: make test»); demo/Makefile:2-3 (цель test вызывает python3 -m unittest -v)
- оценка: корректен

Вопрос 2: «Что будет при пустом имени подписчика? Подтверди кодом.» -> results/question-2.jsonl
- tool calls: попытка read server.go -> File not found; glob **/*.{go,rust,js,ts} -> No files; (финальный) text: «Проверю структуру рабочей директории.»; завершённых подтверждающих чтений нужных файлов нет
- прочитанные файлы: отсутствуют существенные (по вопросу)
- финальный ответ local-guide (text): «Проверю структуру рабочей директории.»
- эталон (проект): demo/service.py:5-6 (raise ValueError("empty name")); demo/test_service.py:13-15 (assertRaises(ValueError))
- оценка: некорректен (завершённого содержательного ответа по сути нет)

Вопрос 3: «Где реализован unsubscribe? Проверь предпосылку вопроса.» -> results/question-3.jsonl
- tool calls: grep("unsubscribe") -> No files; glob по шаблонам -> No files; glob(**/*) -> список всех файлов; read demo/service.py; read demo/test_service.py; grep("def unsubscribe") -> No files
- прочитанные файлы: demo/service.py; demo/test_service.py
- финальный ответ local-guide (text): отсутствует (нет text-события с ответом)
- эталон (проект): реализации unsubscribe нет в предоставленных *.py; подтверждается отсутствием совпадений и перечнем файлов
- оценка: частично корректен (инструментальная проверка выполнена, но финального ответа нет)

Вопрос 4: «Какая CI-система запускает тесты? Если сведений нет, скажи об этом.» -> results/question-4.jsonl
- tool calls: glob *.yml|*.yaml|.gitlab-ci.yml|.travis.yml|.circleci.yml|*.gitlab-ci.*|.github/* -> все No files
- прочитанные файлы: не читались (проверка конфигов через glob)
- финальный ответ local-guide (text): «Сведения о запускающих тестах CI-система в проекте отсутствуют …»
- эталон (проект): в demo/ нет конфигураций CI
- оценка: корректен

Вопрос 5: «Сохраняются ли подписки после перезапуска процесса? Подтверди кодом.» -> results/question-5.jsonl
- tool calls: glob **/*.py; read demo/service.py
- прочитанные файлы: demo/service.py
- финальный ответ local-guide (text): «Да, подписки сохраняются после перезапуска процесса.» с обоснованием, что переменная остаётся в памяти — это неверно
- эталон (проект): demo/README.md:2 («Подписчики хранятся в памяти процесса»); demo/service.py:1 (subscribers = set()) — при новом запуске процесс инициализирует пустое множество; подписки не сохраняются
- оценка: некорректен (фактическая ошибка модели)

Подтверждение независимости: все пять sessionID различаются.

Результат make test:
```
Standard library only: ready
/Library/Developer/CommandLineTools/usr/bin/make -C demo test
python3 -m unittest -v
test_duplicate (test_service.SubscribeTest.test_duplicate) ... ok
test_empty (test_service.SubscribeTest.test_empty) ... ok
test_subscribe (test_service.SubscribeTest.test_subscribe) ... ok

----------------------------------------------------------------------
Ran 3 tests in 0.000s

OK
```
## Скорость

Холодный старт отдельно: baseline выполнен; значения приведены из файла результата.
Warmed speed benchmark (три прогретых повтора каждой конфигурации; seed=42):
- temperature=0.2 (system mode):
  - results/speed-t02-1.json: wall=2.7263; load=0.00353; total=2.7204; dps=28.8742
  - results/speed-t02-2.json: wall=4.3924; load=0.00134; total=4.3866; dps=29.1482
  - results/speed-t02-3.json: wall=4.3913; load=0.00181; total=4.3849; dps=29.2267
  - медианы: wall≈4.3913; load≈0.00181; total≈4.3849; dps≈29.1482
- temperature=0.8 (system mode):
  - results/speed-t08-1.json: wall=4.4484; load=0.00181; total=4.4425; dps=29.3153
  - results/speed-t08-2.json: wall=4.3996; load=0.00219; total=4.3933; dps=29.3045
  - results/speed-t08-3.json: wall=4.3905; load=0.00160; total=4.3843; dps=29.3420
  - медианы: wall≈4.3996; load≈0.00181; total≈4.3933; dps≈29.3153
- Сопоставление: медианы decode_tokens_per_second близки (около 29.1–29.3). Различия небольшие; TTFT не измеряется (ответ не потоковый).
Единицы и метод замера: секунды по полю wall_seconds/total_seconds, decode_tokens_per_second из eval_count/eval_duration.
TTFT: не измеряется в данном скрипте (не потоковый ответ).

## Вывод

Что работает на устройстве (по фактическим результатам):
- Аппаратная платформа: Apple M4, 24 GB RAM (см. раздел «Окружение»).
- Локальный Ollama-сервер запущен; модель qwen3.5:4b установлена и запускается.
- Созданы и использованы профили: itmo-local (Modelfile) и itmo-agent (Modelfile.agent).
- itmo-agent успешно загружен; по `ollama ps` подтверждено: CONTEXT 65536, PROCESSOR 100% GPU.
- Локальный OpenCode использует `ollama/itmo-agent` через агента `local-guide` (read-only) с локальным endpoint (http://localhost:11434/v1).
- Фактический вызов инструмента `read` подтвержден в `lab/results/read-check.jsonl` (прочитан demo/README.md).
- Выполнены пять независимых `opencode run` по вопросам из QUESTIONS.md; каждая сессия имеет уникальный `sessionID`; результаты сохранены в `lab/results/question-*.jsonl`.
- `make test` из demo выполнен успешно (все тесты ok).

Где модель ошибается (по этапу 65–80):
- Вопрос 1: корректно указан способ запуска тестов — `make test` (источник Makefile:2-3); также упомянут `python3 -m unittest -v`.
- Вопрос 2: финальный текст ответа модели — «Проверю структуру рабочей директории.»; содержательного ответа о пустом имени нет. Эталон проекта: `service.py:5-6` — `ValueError("empty name")`; `test_service.py:13-15` — `assertRaises(ValueError)`. Оценка: некорректен (ответ не дан).
- Вопрос 3: инструментально проверена предпосылка (поиск `unsubscribe` ничего не нашёл; просмотрены `service.py`, `test_service.py`), но финального текстового ответа нет. Оценка: частично корректен.
- Вопрос 4: корректно установлено отсутствие сведений о CI-конфигурации в предоставленном проекте (проверены типичные файлы конфигурации CI). Оценка: корректен.
- Вопрос 5: фактический ответ модели — «Да, подписки сохраняются после перезапуска процесса.» — неверен. Эталон: `README.md:2` указывает хранение в памяти процесса; `service.py:1` содержит `subscribers = set()`, при новом запуске множество пустое. Оценка: некорректен.

Границы модели по наблюдениям:
- Модель способна пользоваться инструментами (read/glob/grep) и находить подтверждения в коде, но наличие tool calls само по себе не гарантирует завершённый или фактически верный ответ: возможны отсутствие финального ответа (вопрос 3) и фактические ошибки при выводе (вопрос 5).

SYSTEM (API) vs инструкции агента (local-guide):
- `lab/system.txt` использовался в API-экспериментах для управления стилем и фактологической дисциплиной одной и той же модели (A/B с system prompt). Он задаёт правило «используй только переданный контекст», «не выдумывай», «короткий ответ + основание». Сам по себе такой SYSTEM не доказывает выполнение файловых операций.
- Инструкции агента `local-guide` определяются в `demo/opencode.json` и `demo/repo-system.txt`: они относятся к работе помощника в репозитории, разрешают использование инструментов (`read`, `glob`, `grep`) и требуют ссылаться на файл и строку; факт вызова инструмента подтверждается событиями `tool_use` в JSONL, а не только текстом ответа модели.

Итоговый статус:
- Speed benchmark выполнен: имеются отдельные прогретые повторы (speed-t02-1..3, speed-t08-1..3) и медианы в отчёте; cold42/43/44 и hot42/43/44 учитываются отдельно и не считаются warmed repeats.
- «Сравнение семейств» — заполнено (Qwen qwen3.5:4b и Google Gemma 2 2B) в соответствии с PREPARATION.md; неподтверждённые свойства помечены как «не подтверждено».
## HOMEWORK: A/B на Practice 1–2

Окружение и версии:
- OpenCode: 1.18.33
- Ollama: 0.34.4 (ollama --version)
- Модель: ollama/itmo-agent (локальный профиль поверх qwen3.5:4b)
- Digest (ollama ps ID): 3465bc38f59d9316f28681145949f0812597ed9bd1c831e04fed9c2301fb45ce
- База: qwen3.5:4b (~4.7B)
- Квантизация: Q4_K_M
- Контекст: 65536 (opencode runtime; num_ctx 65536)
- Доступные инструменты для тестовых агентов: read, glob, grep

Методология A/B:
- Один runtime snapshot: practices/practice_03/homework/runtime (P1/P2 материалы внутри runtime/practices/practice_01 и practice_02)
- Единственный отличающийся фактор: system prompt
  - System A: prompts/system_A.txt (hw-local-A)
  - System B: prompts/system_B.txt (hw-local-B)
- Идентичные остальное: модель, лимиты, директория, формат, разрешения инструментов
- Вопросы (общие для A и B): пять вопросов из questions/questions.md
- Независимость запусков: 5 независимых A + 5 независимых B, всего 10 run, 10 уникальных sessionID

Технический итог запусков:
- Проведено 10 независимых A/B запусков (5 A + 5 B), все с уникальными sessionID и сохранёнными событиями инструментов (tool events).
- В 8 запусках получен финальный текстовый ответ (type:"text"). A3 и B2 завершились без финального text event; это зафиксировано как наблюдаемая граница поведения локальной модели.

Команды запуска (фактически использованные):
- opencode run --dir practices/practice_03/homework/runtime --agent hw-local-A --model ollama/itmo-agent --format json "<Q>" > results/A?.jsonl
- opencode run --dir practices/practice_03/homework/runtime --agent hw-local-B --model ollama/itmo-agent --format json "<Q>" > results/B?.jsonl

Сопоставление с эталонами (references/expected.md):
- Q1. Где уточнено QA-1 и как сформулировано требование к evidence?
  - Ожидалось: practices/practice_01/adr.md:25–29 — по diff: ссылка по file/line и цитата/фрагмент; по правилу: явный ID правила из CASE.md; побуквенное совпадение не требуется; неподтверждённые исключаются.
  - A1 (final): no-answer/«не найдено» — некорректно по факту.
  - B1 (final): no-answer — некорректно по факту.

- Q2. OUT-1 поля/ограничения
  - Ожидалось: summary; risks ≤3 (file, line, evidence, risk); checks. Evidence в context.md:19;28 и adr.md:23.
  - A2 (final): указал из context.md:19 (summary, risks≤3 с полями, checks). Корректно по сути, неполная привязка к adr.md/context.md:28.
  - B2 (final): финальный ответ отсутствует в JSONL (нет события type:"text"). Технически VALID сессия, но фактический ответ для сравнения отсутствует — оценка как отсутствующий финальный текст.

- Q3. REL-1 формат — «открытый вопрос» (где зафиксировано)
  - Ожидалось: adr.md:31;101–103; tests_integration.md:8.
  - A3 (final): финальный текст отсутствует (нет type:"text"). Сессия завершилась без заключительного ответа.
  - B3 (final): no-answer — некорректно.

- Q4. Какая CI настроена
  - Ожидалось: сведений нет.
  - A4 (final): «сведений нет» — корректно.
  - B4 (final): «сведений нет» — корректно.

- Q5. «Все файлы, включая prompts.md, создаёт и изменяет OpenCode вручную». Так ли это?
  - Ожидалось: «нет»; источник: practices/practice_01/README.md:13 — говорится, что OpenCode создаёт/изменяет в режиме Build; ручное заполнение Markdown не требуется.
  - A5 (final): «да» — неверно, противоречит README.md:13.
  - B5 (final): «нет» — по сути верно; аргументация частично спорная, но основной тезис соответствует источнику.

Ошибки и ограничения, замеченные в A/B:
- A: ошибки на Q1 (не нашёл adr.md), Q5 (неверная интерпретация «вручную»); финал A3 отсутствует.
- B: ошибки на Q1 и Q3 (no-answer), частично спорная аргументация на Q5, финала B2 нет.
- Оба: уязвимость к промахам glob-шаблонов и неустойчивость нахождения файлов; иногда протокол содержит tool-use без последующего финального ответа.

Скорость (время на одну сессию, единицы: минуты:секунды.сотые):
- Warm-up (не учитывается в медиане): 2:10.41
- Measured runs:
  - run1: 2:20.47
  - run2: 5:05.58
  - run3: 2:03.41
- Перевод в секунды: 140.47; 305.58; 123.41 → отсортировано: 123.41; 140.47; 305.58 → медиана: 140.47 = 2:20.47
- Файл: practices/practice_03/homework/speed/runs.txt (обновлён)

Выбор конфигурации (требование HOMEWORK):
- Выбираю конфигурацию B (hw-local-B, system_B.txt) как итоговую.
  - Основание по наблюдаемым финальным ответам: на Q5 B дал корректный опровержительный ответ по ложной предпосылке, что важнее с точки зрения дисциплины репозитория и корректной интерпретации требований. A в аналогичном вопросе Q5 дал фактическую ошибку.
  - При этом признаю промахи B на Q1 и Q3 (no-answer), а также отсутствие финального ответа у B2. Тем не менее, критичный сценарий с ложной предпосылкой был обработан верно именно B, что для курса по инженерии подсказок считаю приоритетным.
  - Недостатки выбранной конфигурации B: неустойчивость поиска по путям (Q1, Q3), иногда отсутствие финального текста (B2). Это фиксируется настройками и/или улучшением подсказки, но в данном эксперименте оставлено как есть.

Полный набор артефактов:
- Конфиг (runtime): practices/practice_03/homework/runtime/opencode.json (steps=8; read/glob/grep)
- System prompts: system_A.txt, system_B.txt
- Вопросы: practices/practice_03/homework/questions/questions.md
- Эталоны: practices/practice_03/homework/references/expected.md
- Результаты: practices/practice_03/homework/results/A1–A5.jsonl; B1–B5.jsonl (tool events включены)
- Скорость: practices/practice_03/homework/speed/runs.txt (warm-up и 3 измерения; median 2:20.47)
