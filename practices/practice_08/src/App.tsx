import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import RadarRoundedIcon from '@mui/icons-material/RadarRounded';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  ThemeProvider,
  Toolbar,
  Typography,
} from '@mui/material';
import { classifyIssue } from './api/triageApi';
import { HistorySection } from './components/HistorySection';
import { ResultPanel } from './components/ResultPanel';
import { StatsCards } from './components/StatsCards';
import { TriageForm } from './components/TriageForm';
import { appTheme, palette } from './theme';
import type { TriageRecord, TriageRequest, TriageResult } from './types';
import './styles.css';

const STORAGE_KEY = 'bugradar-history-v1';

function createRecordId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `triage-${Date.now()}`;
}

function readHistory(): TriageRecord[] {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as TriageRecord[]) : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [records, setRecords] = useState<TriageRecord[]>(readHistory);
  const [result, setResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<TriageRequest | null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const requestInFlight = useRef(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, 12)));
  }, [records]);

  const analyze = useCallback(async (request: TriageRequest) => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setLoading(true);
    setError(null);
    setResult(null);
    setLastRequest(request);

    try {
      const nextResult = await classifyIssue(request);
      const record: TriageRecord = {
        ...request,
        ...nextResult,
        id: createRecordId(),
        createdAt: new Date().toISOString(),
      };
      setResult(nextResult);
      setRecords((current) => [record, ...current].slice(0, 12));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Неизвестная ошибка. Повторите попытку.');
    } finally {
      requestInFlight.current = false;
      setLoading(false);
    }
  }, []);

  const retry = () => {
    if (lastRequest) void analyze(lastRequest);
  };

  const heroLabel = useMemo(() => records.length === 0 ? 'Репозиторий YanDechart/ITMOv2' : `Обработано обращений: ${records.length}`, [records.length]);

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AppBar position="sticky" color="transparent" elevation={0} sx={{ backdropFilter: 'blur(18px)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ minHeight: 72 }}>
            <Stack direction="row" alignItems="center" spacing={1.2} sx={{ flexGrow: 1 }}>
              <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', bgcolor: 'primary.main', color: palette.ink, borderRadius: 2.2 }}>
                <RadarRoundedIcon />
              </Box>
              <Box>
                <Typography fontWeight={850} lineHeight={1.05}>BugRadar</Typography>
                <Typography variant="caption" color="text.secondary">Разбор обращений</Typography>
              </Box>
            </Stack>
            <Chip label="YanDechart/ITMOv2" variant="outlined" sx={{ display: { xs: 'none', sm: 'flex' }, mr: 1.5 }} />
            <Button color="inherit" startIcon={<HelpOutlineRoundedIcon />} onClick={() => setAboutOpen(true)}>
              О сервисе
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Box component="main">
        <Container maxWidth="xl">
          <Box component="section" className="hero-grid" sx={{ py: { xs: 7, md: 10 } }}>
            <Box className="hero-copy">
              <Typography variant="overline" color="primary.main" fontWeight={850}>{heroLabel}</Typography>
              <Typography variant="h1" mt={1}>
                Разбор<br />
                <Box component="span" color="primary.main">GitHub Issues</Box>
              </Typography>
              <Typography color="text.secondary" fontSize={{ xs: '1rem', md: '1.18rem' }} maxWidth={660} mt={3}>
                Укажите заголовок и описание обращения. Сервис определит тип, приоритет и предложит следующий шаг для команды.
              </Typography>
            </Box>
          </Box>

          <StatsCards records={records} />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1fr)' }, gap: 2.5, my: { xs: 4, md: 6 } }}>
            <Card component="section"><CardContent sx={{ p: { xs: 2.5, md: 4 } }}><TriageForm loading={loading} onSubmit={(request) => void analyze(request)} /></CardContent></Card>
            <Card component="section" sx={{ background: 'linear-gradient(145deg, #151515, #0D0D0D)' }}><CardContent sx={{ p: { xs: 2.5, md: 4 }, height: '100%' }}><ResultPanel result={result} loading={loading} error={error} onRetry={retry} /></CardContent></Card>
          </Box>

          <HistorySection records={records} onClear={() => { setRecords([]); setResult(null); }} />

          <Divider sx={{ mt: 8 }} />
          <Stack component="footer" direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} py={4} color="text.secondary">
            <Typography variant="body2">BugRadar · разбор обращений</Typography>
            <Typography variant="body2">YanDechart / ITMOv2 · Practice 08</Typography>
          </Stack>
        </Container>
      </Box>

      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>О сервисе BugRadar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} pt={1}>
            {[
              ['01', 'Опиши проблему или новую задачу.'],
              ['02', 'Сервис определит тип и приоритет обращения.'],
              ['03', 'Результат появится справа и сохранится в истории.'],
            ].map(([number, text]) => (
              <Stack key={number} direction="row" spacing={2} alignItems="flex-start">
                <Typography color="primary.main" fontWeight={850}>{number}</Typography>
                <Typography>{text}</Typography>
              </Stack>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setAboutOpen(false)}>Понятно</Button></DialogActions>
      </Dialog>
    </ThemeProvider>
  );
}
