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
  CircularProgress,
  Snackbar,
  Alert,
  Avatar,
  Menu,
  MenuItem,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import EnvelopeCard from '../components/EnvelopeCard';
import IncomeDialog from '../components/IncomeDialog';
import EnvelopeDialog from '../components/EnvelopeDialog';
import PortfolioChart from '../components/PortfolioChart';
import PortfolioSummary from '../components/PortfolioSummary';
import { mockEnvelopes } from '../data/mockEnvelopes';
import { recalculateEnvelopes, type AllocationResult } from '../utils/calculateAllocation';
import { type Envelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';
import * as db from '../lib/db';
import { formatCurrency, formatDate } from '../utils/format';

interface DashboardProps {
  userId: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
}

export default function Dashboard({ userId, userEmail, onSignOut }: DashboardProps) {
  // ── User menu state ───────────────────────────────────────────────────────
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const displayName = userEmail.split('@')[0];
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';

  // ── Income dialog state ────────────────────────────────────────────────────
  const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeEntry | null>(null);

  // ── Envelope dialog state ─────────────────────────────────────────────────
  const [envelopeDialogOpen, setEnvelopeDialogOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);

  // ── Snackbar ──────────────────────────────────────────────────────────────
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const closeSnackbar = useCallback(() => setSnackbar((s) => ({ ...s, open: false })), []);

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
      setSnackbar({ open: true, message: editingIncome ? 'Revenu modifié' : 'Revenu ajouté' });
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
    setSnackbar({ open: true, message: 'Revenu supprimé' });
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
      setSnackbar({ open: true, message: id ? 'Enveloppe modifiée' : 'Enveloppe créée' });
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
    setSnackbar({ open: true, message: 'Enveloppe supprimée' });
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
      {/* Header */}
      <Box mb={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              component="img"
              src="/logo-alou.png"
              alt="Alou"
              sx={{
                width: 36,
                height: 36,
                objectFit: 'contain',
                display: 'block',
                transform: 'translateY(1px)',
              }}
            />
            <Typography variant="h4" fontWeight={700} color="text.primary">
              Alou
            </Typography>
          </Box>

        <Stack direction="row" gap={2} alignItems="center">
          {/* User menu */}
          <Stack
            direction="row"
            alignItems="center"
            gap={0.75}
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ cursor: 'pointer', userSelect: 'none' }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.8rem',
                fontWeight: 700,
                bgcolor: 'rgba(77, 107, 255, 0.25)',
                color: 'primary.light',
                border: '1px solid rgba(77, 107, 255, 0.35)',
              }}
            >
              {avatarLetter}
            </Avatar>
            <Typography variant="body2" fontWeight={600} color="text.primary">
              {displayName}
            </Typography>
            <Typography variant="body2" color="text.secondary" lineHeight={1}>▾</Typography>
          </Stack>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: { minWidth: 220, mt: 1 },
              },
            }}
          >
            <Box px={2} py={1.25}>
              <Typography variant="caption" color="text.secondary" display="block">
                {userEmail}
              </Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => { setMenuAnchor(null); onSignOut(); }}
              sx={{ gap: 1.5, py: 1.25, color: 'error.main' }}
            >
              <LogoutIcon fontSize="small" />
              <Typography variant="body2">Déconnexion</Typography>
            </MenuItem>
          </Menu>
        </Stack>
        </Box>
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          Gérez vos enveloppes d'investissement et répartissez vos revenus intelligemment.
        </Typography>
      </Box>

      {/* Onboarding — shown only when the account is brand new */}
      {baseEnvelopes.length === 0 && incomeHistory.length === 0 && (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 4, sm: 6 }, mb: 6, textAlign: 'center' }}
        >
          <Stack alignItems="center" spacing={3}>
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                bgcolor: 'rgba(77, 107, 255, 0.12)',
                border: '1px solid rgba(77, 107, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AccountBalanceIcon sx={{ fontSize: 30, color: 'primary.light' }} />
            </Box>

            <Box>
              <Typography variant="h5" fontWeight={700} mb={1}>
                Bienvenue dans Alou
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={480} mx="auto">
                Commencez par configurer vos enveloppes d'investissement, puis déclarez vos revenus pour suivre votre progression vers vos objectifs.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              sx={{ width: '100%', maxWidth: 480 }}
            >
              {[
                { step: '1', label: 'Créez vos enveloppes' },
                { step: '2', label: 'Déclarez vos revenus' },
                { step: '3', label: 'Suivez votre progression' },
              ].map(({ step, label }) => (
                <Box
                  key={step}
                  flex={1}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <Typography variant="caption" color="primary.light" fontWeight={700} display="block" mb={0.5}>
                    Étape {step}
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingEnvelope(null);
                setEnvelopeDialogOpen(true);
              }}
            >
              Créer ma première enveloppe
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Portfolio summary */}
      <Box mb={4}>
        <PortfolioSummary envelopes={envelopes} />
      </Box>

      {/* Section enveloppes */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={5} mb={2}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          <AccountBalanceIcon fontSize="small" sx={{ color: 'text.secondary' }} />
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


      {/* Grille de cards / empty state */}
      {baseEnvelopes.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 6 }}>
          <Stack alignItems="center" spacing={1.5} textAlign="center">
            <AddIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
            <Typography variant="h6" fontWeight={600}>
              Aucune enveloppe configurée
            </Typography>
            <Typography variant="body2" color="text.secondary" maxWidth={380}>
              Créez votre première enveloppe pour commencer à organiser votre portefeuille.
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingEnvelope(null);
                setEnvelopeDialogOpen(true);
              }}
              sx={{ mt: 1 }}
            >
              Créer une enveloppe
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Box
          display="grid"
          sx={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
          gap={3}
        >
          {(() => {
            const portfolioTotal = envelopes.reduce((sum, e) => sum + (Number(e.currentAmount) || 0), 0);
            return envelopes.map((envelope) => (
              <EnvelopeCard
                key={envelope.id}
                envelope={envelope}
                portfolioShare={portfolioTotal > 0 ? ((Number(envelope.currentAmount) || 0) / portfolioTotal) * 100 : undefined}
                onEdit={() => {
                  setEditingEnvelope(envelope);
                  setEnvelopeDialogOpen(true);
                }}
                onDelete={() => handleDeleteEnvelope(envelope.id)}
              />
            ));
          })()}
        </Box>
      )}

      {/* Graphique de répartition */}
      <Box mt={5}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
          <DonutLargeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Répartition du portefeuille
        </Typography>
        <PortfolioChart envelopes={envelopes} />
      </Box>

      {/* Historique des revenus */}
      <Box mt={5}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
          <HistoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Historique des revenus
        </Typography>
      {incomeHistory.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 6 }}>
            <Stack alignItems="center" spacing={1.5} textAlign="center">
              <HistoryIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
              <Typography variant="h6" fontWeight={600}>
                Aucun revenu enregistré
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={380}>
                Commencez par déclarer votre premier revenu pour voir comment il se répartit dans vos enveloppes.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingIncome(null);
                  setIncomeDialogOpen(true);
                }}
                sx={{ mt: 1 }}
              >
                Déclarer un revenu
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ px: 0, py: 0, overflow: 'hidden' }}>
            <Stack divider={<Divider />} spacing={0}>
              {incomeHistory.map((entry) => (
                <Box
                  key={entry.id}
                  display="flex"
                  flexDirection={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  gap={1.5}
                  px={2.5}
                  py={2}
                >
                  <Box minWidth={120}>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {formatCurrency(entry.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                      {formatDate(entry.date)}
                    </Typography>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap alignItems="center" flex={1}>
                    {entry.allocations.map(({ envelope, allocatedAmount }) => (
                      <Typography
                        key={envelope.id}
                        variant="caption"
                        component="span"
                        fontWeight={500}
                        sx={{
                          px: 1.25,
                          py: 0.4,
                          borderRadius: '20px',
                          bgcolor: 'rgba(255, 255, 255, 0.04)',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          color: 'text.secondary',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {envelope.name} · {formatCurrency(allocatedAmount)}
                      </Typography>
                    ))}
                  </Stack>
                  <Box display="flex" gap={0.25} flexShrink={0}>
                    <Tooltip title="Modifier">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingIncome(entry);
                          setIncomeDialogOpen(true);
                        }}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.light', bgcolor: 'rgba(77, 107, 255, 0.1)' } }}
                      >
                        <EditIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteIncome(entry.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.08)' } }}
                      >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}
      </Box>

      {/* FAB — Déclarer un revenu */}
      <Tooltip title="Déclarer un revenu" placement="left">
        <Fab
          color="primary"
          aria-label="Déclarer un revenu"
          onClick={() => {
            setEditingIncome(null);
            setIncomeDialogOpen(true);
          }}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1000,
            '&:hover': {
              boxShadow: '0px 6px 28px rgba(77, 107, 255, 0.5)',
              bgcolor: 'primary.light',
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>

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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity="success" variant="filled" sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
