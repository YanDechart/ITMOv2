import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { server } from './test/server';
import { successResult, WEBHOOK_URL } from './test/handlers';

const title = 'Авторизация принимает неверный пароль';
const description = 'После ввода существующего логина и неправильного пароля пользователь всё равно попадает в личный кабинет.';

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Заголовок'), title);
  await user.type(screen.getByLabelText('Описание'), description);
}

describe('BugRadar', () => {
  it('показывает исходное пустое состояние и открывает справочный диалог', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('Здесь появится результат')).toBeInTheDocument();
    expect(screen.getByTestId('empty-history')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'О сервисе' }));
    expect(screen.getByRole('dialog', { name: 'О сервисе BugRadar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Понятно' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('проверяет обязательные поля и некорректно короткие значения', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Проанализировать' }));
    expect(screen.getByText('Введите заголовок обращения')).toBeInTheDocument();
    expect(screen.getByText('Опишите проблему или задачу')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Заголовок'), 'Ошибка');
    await user.type(screen.getByLabelText('Описание'), 'Слишком коротко');
    await user.click(screen.getByRole('button', { name: 'Проанализировать' }));
    expect(screen.getByText('Заголовок должен содержать минимум 8 символов')).toBeInTheDocument();
    expect(screen.getByText('Добавьте подробности — минимум 30 символов')).toBeInTheDocument();
  });

  it('проходит основной сценарий от ввода до видимого результата', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Проанализировать' }));

    expect(screen.getByLabelText('Анализ выполняется')).toBeInTheDocument();
    expect(await screen.findByTestId('triage-result')).toBeInTheDocument();
    expect(screen.getAllByText('Bug').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('94%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(successResult.recommendation)).toBeInTheDocument();
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('empty-history')).not.toBeInTheDocument();
  });

  it('не отправляет второй запрос во время ожидания', async () => {
    let requestCount = 0;
    server.use(http.post(WEBHOOK_URL, async () => {
      requestCount += 1;
      await delay(180);
      return HttpResponse.json(successResult);
    }));
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);

    const submit = screen.getByRole('button', { name: 'Проанализировать' });
    await user.dblClick(submit);
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(screen.getByRole('button', { name: 'Анализируем…' })).toBeDisabled();
    expect(await screen.findByTestId('triage-result')).toBeInTheDocument();
    expect(requestCount).toBe(1);
  });

  it('показывает ошибку сервера и позволяет повторить запрос', async () => {
    let first = true;
    server.use(http.post(WEBHOOK_URL, () => {
      if (first) {
        first = false;
        return HttpResponse.json({ message: 'Классификатор временно недоступен' }, { status: 503 });
      }
      return HttpResponse.json(successResult);
    }));
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Проанализировать' }));

    expect(await screen.findByText('Классификатор временно недоступен')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Повторить попытку' }));
    expect(await screen.findByTestId('triage-result')).toBeInTheDocument();
  });

  it('обрабатывает пустой или некорректный ответ n8n', async () => {
    server.use(http.post(WEBHOOK_URL, () => HttpResponse.json({})));
    const user = userEvent.setup();
    render(<App />);
    await fillForm(user);
    await user.click(screen.getByRole('button', { name: 'Проанализировать' }));

    expect(await screen.findByText('Получен пустой или некорректный результат. Повторите анализ.')).toBeInTheDocument();
  });

  it('открывает и закрывает детали истории и подтверждение очистки', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'record-1' });
    localStorage.setItem('bugradar-history-v1', JSON.stringify([{
      id: 'record-1', title, description, ...successResult, createdAt: '2026-11-23T12:00:00.000Z',
    }]));
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: new RegExp(title) }));
    expect(screen.getByRole('dialog', { name: 'Детали анализа' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Закрыть' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Детали анализа' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Очистить историю' }));
    expect(screen.getByRole('dialog', { name: 'Очистить историю?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Отмена' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});

