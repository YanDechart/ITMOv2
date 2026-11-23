import BugReportRoundedIcon from '@mui/icons-material/BugReportRounded';
import DataObjectRoundedIcon from '@mui/icons-material/DataObjectRounded';
import PsychologyRoundedIcon from '@mui/icons-material/PsychologyRounded';
import { Card, CardContent, Grid, Stack, Typography } from '@mui/material';
import type { TriageRecord } from '../types';

export function StatsCards({ records }: { records: TriageRecord[] }) {
  const bugs = records.filter((item) => item.type === 'bug').length;
  const average = records.length
    ? Math.round((records.reduce((sum, item) => sum + item.confidence, 0) / records.length) * 100)
    : 0;

  const stats = [
    { label: 'Обработано', value: records.length, icon: <DataObjectRoundedIcon />, color: 'primary.main' },
    { label: 'Найдено багов', value: bugs, icon: <BugReportRoundedIcon />, color: 'secondary.main' },
    { label: 'Точность разбора', value: `${average}%`, icon: <PsychologyRoundedIcon />, color: 'success.main' },
  ];

  return (
    <Grid container spacing={2} aria-label="Статистика обращений">
      {stats.map((stat) => (
        <Grid key={stat.label} size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ height: '100%', boxShadow: 'none' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <div>
                  <Typography color="text.secondary" variant="body2">{stat.label}</Typography>
                  <Typography variant="h4" fontWeight={800} mt={0.5}>{stat.value}</Typography>
                </div>
                <Stack color={stat.color}>{stat.icon}</Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
