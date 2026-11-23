import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import ManageSearchRoundedIcon from '@mui/icons-material/ManageSearchRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import type { TriageRequest } from '../types';

interface Props {
  loading: boolean;
  onSubmit: (request: TriageRequest) => void;
}

interface Errors {
  title?: string;
  description?: string;
}

export function TriageForm({ loading, onSubmit }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): boolean => {
    const next: Errors = {};
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();

    if (!cleanTitle) next.title = 'Введите заголовок обращения';
    else if (cleanTitle.length < 8) next.title = 'Заголовок должен содержать минимум 8 символов';
    else if (cleanTitle.length > 120) next.title = 'Заголовок не должен превышать 120 символов';

    if (!cleanDescription) next.description = 'Опишите проблему или задачу';
    else if (cleanDescription.length < 30) next.description = 'Добавьте подробности — минимум 30 символов';
    else if (cleanDescription.length > 1000) next.description = 'Описание не должно превышать 1000 символов';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (loading || !validate()) return;
    onSubmit({ title: title.trim(), description: description.trim() });
  };

  const fillExample = () => {
    setTitle('Авторизация принимает неверный пароль');
    setDescription(
      'После ввода существующего логина и неправильного пароля пользователь всё равно попадает в личный кабинет. Ожидается отказ в доступе.',
    );
    setErrors({});
  };

  const handleShortcut = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <Box
      ref={formRef}
      component="form"
      onSubmit={submit}
      onKeyDown={handleShortcut}
      noValidate
      aria-label="Форма анализа обращения"
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            Новый запрос
          </Typography>
          <Typography variant="h2" mt={0.4}>
            Опишите обращение
          </Typography>
          <Typography color="text.secondary" mt={1}>
            Укажите заголовок и подробное описание проблемы или задачи.
          </Typography>
        </Box>

        <TextField
          id="issue-title"
          label="Заголовок"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={Boolean(errors.title)}
          helperText={errors.title || `${title.length}/120`}
          inputProps={{ maxLength: 121 }}
          disabled={loading}
          fullWidth
        />

        <TextField
          id="issue-description"
          label="Описание"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={Boolean(errors.description)}
          helperText={errors.description || `${description.length}/1000`}
          inputProps={{ maxLength: 1001 }}
          disabled={loading}
          multiline
          minRows={6}
          fullWidth
        />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={19} color="inherit" /> : <ManageSearchRoundedIcon />}
            sx={{ flex: 1 }}
          >
            {loading ? 'Анализируем…' : 'Проанализировать'}
          </Button>
          <Button
            type="button"
            variant="outlined"
            size="large"
            disabled={loading}
            startIcon={<BoltRoundedIcon />}
            onClick={fillExample}
          >
            Заполнить пример
          </Button>
        </Stack>

        <Typography variant="caption" color="text.secondary">
          Ctrl/⌘ + Enter также отправляет форму. Во время анализа повторная отправка заблокирована.
        </Typography>
      </Stack>
    </Box>
  );
}
