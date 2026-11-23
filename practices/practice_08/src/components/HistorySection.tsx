import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import type { TriageRecord } from '../types';

interface Props {
  records: TriageRecord[];
  onClear: () => void;
}

const typeLabel: Record<TriageRecord['type'], string> = {
  bug: 'Bug',
  task: 'Task',
  feature: 'Feature',
  'needs-triage': 'Needs triage',
};

export function HistorySection({ records, onClear }: Props) {
  const [selected, setSelected] = useState<TriageRecord | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <Box component="section" aria-labelledby="history-title">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2} mb={2}>
        <Box>
          <Typography id="history-title" variant="h2">История анализов</Typography>
          <Typography color="text.secondary" mt={0.6}>Последние результаты хранятся в этом браузере.</Typography>
        </Box>
        {records.length > 0 && (
          <Button color="inherit" startIcon={<DeleteSweepRoundedIcon />} onClick={() => setConfirmClear(true)}>
            Очистить историю
          </Button>
        )}
      </Stack>

      {records.length === 0 ? (
        <Stack
          alignItems="center"
          textAlign="center"
          spacing={1.4}
          sx={{ py: 7, px: 2, border: '1px dashed', borderColor: 'divider', borderRadius: 4 }}
          data-testid="empty-history"
        >
          <HistoryRoundedIcon color="disabled" fontSize="large" />
          <Typography variant="h3">История пока пуста</Typography>
          <Typography color="text.secondary">Первый успешный анализ появится здесь автоматически.</Typography>
        </Stack>
      ) : (
        <List disablePadding sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 4, overflow: 'hidden' }}>
          {records.map((record, index) => (
            <Box key={record.id}>
              {index > 0 && <Divider />}
              <ListItemButton onClick={() => setSelected(record)} sx={{ px: { xs: 2, md: 3 }, py: 2 }}>
                <ListItemText
                  primary={record.title}
                  secondary={new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(record.createdAt))}
                  primaryTypographyProps={{ fontWeight: 700 }}
                />
                <Chip label={typeLabel[record.type]} variant="outlined" sx={{ ml: 2 }} />
              </ListItemButton>
            </Box>
          ))}
        </List>
      )}

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="sm">
        <DialogTitle>Детали анализа</DialogTitle>
        <DialogContent>
          {selected && (
            <Stack spacing={2} pt={1}>
              <Chip label={typeLabel[selected.type]} color={selected.type === 'bug' ? 'error' : 'primary'} sx={{ alignSelf: 'flex-start' }} />
              <div>
                <Typography variant="caption" color="text.secondary">Заголовок</Typography>
                <Typography fontWeight={700}>{selected.title}</Typography>
              </div>
              <div>
                <Typography variant="caption" color="text.secondary">Описание</Typography>
                <Typography>{selected.description}</Typography>
              </div>
              <div>
                <Typography variant="caption" color="text.secondary">Рекомендация</Typography>
                <Typography>{selected.recommendation}</Typography>
              </div>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setSelected(null)}>Закрыть</Button></DialogActions>
      </Dialog>

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Очистить историю?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">Локальные результаты анализов будут удалены из этого браузера.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>Отмена</Button>
          <Button
            color="error"
            onClick={() => { onClear(); setConfirmClear(false); }}
          >
            Очистить
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
