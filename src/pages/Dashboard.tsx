import { useState, useEffect } from 'react';
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
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  CircularProgress,
  Alert,
  Drawer,
  Button,
  IconButton,
  Divider,
  Card,
  CardActionArea,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Inventory as ReceivedStatIcon,
  PendingActions as PendingStatIcon,
  LocalShipping as DispatchedStatIcon,
  AccessTime as DelayedStatIcon,
  PauseCircle as OnHoldStatIcon,
  Close as CloseIcon,
  Route as RouteIcon,
  WarningAmber as WarningIcon,
  BarChart as AnalyticsIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { ShipmentStatus, Priority, Shipment } from '@/api/types';
import { useShipments } from '@/hooks/useShipments';
import { useShipmentStats } from '@/hooks/useShipmentStats';
import { useShipmentStream } from '@/hooks/useShipmentStream';
import { useRouteSuggestion } from '@/hooks/useRouteSuggestion';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '@/utils/shipment-helpers';
import ShipmentDetailModal from '@/components/ai-generated-component';

const ALL_STATUSES: ShipmentStatus[] = [
  'received', 'sorting', 'ready_to_dispatch', 'dispatched', 'delivered', 'on_hold', 'cancelled',
];
const ALL_PRIORITIES: Priority[] = ['normal', 'urgent', 'critical'];

export default function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [modalShipment, setModalShipment] = useState<Shipment | null>(null);

  const { data: shipments, isLoading, error } = useShipments({
    status: statusFilter,
    priority: priorityFilter,
  });
  const { data: stats } = useShipmentStats();
  useShipmentStream();

  const { suggestion, isLoading: isSuggestionLoading, error: suggestionError, hasContradiction, fetchSuggestion, reset: resetSuggestion } = useRouteSuggestion();

  // Reset suggestion when shipment selection changes
  useEffect(() => {
    resetSuggestion();
  }, [selectedShipment?.id, resetSuggestion]);

  const statCards = stats
    ? [
        { label: 'Received', value: stats.total_received, icon: <ReceivedStatIcon fontSize="small" />, color: '#2196F3', bg: 'rgba(33,150,243,0.08)' },
        { label: 'Pending', value: stats.total_pending, icon: <PendingStatIcon fontSize="small" />, color: '#FF9800', bg: 'rgba(255,152,0,0.08)' },
        { label: 'Dispatched', value: stats.total_dispatched, icon: <DispatchedStatIcon fontSize="small" />, color: '#00BCD4', bg: 'rgba(0,188,212,0.08)' },
        { label: 'Delayed', value: stats.total_delayed, icon: <DelayedStatIcon fontSize="small" />, color: '#F44336', bg: 'rgba(244,67,54,0.08)' },
        { label: 'On Hold', value: stats.total_on_hold, icon: <OnHoldStatIcon fontSize="small" />, color: '#9E9E9E', bg: 'rgba(158,158,158,0.08)' },
      ]
    : [];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant={isMobile ? 'h6' : 'h4'} fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          📦 GudangKu
        </Typography>
        <Button startIcon={<AnalyticsIcon />} onClick={() => navigate('/performance')} size={isMobile ? 'small' : 'medium'} variant="outlined">
          {isMobile ? 'Stats' : 'Performance'}
        </Button>
      </Stack>

      {/* Stat Cards — responsive grid */}
      {stats && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
            gap: { xs: 1, sm: 1.5, md: 2 },
            mb: { xs: 2, md: 3 },
          }}
        >
          {statCards.map((card) => (
            <Paper
              key={card.label}
              elevation={0}
              sx={{
                p: { xs: 1.5, sm: 2 },
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderRadius: 2,
                backgroundColor: card.bg,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ color: card.color, display: 'flex', p: 0.75, borderRadius: '50%', backgroundColor: `${card.color}20` }}>
                {card.icon}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight="bold" lineHeight={1.2}>
                  {card.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {card.label}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Box>
      )}

      {/* Filters */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <FormControl sx={{ flex: 1, minWidth: 0 }} size="small">
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => setStatusFilter(e.target.value as ShipmentStatus | '')}
          >
            <MenuItem value="">All Statuses</MenuItem>
            {ALL_STATUSES.map((s) => (
              <MenuItem key={s} value={s}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ color: STATUS_CONFIG[s].color, display: 'flex', fontSize: 18 }}>
                    {STATUS_CONFIG[s].icon}
                  </Box>
                  <span>{STATUS_CONFIG[s].label}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ flex: 1, minWidth: 0 }} size="small">
          <InputLabel>Priority</InputLabel>
          <Select
            value={priorityFilter}
            label="Priority"
            onChange={(e) => setPriorityFilter(e.target.value as Priority | '')}
          >
            <MenuItem value="">All Priorities</MenuItem>
            {ALL_PRIORITIES.map((p) => (
              <MenuItem key={p} value={p}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ color: PRIORITY_CONFIG[p].color, display: 'flex', fontSize: 18 }}>
                    {PRIORITY_CONFIG[p].icon}
                  </Box>
                  <span>{PRIORITY_CONFIG[p].label}</span>
                </Stack>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      {/* Loading / Error */}
      {isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 4 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load shipments</Alert>}

      {/* Shipment Table — desktop/tablet */}
      {shipments && !isMobile && (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 'bold', backgroundColor: 'grey.50' } }}>
                <TableCell>ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Carrier</TableCell>
                <TableCell>Destination</TableCell>
                <TableCell align="right">Pkgs</TableCell>
                <TableCell align="center" sx={{ width: 56 }}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shipments.map((shipment) => {
                const sc = STATUS_CONFIG[shipment.status];
                const pc = PRIORITY_CONFIG[shipment.priority];
                const isSelected = selectedShipment?.id === shipment.id;
                return (
                  <TableRow
                    key={shipment.id}
                    hover
                    selected={isSelected}
                    onClick={() => setSelectedShipment(isSelected ? null : shipment)}
                    sx={{ cursor: 'pointer', '&.Mui-selected': { backgroundColor: 'action.selected' }, '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {shipment.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={sc.icon}
                        label={sc.label}
                        size="small"
                        sx={{
                          backgroundColor: sc.color,
                          color: '#fff',
                          '& .MuiChip-icon': { color: '#fff' },
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={pc.icon}
                        label={pc.label}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: pc.color,
                          color: pc.color,
                          '& .MuiChip-icon': { color: pc.color },
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                    <TableCell>{shipment.carrier.name}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {shipment.destination}
                    </TableCell>
                    <TableCell align="right">{shipment.package_count}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setModalShipment(shipment); }}
                        aria-label="View details"
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
              {shipments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No shipments match the selected filters</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Shipment List — mobile cards */}
      {shipments && isMobile && (
        <Stack spacing={1}>
          {shipments.map((shipment) => {
            const sc = STATUS_CONFIG[shipment.status];
            const pc = PRIORITY_CONFIG[shipment.priority];
            const isSelected = selectedShipment?.id === shipment.id;
            return (
              <Card
                key={shipment.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  borderWidth: isSelected ? 2 : 1,
                }}
              >
                <CardActionArea
                  onClick={() => setSelectedShipment(isSelected ? null : shipment)}
                  sx={{ p: 1.5 }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.75, flexWrap: 'wrap', gap: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {shipment.id}
                        </Typography>
                        <Chip
                          icon={sc.icon}
                          label={sc.label}
                          size="small"
                          sx={{
                            backgroundColor: sc.color,
                            color: '#fff',
                            '& .MuiChip-icon': { color: '#fff', fontSize: 14 },
                            fontWeight: 500,
                            height: 24,
                            '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' },
                          }}
                        />
                        <Chip
                          icon={pc.icon}
                          label={pc.label}
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: pc.color,
                            color: pc.color,
                            '& .MuiChip-icon': { color: pc.color, fontSize: 14 },
                            fontWeight: 500,
                            height: 24,
                            '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' },
                          }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {shipment.carrier.name} · {shipment.destination}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {shipment.package_count} pkg · {shipment.weight_kg} kg
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); setModalShipment(shipment); }}
                      aria-label="View details"
                      sx={{ ml: 1 }}
                    >
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </CardActionArea>
              </Card>
            );
          })}
          {shipments.length === 0 && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No shipments match the selected filters</Typography>
            </Paper>
          )}
        </Stack>
      )}

      {/* AI Route Suggestion Drawer */}
      <Drawer
        anchor="right"
        open={!!selectedShipment}
        onClose={() => setSelectedShipment(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 }, p: 3 } }}
      >
        {selectedShipment && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                {selectedShipment.id}
              </Typography>
              <IconButton onClick={() => setSelectedShipment(null)} aria-label="Close panel">
                <CloseIcon />
              </IconButton>
            </Stack>

            <Stack spacing={1} sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {selectedShipment.sender} → {selectedShipment.recipient}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                <Chip
                  icon={STATUS_CONFIG[selectedShipment.status].icon}
                  label={STATUS_CONFIG[selectedShipment.status].label}
                  size="small"
                  sx={{
                    backgroundColor: STATUS_CONFIG[selectedShipment.status].color,
                    color: '#fff',
                    '& .MuiChip-icon': { color: '#fff' },
                  }}
                />
                <Chip
                  icon={PRIORITY_CONFIG[selectedShipment.priority].icon}
                  label={PRIORITY_CONFIG[selectedShipment.priority].label}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: PRIORITY_CONFIG[selectedShipment.priority].color,
                    color: PRIORITY_CONFIG[selectedShipment.priority].color,
                    '& .MuiChip-icon': { color: PRIORITY_CONFIG[selectedShipment.priority].color },
                  }}
                />
              </Stack>
              <Typography variant="body2">
                <strong>Carrier:</strong> {selectedShipment.carrier.name}
              </Typography>
              <Typography variant="body2">
                <strong>Destination:</strong> {selectedShipment.destination}
              </Typography>
              <Typography variant="body2">
                <strong>Packages:</strong> {selectedShipment.package_count} · <strong>Weight:</strong> {selectedShipment.weight_kg} kg
              </Typography>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              <RouteIcon sx={{ verticalAlign: 'middle', mr: 0.5 }} />
              AI Route Suggestion
            </Typography>

            <Button
              variant="contained"
              onClick={() => fetchSuggestion(selectedShipment)}
              disabled={isSuggestionLoading}
              fullWidth
              sx={{ mb: 2 }}
            >
              {isSuggestionLoading ? 'Generating...' : suggestion ? 'Regenerate Suggestion' : 'Get Route Suggestion'}
            </Button>

            {suggestionError && (
              <Alert severity="error" sx={{ mb: 2 }}>{suggestionError}</Alert>
            )}

            {hasContradiction && (
              <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                This suggestion may conflict with the shipment's <strong>{selectedShipment.priority}</strong> priority. Review before acting.
              </Alert>
            )}

            {(suggestion || isSuggestionLoading) && (
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  minHeight: 80,
                  backgroundColor: 'grey.50',
                  whiteSpace: 'pre-wrap',
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2">
                  {suggestion}
                  {isSuggestionLoading && <span style={{ opacity: 0.5 }}>▊</span>}
                </Typography>
              </Paper>
            )}
          </Box>
        )}
      </Drawer>

      {/* Shipment Detail Modal (Task 3 — fixed ai-generated-component) */}
      {modalShipment && (
        <ShipmentDetailModal
          shipment={modalShipment}
          open={!!modalShipment}
          onClose={() => setModalShipment(null)}
        />
      )}
    </Box>
  );
}
