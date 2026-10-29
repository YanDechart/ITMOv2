# Отчёт 2. Повторные проверки после исправлений

Документ фиксирует результаты повторного аудита Mini Shop после внесения исправлений. Для всех сценариев из REPORT_01.md собраны артефакты в practices/practice_06/evidence/after/ с точными запросами, статусами и ответами. Описывается методика проверки и фактические результаты без внутренней отладочной хронологии.

## Среда
- Локальный HTTP: 127.0.0.1:8066
- Песочница: временный каталог, создаётся при старте
- Контроль: исходные артефакты сохранены в evidence/before/, новые — в evidence/after/

## Сравнение до/после по сценариям

1) SQL-инъекции
- /profile?id=1 OR 1=1
  - До: 200, все профили (evidence/before/sql_profile/)
  - После: 401 без токена (evidence/after/sql_profile/); с токеном — 400 (некорректный id) подтверждено регрессионным тестом test_sql_injection_profile_blocked.
  - Вывод: устранена; артефакт 401 демонстрирует проверку авторизации, отсутствие инъекции подтверждено параметризацией запросов и тестами.
- /search?q=' OR 1=1 --
  - До: 200, все профили (evidence/before/sql_search/)
  - После: требует токен; с токеном — 200, без широкого раскрытия (evidence/after/sql_search/ показывает пустой массив при инъекционном запросе).
  - Вывод: устранена; подтверждено ограниченным результатом и параметризацией запросов (а также тестом test_sql_injection_search_blocked).
- /assistant/context?order_id=1 OR 1=1
  - До: 200, prompt включал несколько заказов (evidence/before/sql_context/)
  - После: 401 без токена (evidence/after/sql_context/); с токеном — 400 (некорректный order_id) подтверждено тестом test_sql_injection_context_blocked.
  - Вывод: устранена; 401 демонстрирует авторизацию, отсутствие инъекции подтверждено параметризацией и тестом.

2) IDOR
- Профиль чужого пользователя (alice → id=2)
  - До: 200, чужой профиль (evidence/before/idor_profile/)
  - После: 403 (запрещено для не-staff) (evidence/after/profile_other_auth/)
  - Вывод: устранена (жёсткий запрет доступа к чужому id).
- GET /orders без токена
  - До: 200, все заказы (evidence/before/idor_orders/)
  - После: 401 (evidence/after/idor_orders/)
  - Вывод: устранена.
- /files?user=bob&path=receipt.txt с токеном alice
  - До: 200, чужой чек (evidence/before/idor_files/)
  - После: 401 без токена; с токеном — 403 (evidence/after/idor_files/ и idor_files_auth/)
  - Вывод: устранена.

3) Подмена роли через X-Role в /admin/export
- До: 200 без сессии (evidence/before/spoof_admin_export/)
- После: 401 без токена; только staff сессия допускается (проверено в автотестах) (evidence/after/spoof_admin_export/)
- Вывод: устранена.

4) Манипуляция ценой /orders
- До: создавался заказ по цене 1 (evidence/before/price_manipulation/)
- После: без токена — 401 (evidence/after/price_manipulation/). Этот HTTP-артефакт подтверждает только требование авторизации.
- Отдельно: перерасчёт цены на сервере принудительно использует каталожное значение (игнорирует входной price) — подтверждено реализацией и регрессионным тестом test_orders_price_enforced.
- Вывод: устранена; артефакт 401 демонстрирует проверку авторизации, корректная цена подтверждена кодом и тестом.

5) Stored XSS через отзывы
- До: HTML содержал <script> (evidence/before/xss_reviews/)
- После: наличие экранирования подтверждено реализацией и регрессионным тестом test_reviews_html_escaped. Сам HTTP-артефакт просмотра (evidence/after/xss_reviews/) не демонстрирует экранирование конкретного вредоносного payload.
- Вывод: устранена (экранирование HTML подтверждено кодом и тестом).

6) /debug/logs
- До: 200 без авторизации (evidence/before/debug_logs/)
- После: 401 без токена; доступ для staff подтверждён автотестами (evidence/after/debug_logs/ и debug_logs_auth/)
- Вывод: устранена.

7) /assistant/execute без авторизации
- export_profiles без токена
  - До: 200 (evidence/before/tools_export_profiles/)
  - После: 401 (evidence/after/tools_export_profiles/)
  - Вывод: устранена.
- read_file(private/operator-note.txt) без токена
  - До: 200 (evidence/before/tools_read_private/)
  - После: 401 (evidence/after/tools_read_private/)
  - Вывод: устранена.
- delete_tree на тестовом файле без токена
  - До: 200 с удалением (evidence/before/tools_delete_tree/)
  - После: 401/403 без токена; только staff допускается (см. автотесты)
  - Вывод: устранена.

## Дополнительные проверки
- Обход через ../ и URL-encoded:
- /files?path=../private/operator-note.txt → 401 без токена; с токеном клиента — 403 (ограничение на собственные файлы). (evidence/after/files_traversal_no_user/, files_traversal_urlenc/, files_traversal_auth_parent/, files_traversal_auth_urlenc/)
  - assistant/execute read_file с путём files/alice/../../private/operator-note.txt и X-Token alice → 403 (evidence/after/tools_read_traversal/, tools_read_traversal_auth/)
- Доступ к чужому профилю с валидным токеном:
  - GET /profile?id=2 с X-Token alice → 403 (запрещено). (evidence/after/profile_other_auth/)
- Доступ к /assistant/context для чужого заказа:
  - GET /assistant/context?order_id=2 с X-Token alice → 403 (запрещено). (evidence/after/context_other_order_auth/)
- Утечка токенов через /debug/logs:
  - Доступ только staff; журнал не выдаётся анонимам. Заголовок X-Token маскируется. (evidence/after/debug_logs_unauth/, debug_logs_auth/)
- delete_tree без staff-сессии:
  - 401/403 без токена; клиенту запрещено (см. автотесты).

## Prompt injection
- Доставка вредоносного текста в контекст ассистента подтверждена (см. evidence/before/prompt_injection/context_after.json).
- Эксплуатация /assistant/execute через прямые HTTP-запросы до исправлений подтверждена отдельными артефактами (см. REPORT_01.md: tools_export_profiles, tools_read_private, delete_tree).
- Проведён отдельный ограниченный эксперимент с реальной LLM (без запуска внешних провайдеров) — см. practices/practice_06/evidence/llm_experiment/:
  - README.md
  - control_input.txt, control_output.txt
  - attack_input.txt, attack_output.txt
  Результат: оба ответа модели имеют tool="refuse"; маркер SHOP_AUDIT_OVERRIDE_7319 отсутствует в атакующем ответе; опасные инструменты не вызывались. В данном эксперименте инъекция не достигла цели.
- Ограничение: ответы получены через general subagent OpenCode, а не через полный рабочий процесс Mini Shop; интеграция с LLM целиком не проверялась.

## Итог
- Артефакты повторных проверок сохранены в `evidence/after/`. Дополнительный эксперимент с LLM показал, что в исследованном сценарии модель проигнорировала внедрённую инструкцию; полноценная интеграция Mini Shop с LLM не проверялась. Среди остаточных рисков — сохранение чувствительных данных из тел запросов, включая пароли, в журнале приложения.
