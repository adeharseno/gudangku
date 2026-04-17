import { useMemo } from 'react';
import {
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Button,
  CircularProgress,
  LinearProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { ArrowBack as BackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useShipments } from '@/hooks/useShipments';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/utils/shipment-helpers';
import type { Shipment, ShipmentStatus, Priority } from '@/api/types';

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:00`;
}

function durationMinutes(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000);
}

export default function Performance() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { data: shipments, isLoading } = useShipments();

  const throughput = useMemo(() => {
    if (!shipments) return [];
    const byHour: Record<string, number> = {};
    shipments.forEach((s) => {
      const h = hourLabel(s.created_at);
      byHour[h] = (byHour[h] ?? 0) + 1;
    });
    return Object.entries(byHour)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));
  }, [shipments]);

  const bottlenecks = useMemo(() => {
    if (!shipments) return [];
    const dwellByStatus: Record<string, number[]> = {};
    shipments.forEach((s) => {
      const mins = durationMinutes(s.created_at, s.updated_at);
      dwellByStatus[s.status] = dwellByStatus[s.status] ?? [];
      dwellByStatus[s.status].push(mins);
    });
    return Object.entries(dwellByStatus)
      .map(([status, durations]) => ({
        status: status as ShipmentStatus,
        avgDwell: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        count: durations.length,
      }))
      .sort((a, b) => b.avgDwell - a.avgDwell);
  }, [shipments]);

  const maxDwell = bottlenecks[0]?.avgDwell || 1;

  const carrierStats = useMemo(() => {
    if (!shipments) return [];
    const byCarrier: Record<string, { total: number; delivered: number; onHold: number }> = {};
    shipments.forEach((s) => {
      const name = s.carrier.name;
      if (!byCarrier[name]) byCarrier[name] = { total: 0, delivered: 0, onHold: 0 };
      byCarrier[name].total++;
      if (s.status === 'delivered') byCarrier[name].delivered++;
      if (s.status === 'on_hold' || s.status === 'cancelled') byCarrier[name].onHold++;
    });
    return Object.entries(byCarrier)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total);
  }, [shipments]);

  const priorityDist = useMemo(() => {
    if (!shipments) return [];
    const byPriority: Record<string, number> = {};
    shipments.forEach((s) => {
      byPriority[s.priority] = (byPriority[s.priority] ?? 0) + 1;
    });
    return (['critical', 'urgent', 'normal'] as Priority[]).map((p) => ({
      priority: p,
      count: byPriority[p] ?? 0,
    }));
  }, [shipments]);

  const totalShipments = shipments?.length ?? 0;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/')} size={isMobile ? 'small' : 'medium'} variant="outlined">
          {isMobile ? 'Back' : 'Dashboard'}
        </Button>
        <Typography variant={isMobile ? 'h6' : 'h4'} fontWeight="bold">
          📊 Performance
        </Typography>
      </Stack>

      {isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}

      {shipments && (
        <Stack spacing={3}>
          {/* Throughput */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Throughput (Shipments Created per Hour)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Hour</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Shipments</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '50%' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {throughput.map((row) => (
                    <TableRow key={row.hour}>
                      <TableCell>{row.hour}</TableCell>
                      <TableCell>{row.count}</TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={(row.count / (throughput[0]?.count || 1)) * 100}
                          sx={{ height: 12, borderRadius: 1 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Bottleneck */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Bottleneck Identification (Avg Dwell Time by Status)
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Shipments</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Avg Dwell (min)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '40%' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {bottlenecks.map((row) => {
                    const cfg = STATUS_CONFIG[row.status];
                    return (
                      <TableRow key={row.status}>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Box sx={{ color: cfg.color, display: 'flex' }}>{cfg.icon}</Box>
                            <span>{cfg.label}</span>
                          </Stack>
                        </TableCell>
                        <TableCell>{row.count}</TableCell>
                        <TableCell>{row.avgDwell}</TableCell>
                        <TableCell>
                          <LinearProgress
                            variant="determinate"
                            value={(row.avgDwell / maxDwell) * 100}
                            color={row.avgDwell === maxDwell ? 'error' : 'primary'}
                            sx={{ height: 12, borderRadius: 1 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Carrier Performance */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Carrier Performance Comparison
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Carrier</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Delivered</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">On Hold / Cancelled</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Delivery Rate</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {carrierStats.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell align="right">{row.total}</TableCell>
                      <TableCell align="right">{row.delivered}</TableCell>
                      <TableCell align="right">{row.onHold}</TableCell>
                      <TableCell align="right">
                        {row.total > 0 ? `${Math.round((row.delivered / row.total) * 100)}%` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Priority Distribution */}
          <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Priority Distribution
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                gap: { xs: 1, sm: 2 },
              }}
            >
              {priorityDist.map((row) => {
                const cfg = PRIORITY_CONFIG[row.priority];
                const pct = totalShipments > 0 ? Math.round((row.count / totalShipments) * 100) : 0;
                return (
                  <Paper
                    key={row.priority}
                    variant="outlined"
                    sx={{ p: 2, textAlign: 'center', borderRadius: 2, backgroundColor: `${cfg.color}10` }}
                  >
                    <Box sx={{ color: cfg.color, display: 'flex', justifyContent: 'center', mb: 1 }}>
                      {cfg.icon}
                    </Box>
                    <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" sx={{ color: cfg.color }}>
                      {row.count}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {cfg.label} ({pct}%)
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          </Paper>
        </Stack>
      )}
    </Box>
  );
}
