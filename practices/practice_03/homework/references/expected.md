# Эталоны ответов и evidence

Q1. Где уточнено правило QA-1 и как сформулировано требование к evidence?
- Ответ: practices/practice_01/adr.md, решение по QA-1. Требование: evidence по diff должен ссылаться на указанную строку по file/line и содержать цитату или фрагмент из неё; для подтверждения правилом — однозначная ссылка на идентификатор правила из CASE.md (например, QA-1, SEC-1, OUT-1). Также явно указано, что побуквенное совпадение не требуется, а неподтверждённые элементы исключаются.
- Evidence: practices/practice_01/adr.md:25-29

Q2. Какие поля и ограничения задаёт OUT-1 в Практике 1?
- Ответ: JSON с summary, массив risks (≤3, каждый с file, line, evidence, risk) и массив checks.
- Evidence: practices/practice_01/context.md:19;28 и practices/practice_01/adr.md:23

Q3. Где зафиксировано, что формат контролируемого ответа при REL-1 остаётся «открытым вопросом»?
- Ответ: в adr.md указано, что формат и HTTP-статус контролируемого ответа не определены и остаются открытым вопросом; в tests_integration.md подчеркнуто, что статус/формат уточняются (открытый вопрос). Также в Practice 2 RAG эксперимент это закрепляет.
- Evidence: practices/practice_01/adr.md:31;101-103 и practices/practice_01/tests_integration.md:8

Q4. Какая CI-система настроена для запуска тестов Практик 1–2?
- Ответ: сведений нет в P1/P2.
- Evidence: отсутствие CI-конфигов в practices/practice_01 и practices/practice_02; типовые файлы .github/workflows/*.yml, .gitlab-ci.yml, .travis.yml отсутствуют.

Q5. «Все файлы, включая prompts.md, создаёт и изменяет OpenCode вручную». Так ли это?
- Ответ: нет. В README Практики 1 сказано, что OpenCode создаёт и изменяет файлы в режиме Build, а студент даёт задания и проверяет diff; «вручную» не утверждается, наоборот — manual заполнение Markdown не требуется.
- Evidence: practices/practice_01/README.md:13
