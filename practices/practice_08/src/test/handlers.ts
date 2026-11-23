import { delay, http, HttpResponse } from 'msw';

export const WEBHOOK_URL = 'http://localhost/webhook/bugradar-triage';

export const successResult = {
  type: 'bug',
  confidence: 0.94,
  priority: 'Высокий',
  summary: 'Неверный пароль не блокирует вход в личный кабинет.',
  recommendation: 'Проверить условие сравнения хэша пароля и добавить регрессионный тест.',
} as const;

export const handlers = [
  http.post(WEBHOOK_URL, async () => {
    await delay(40);
    return HttpResponse.json(successResult);
  }),
];

