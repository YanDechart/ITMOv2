import type { IssueType, TriageRequest, TriageResult } from '../types';

const VALID_TYPES: IssueType[] = ['bug', 'task', 'feature', 'needs-triage'];

export class TriageApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TriageApiError';
  }
}

export async function classifyIssue(
  payload: TriageRequest,
  signal?: AbortSignal,
): Promise<TriageResult> {
  const endpoint = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;

  if (!endpoint) {
    throw new TriageApiError('Сервис пока не подключён. Проверьте настройки и повторите попытку.');
  }

  const body = new URLSearchParams({
    title: payload.title.trim(),
    description: payload.description.trim(),
    repository: 'YanDechart/ITMOv2',
  });

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new TriageApiError('Не удалось связаться с сервисом. Проверьте подключение и повторите попытку.');
  }

  if (!response.ok) {
    let message = 'Не удалось обработать обращение. Попробуйте ещё раз.';
    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) message = errorBody.message;
    } catch {}
    throw new TriageApiError(message);
  }

  const data = (await response.json()) as Partial<TriageResult> | null;
  if (
    !data ||
    !VALID_TYPES.includes(data.type as IssueType) ||
    typeof data.confidence !== 'number' ||
    typeof data.priority !== 'string' ||
    typeof data.recommendation !== 'string' ||
    typeof data.summary !== 'string'
  ) {
    throw new TriageApiError('Получен пустой или некорректный результат. Повторите анализ.');
  }

  return data as TriageResult;
}
