import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Divider,
  IconButton,
  Tooltip,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import PageHeader from '../components/PageHeader';
import EnvelopeCard from '../components/EnvelopeCard';
import IncomeDialog from '../components/IncomeDialog';
import EnvelopeDialog from '../components/EnvelopeDialog';
import PortfolioChart from '../components/PortfolioChart';
import { mockEnvelopes } from '../data/mockEnvelopes';
import { recalculateEnvelopes, type AllocationResult } from '../utils/calculateAllocation';
import { type Envelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';
import * as db from '../lib/db';

interface DashboardProps {
  userId: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
}

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

export default function Dashboard({ userId, userEmail, onSignOut }: DashboardProps) {
  // ── Income dialog state ────────────────────────────────────────────────────
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);

  // ── Envelope dialog state ─────────────────────────────────────────────────
  const [envelopeDialogOpen, setEnvelopeDialogOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);

  // ── Remote data state ─────────────────────────────────────────────────────
  const [baseEnvelopes, setBaseEnvelopes] = useState<Envelope[]>([]);
  const [incomeHistory, setIncomeHistory] = useState<IncomeEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDataLoading(true);
      try {
        const [envelopes, incomes] = await Promise.all([
          db.fetchEnvelopes(userId),
          db.fetchIncomes(userId),
        ]);
        if (cancelled) return;

        if (envelopes.length === 0) {
          // Seed with fresh UUIDs, then re-fetch to get the real DB rows
          await Promise.all(mockEnvelopes.map((e) => db.upsertEnvelope(userId, e)));
          const seeded = await db.fetchEnvelopes(userId);
          if (!cancelled) setBaseEnvelopes(seeded);
        } else {
          setBaseEnvelopes(envelopes);
        }
        setIncomeHistory(incomes);
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [userId]);

  // ── Derived state ─────────────────────────────────────────────────────────
  const envelopes = useMemo(
    () => recalculateEnvelopes(baseEnvelopes, incomeHistory),
    [baseEnvelopes, incomeHistory],
  );

  const totalAllocation = useMemo(
    () => baseEnvelopes.reduce((sum, e) => sum + (Number(e.allocationPercentage) || 0), 0),
    [baseEnvelopes],
  );
  const allocationDiff = totalAllocation - 100;

  // ── Income handlers ───────────────────────────────────────────────────────
  const handleApplyAllocation = useCallback(
    (results: AllocationResult[]) => {
      const amount = results.reduce((sum, r) => sum + r.allocatedAmount, 0);
      const entry: IncomeEntry = editingIncome
        ? { ...editingIncome, amount, allocations: results }
        : { id: crypto.randomUUID(), amount, date: new Date(), allocations: results };

      setIncomeHistory((prev) =>
        editingIncome
          ? prev.map((e) => (e.id === editingIncome.id ? entry : e))
          : [entry, ...prev],
      );
      setEditingIncome(null);
      db.upsertIncome(userId, entry).catch(async (err) => {
        console.error('Failed to save income:', err);
        const fresh = await db.fetchIncomes(userId).catch(() => null);
        if (fresh) setIncomeHistory(fresh);
      });
    },
    [userId, editingIncome],
  );

  const handleDeleteIncome = useCallback((id: string) => {
    setIncomeHistory((prev) => prev.filter((e) => e.id !== id));
    db.deleteIncome(id).catch(async (err) => {
      console.error('Failed to delete income:', err);
      const fresh = await db.fetchIncomes(userId).catch(() => null);
      if (fresh) setIncomeHistory(fresh);
    });
  }, [userId]);

  const handleIncomeDialogClose = useCallback(() => {
    setIncomeDialogOpen(false);
    setEditingIncome(null);
  }, []);

  // ── Envelope handlers ─────────────────────────────────────────────────────
  const handleSaveEnvelope = useCallback(
    (data: Omit<Envelope, 'id'>, id?: string) => {
      const newId = id ?? crypto.randomUUID();
      const envelope: Envelope = { id: newId, ...data };
      setBaseEnvelopes((prev) =>
        id ? prev.map((e) => (e.id === id ? envelope : e)) : [...prev, envelope],
      );
      db.upsertEnvelope(userId, data, newId).catch(async (err) => {
        console.error('Failed to save envelope:', err);
        const fresh = await db.fetchEnvelopes(userId).catch(() => null);
        if (fresh) setBaseEnvelopes(fresh);
      });
    },
    [userId],
  );

  const handleDeleteEnvelope = useCallback((id: string) => {
    setBaseEnvelopes((prev) => prev.filter((e) => e.id !== id));
    db.deleteEnvelope(id).catch(async (err) => {
      console.error('Failed to delete envelope:', err);
      const fresh = await db.fetchEnvelopes(userId).catch(() => null);
      if (fresh) setBaseEnvelopes(fresh);
    });
  }, [userId]);

  const handleEnvelopeDialogClose = useCallback(() => {
    setEnvelopeDialogOpen(false);
    setEditingEnvelope(null);
  }, []);

  if (dataLoading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

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

        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
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
          <Tooltip title={`Déconnexion (${userEmail})`}>
            <IconButton onClick={onSignOut} sx={{ color: 'text.secondary' }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
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

      {/* Allocation status banner */}
      {baseEnvelopes.length > 0 && (() => {
        const isOk = allocationDiff === 0;
        const isOver = allocationDiff > 0;
        const color = isOk ? '#00BFA5' : isOver ? '#f44336' : '#ff9800';
        const bgcolor = isOk ? 'rgba(0,191,165,0.08)' : isOver ? 'rgba(244,67,54,0.08)' : 'rgba(255,152,0,0.08)';
        const borderColor = isOk ? 'rgba(0,191,165,0.25)' : isOver ? 'rgba(244,67,54,0.25)' : 'rgba(255,152,0,0.25)';
        const Icon = isOk ? CheckCircleOutlineIcon : isOver ? ErrorOutlineIcon : WarningAmberIcon;
        const message = isOk
          ? 'Répartition complète — 100% alloués'
          : isOver
          ? `Dépassement de ${allocationDiff}% — total actuel : ${totalAllocation}%`
          : `${Math.abs(allocationDiff)}% non alloués — total actuel : ${totalAllocation}%`;
        return (
          <Box
            display="flex"
            alignItems="center"
            gap={1.25}
            mb={3}
            px={2}
            py={1.25}
            sx={{ borderRadius: 2, bgcolor, border: `1px solid ${borderColor}` }}
          >
            <Icon sx={{ fontSize: 18, color, flexShrink: 0 }} />
            <Typography variant="body2" fontWeight={500} sx={{ color }}>
              {message}
            </Typography>
          </Box>
        );
      })()}

      {/* Grille de cards */}
      <Box
        display="grid"
        sx={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        gap={3}
      >
        {envelopes.map((envelope) => (
          <EnvelopeCard
            key={envelope.id}
            envelope={envelope}
            onEdit={() => {
              setEditingEnvelope(envelope);
              setEnvelopeDialogOpen(true);
            }}
            onDelete={() => handleDeleteEnvelope(envelope.id)}
          />
        ))}
      </Box>

      {/* Table de gestion des enveloppes */}
      {baseEnvelopes.length > 0 && (
        <Box mt={4}>
          <Typography
            variant="caption"
            fontWeight={600}
            color="text.secondary"
            display="block"
            mb={1.5}
            sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            Configuration
          </Typography>
          <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Enveloppe</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Objectif</TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>Allocation</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {baseEnvelopes.map((env) => (
                  <TableRow key={env.id} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{env.name}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatCurrency(env.targetAmount)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="primary.light">
                        {env.allocationPercentage}%
                      </Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 1 }}>
                      <Tooltip title="Modifier">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditingEnvelope(env);
                            setEnvelopeDialogOpen(true);
                          }}
                          sx={{
                            color: 'text.secondary',
                            '&:hover': { color: 'primary.light', bgcolor: 'rgba(77, 107, 255, 0.12)' },
                          }}
                        >
                          <EditIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        </Box>
      )}

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
                        sx={{ px: 1.5, py: 0.5, borderRadius: 2, bgcolor: 'action.hover' }}
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
