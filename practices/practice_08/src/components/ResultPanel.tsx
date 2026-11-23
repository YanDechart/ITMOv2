import TrackChangesRoundedIcon from '@mui/icons-material/TrackChangesRounded';
import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  LinearProgress,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import type { IssueType, TriageResult } from '../types';
import type { ReactElement } from 'react';

interface Props {
  result: TriageResult | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const typeMeta: Record<IssueType, { label: string; color: 'error' | 'info' | 'success' | 'warning'; icon: ReactElement }> = {
  bug: { label: 'Bug', color: 'error', icon: <BugReportRoundedIcon /> },
  task: { label: 'Task', color: 'info', icon: <TaskAltRoundedIcon /> },
  feature: { label: 'Feature', color: 'success', icon: <TipsAndUpdatesRoundedIcon /> },
  'needs-triage': { label: 'Needs triage', color: 'warning', icon: <ErrorOutlineRoundedIcon /> },
};

export function ResultPanel({ result, loading, error, onRetry }: Props) {
  if (loading) {
    return (
      <Stack spacing={2.4} aria-live="polite" aria-label="Анализ выполняется">
        <Box>
          <Typography variant="overline" color="primary.main" fontWeight={800}>
            Разбор обращения
          </Typography>
          <Typography variant="h2" mt={0.4}>Разбираем контекст</Typography>
          <Typography color="text.secondary" mt={1}>Проверяем описание и определяем приоритет.</Typography>
        </Box>
        <LinearProgress aria-label="Прогресс анализа" />
        <Skeleton variant="rounded" height={50} />
        <Skeleton variant="rounded" height={92} />
        <Skeleton variant="rounded" height={72} />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={2.5} aria-live="assertive">
        <Box>
          <Typography variant="overline" color="error.main" fontWeight={800}>Ошибка</Typography>
          <Typography variant="h2" mt={0.4}>Анализ не завершён</Typography>
        </Box>
        <Alert severity="error" variant="outlined">{error}</Alert>
        <Button variant="contained" color="secondary" startIcon={<ReplayRoundedIcon />} onClick={onRetry}>
          Повторить попытку
        </Button>
      </Stack>
    );
  }

  if (!result) {
    return (
      <Stack
        spacing={2}
        alignItems="flex-start"
        justifyContent="center"
        minHeight={420}
        aria-label="Результат пока отсутствует"
      >
        <Box
          sx={{
            width: 68,
            height: 68,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 3,
            bgcolor: 'rgba(0,168,232,.1)',
            color: 'primary.main',
          }}
        >
          <TrackChangesRoundedIcon fontSize="large" />
        </Box>
        <Typography variant="h2">Здесь появится результат</Typography>
        <Typography color="text.secondary" maxWidth={420}>
          Заполни форму — здесь появятся тип обращения, приоритет и рекомендация для команды.
        </Typography>
      </Stack>
    );
  }

  const meta = typeMeta[result.type];
  const confidencePercent = Math.round(result.confidence * 100);

  return (
    <Stack spacing={2.5} aria-live="polite" data-testid="triage-result">
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Typography variant="overline" color="success.main" fontWeight={800}>Готово</Typography>
          <Typography variant="h2" mt={0.4}>Результат разбора</Typography>
        </Box>
        <CheckCircleRoundedIcon color="success" fontSize="large" />
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Chip icon={meta.icon} label={meta.label} color={meta.color} />
        <Chip label={`Приоритет: ${result.priority}`} variant="outlined" />
      </Stack>

      <Box>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography fontWeight={700}>Уверенность результата</Typography>
          <Typography fontWeight={800} color="primary.main">{confidencePercent}%</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={confidencePercent} aria-label={`Уверенность ${confidencePercent}%`} />
      </Box>

      <Box sx={{ p: 2.2, border: '1px solid', borderColor: 'divider', borderRadius: 3, bgcolor: '#0D0D0D' }}>
        <Typography variant="caption" color="text.secondary">Краткое резюме</Typography>
        <Typography mt={0.6}>{result.summary}</Typography>
      </Box>

      <Box sx={{ p: 2.2, borderLeft: '3px solid', borderColor: 'primary.main', bgcolor: 'rgba(0,168,232,.07)' }}>
        <Typography variant="caption" color="primary.main" fontWeight={800}>СЛЕДУЮЩИЙ ШАГ</Typography>
        <Typography mt={0.6}>{result.recommendation}</Typography>
      </Box>
    </Stack>
  );
}
