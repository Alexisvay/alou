import { useState, useCallback, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import {
  Box,
  Button,
  Grid,
  Typography,
  Paper,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PageHeader from '../components/PageHeader';
import EnvelopeCard from '../components/EnvelopeCard';
import IncomeDialog from '../components/IncomeDialog';
import EnvelopeDialog from '../components/EnvelopeDialog';
import PortfolioChart from '../components/PortfolioChart';
import { mockEnvelopes } from '../data/mockEnvelopes';
import { recalculateEnvelopes, type AllocationResult } from '../utils/calculateAllocation';
import { type Envelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function Dashboard() {
  // ── Income dialog state ────────────────────────────────────────────────────
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);

  // ── Envelope dialog state ─────────────────────────────────────────────────
  const [envelopeDialogOpen, setEnvelopeDialogOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);

  // ── Persisted data ────────────────────────────────────────────────────────
  const [baseEnvelopes, setBaseEnvelopes] = useLocalStorage<Envelope[]>(
    'alou_envelopes',
    mockEnvelopes,
  );

  const [incomeHistory, setIncomeHistory] = useLocalStorage<IncomeEntry[]>(
    'alou_income_history',
    [],
    (raw) =>
      (raw as IncomeEntry[]).map((entry) => ({
        ...entry,
        date: new Date(entry.date as unknown as string),
      })),
  );

  // ── Derived state ─────────────────────────────────────────────────────────
  const envelopes = useMemo(
    () => recalculateEnvelopes(baseEnvelopes, incomeHistory),
    [baseEnvelopes, incomeHistory],
  );

  // ── Income handlers ───────────────────────────────────────────────────────
  const handleApplyAllocation = useCallback(
    (results: AllocationResult[]) => {
      const amount = results.reduce((sum, r) => sum + r.allocatedAmount, 0);
      setIncomeHistory((prev) =>
        editingIncome
          ? prev.map((e) =>
              e.id === editingIncome.id ? { ...e, amount, allocations: results } : e,
            )
          : [{ id: crypto.randomUUID(), amount, date: new Date(), allocations: results }, ...prev],
      );
      setEditingIncome(null);
    },
    [editingIncome],
  );

  const handleDeleteIncome = useCallback((id: string) => {
    setIncomeHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleIncomeDialogClose = useCallback(() => {
    setIncomeDialogOpen(false);
    setEditingIncome(null);
  }, []);

  // ── Envelope handlers ─────────────────────────────────────────────────────
  const handleSaveEnvelope = useCallback(
    (data: Omit<Envelope, 'id'>, id?: string) => {
      setBaseEnvelopes((prev) =>
        id
          ? prev.map((e) => (e.id === id ? { ...e, ...data } : e))
          : [...prev, { id: crypto.randomUUID(), ...data }],
      );
    },
    [],
  );

  const handleDeleteEnvelope = useCallback((id: string) => {
    setBaseEnvelopes((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleEnvelopeDialogClose = useCallback(() => {
    setEnvelopeDialogOpen(false);
    setEditingEnvelope(null);
  }, []);

  return (
    <Box px={{ xs: 2, sm: 4, md: 6 }} py={4} maxWidth={1100} mx="auto">
      {/* Header + bouton revenu */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={2}
        mb={4}
      >
        <PageHeader
          title="Alou"
          subtitle="Gérez vos enveloppes d'investissement et répartissez vos revenus intelligemment."
        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingIncome(null);
            setIncomeDialogOpen(true);
          }}
          size="large"
        >
          Déclarer un revenu
        </Button>
      </Box>

      {/* Section enveloppes */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>
          Enveloppes
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingEnvelope(null);
            setEnvelopeDialogOpen(true);
          }}
        >
          Nouvelle enveloppe
        </Button>
      </Box>

      {/* Grille de cards */}
      <Grid container spacing={3}>
        {envelopes.map((envelope) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={envelope.id}>
            <EnvelopeCard
              envelope={envelope}
              onEdit={() => {
                setEditingEnvelope(envelope);
                setEnvelopeDialogOpen(true);
              }}
              onDelete={() => handleDeleteEnvelope(envelope.id)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Graphique de répartition */}
      <Box mt={4}>
        <PortfolioChart envelopes={envelopes} />
      </Box>

      {/* Historique des revenus */}
      {incomeHistory.length > 0 && (
        <Box mt={6}>
          <Typography variant="h6" fontWeight={600} mb={2} display="flex" alignItems="center" gap={1}>
            <HistoryIcon fontSize="small" />
            Historique des revenus
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack divider={<Divider />} spacing={0}>
              {incomeHistory.map((entry) => (
                <Box
                  key={entry.id}
                  display="flex"
                  flexDirection={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  gap={1}
                  py={2}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {formatCurrency(entry.amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(entry.date)}
                    </Typography>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap alignItems="center">
                    {entry.allocations.map(({ envelope, allocatedAmount }) => (
                      <Typography
                        key={envelope.id}
                        variant="body2"
                        component="span"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                        }}
                      >
                        {envelope.name}: {formatCurrency(allocatedAmount)}
                      </Typography>
                    ))}
                    <Box display="flex" gap={0.5} ml="auto">
                      <Tooltip title="Modifier">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingIncome(entry);
                            setIncomeDialogOpen(true);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Supprimer">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteIncome(entry.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Income dialog */}
      <IncomeDialog
        open={incomeDialogOpen}
        onClose={handleIncomeDialogClose}
        envelopes={envelopes}
        onApply={handleApplyAllocation}
        initialAmount={editingIncome?.amount}
      />

      {/* Envelope dialog */}
      <EnvelopeDialog
        open={envelopeDialogOpen}
        onClose={handleEnvelopeDialogClose}
        onSave={handleSaveEnvelope}
        initialEnvelope={editingEnvelope ?? undefined}
      />
    </Box>
  );
}
