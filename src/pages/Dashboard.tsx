import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import EnvelopeCard from '../components/EnvelopeCard';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import IncomeDialog from '../components/IncomeDialog';
import EnvelopeDialog, { type AssetAction } from '../components/EnvelopeDialog';
import PortfolioChart from '../components/PortfolioChart';
import PortfolioSummary from '../components/PortfolioSummary';
import { mockEnvelopes } from '../data/mockEnvelopes';
import { recalculateEnvelopes, type AllocationResult } from '../utils/calculateAllocation';
import { type Envelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';
import { type Asset } from '../types/asset';
import * as db from '../lib/db';
import { formatCurrency, formatDate } from '../utils/format';

interface DashboardProps {
  userId: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
}

// ── Sortable card wrapper ──────────────────────────────────────────────────────
// Defined outside Dashboard so it isn't recreated on every render.
interface SortableCardProps {
  envelope: import('../types/envelope').ComputedEnvelope;
  portfolioShare?: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableCard({ envelope, portfolioShare, onEdit, onDelete }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: envelope.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        // The card itself becomes invisible while the DragOverlay clone is shown.
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <EnvelopeCard
        envelope={envelope}
        portfolioShare={portfolioShare}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>}
      />
    </div>
  );
}

export default function Dashboard({ userId, userEmail, onSignOut }: DashboardProps) {
  // ── Recommendation dismissed state ────────────────────────────────────────
  const [recommendationDismissed, setRecommendationDismissed] = useState(
    () => localStorage.getItem('recommendationDismissed') === 'true',
  );
  const dismissRecommendation = useCallback(() => {
    localStorage.setItem('recommendationDismissed', 'true');
    setRecommendationDismissed(true);
  }, []);

  // ── Scroll state for sticky header ────────────────────────────────────────
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  // ── Drag-and-drop ─────────────────────────────────────────────────────────
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setDraggingId(active.id as string);
  }, []);

  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    setDraggingId(null);
    if (!over || active.id === over.id) return;

    // Read the current list from the ref so we don't need it as a dependency.
    const current = baseEnvelopesRef.current;
    const oldIndex = current.findIndex((e) => e.id === active.id);
    const newIndex = current.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(current, oldIndex, newIndex).map((e, i) => ({ ...e, order: i }));

    // Update UI state immediately (optimistic).
    setBaseEnvelopes(reordered);

    // Persist outside the state updater — side effects must not live inside
    // pure updater functions, and Supabase returns errors in the result object
    // rather than throwing, so we check them explicitly here.
    db.updateEnvelopeOrders(
      userId,
      reordered.map(({ id, order }) => ({ id, order: order! })),
    ).catch((err) => console.error('Failed to persist envelope order:', err));
  }, [userId]);

  // ── Remote data state ─────────────────────────────────────────────────────
  const [baseEnvelopes, setBaseEnvelopes] = useState<Envelope[]>([]);
  // Keep the latest baseEnvelopes in a ref so the DnD handlers can always read
  // the current list without being listed as effect dependencies.
  const baseEnvelopesRef = useRef(baseEnvelopes);
  useEffect(() => { baseEnvelopesRef.current = baseEnvelopes; }, [baseEnvelopes]);

  const [incomeHistory, setIncomeHistory] = useState<IncomeEntry[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setDataLoading(true);
      try {
        // Envelopes and incomes load in parallel; assets are fetched afterwards
        // using the envelope IDs so the filter works regardless of whether the
        // assets table has a user_id column.
        const [envelopes, incomes] = await Promise.all([
          db.fetchEnvelopes(userId),
          db.fetchIncomes(userId),
        ]);
        if (cancelled) return;

        let resolvedEnvelopes = envelopes;
        if (envelopes.length === 0) {
          // Seed with fresh UUIDs only for brand-new accounts, then re-fetch.
          await Promise.all(mockEnvelopes.map((e) => db.upsertEnvelope(userId, e)));
          const seeded = await db.fetchEnvelopes(userId);
          if (!cancelled) {
            setBaseEnvelopes(seeded);
            resolvedEnvelopes = seeded;
          }
        } else {
          setBaseEnvelopes(envelopes);
        }

        const envelopeIds = resolvedEnvelopes.map((e) => e.id);
        const fetchedAssets = await db.fetchAssets(envelopeIds).catch((err) => {
          console.warn('fetchAssets failed — assets will not be shown:', err);
          return [] as Asset[];
        });
        if (!cancelled) setAssets(fetchedAssets);

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
  // Always sort by `order` before computing or rendering so the user-defined
  // sequence is preserved everywhere (grid, chart, allocation, history).
  const sortedBaseEnvelopes = useMemo(
    () => [...baseEnvelopes].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [baseEnvelopes],
  );

  const envelopes = useMemo(() => {
    const computed = recalculateEnvelopes(sortedBaseEnvelopes, incomeHistory);
    return computed.map((env) => {
      const envAssets = assets.filter((a) => a.envelopeId === env.id);
      const assetValue =
        envAssets.length > 0
          ? envAssets.reduce((sum, a) => sum + (a.unitPrice > 0 ? a.unitPrice * a.quantity : 0), 0)
          : null;
      const effectiveCurrentAmount =
        assetValue != null ? assetValue : env.currentAmount;
      return { ...env, currentAmount: effectiveCurrentAmount };
    });
  }, [sortedBaseEnvelopes, incomeHistory, assets]);

  // Single contextual recommendation evaluated in priority order.
  const recommendation = useMemo((): { title: string; body: string } | null => {
    if (envelopes.length === 0) return null;

    const portfolioTotal = envelopes.reduce((sum, e) => sum + e.currentAmount, 0);

    // 0. All targets met
    if (envelopes.every((e) => e.currentAmount >= e.targetAmount)) {
      return {
        title: 'Tous les objectifs sont atteints',
        body: 'Votre portefeuille a atteint tous ses objectifs.',
      };
    }

    // 1. At least one envelope has reached its target (but not all)
    const reached = envelopes.find((e) => e.targetAmount > 0 && e.currentAmount >= e.targetAmount);
    if (reached) {
      return {
        title: `Objectif atteint : ${reached.name}`,
        body: 'Les prochains revenus seront alloués aux autres enveloppes.',
      };
    }

    // 2. An envelope is almost complete (> 80% progress)
    const open = envelopes.filter((e) => e.targetAmount > 0 && e.currentAmount < e.targetAmount);
    const almostDone = open
      .map((e) => ({ name: e.name, progress: e.currentAmount / e.targetAmount, remaining: e.targetAmount - e.currentAmount }))
      .filter((e) => e.progress > 0.8)
      .sort((a, b) => b.progress - a.progress)[0];
    if (almostDone) {
      return {
        title: `${almostDone.name} est presque atteinte`,
        body: `Plus que ${formatCurrency(almostDone.remaining)} pour atteindre l'objectif.`,
      };
    }

    // 3. Priority envelope (only meaningful with 2+ open envelopes)
    if (open.length >= 2) {
      const priority = open
        .map((e) => ({ name: e.name, remaining: e.targetAmount - e.currentAmount }))
        .reduce((best, c) => (c.remaining > best.remaining ? c : best));
      return {
        title: `Priorité actuelle : ${priority.name}`,
        body: 'Cette enveloppe reçoit actuellement la plus grande part de vos prochains revenus.',
      };
    }

    // 4. Portfolio concentration > 70%
    if (portfolioTotal > 0) {
      const concentrated = envelopes
        .map((e) => ({ name: e.name, pct: (e.currentAmount / portfolioTotal) * 100 }))
        .find((e) => e.pct > 70);
      if (concentrated) {
        return {
          title: 'Portefeuille concentré',
          body: `Votre portefeuille est fortement concentré sur ${concentrated.name} (${concentrated.pct.toFixed(0)}%).`,
        };
      }
    }

    return null;
  }, [envelopes]);

  // ── Income handlers ───────────────────────────────────────────────────────
  const handleApplyAllocation = useCallback(
    (results: AllocationResult[], isManual: boolean) => {
      const amount = results.reduce((sum, r) => sum + r.allocatedAmount, 0);
      const entry: IncomeEntry = editingIncome
        ? { ...editingIncome, amount, allocations: results, isManualAllocation: isManual }
        : { id: crypto.randomUUID(), amount, date: new Date(), allocations: results, isManualAllocation: isManual };

      setIncomeHistory((prev) =>
        editingIncome
          ? prev.map((e) => (e.id === editingIncome.id ? entry : e))
          : [entry, ...prev],
      );
      setEditingIncome(null);
      setSnackbar({ open: true, message: editingIncome ? 'Revenu modifié' : 'Revenu réparti dans vos enveloppes' });
      db.upsertIncome(userId, entry).catch(async (err) => {
        console.error('Failed to save income:', err);
        const fresh = await db.fetchIncomes(userId).catch(() => null);
        if (!fresh) return;

        const entryInDb = fresh.find((e) => e.id === entry.id);
        if (!entryInDb) {
          // The entry was never written to the DB (e.g. network failure on a new entry).
          // The optimistic local state already has the correct data — leave it alone.
          return;
        }

        // The entry is in the DB but the re-fetched version may lack the
        // isManualAllocation flag (e.g. the fallback array format was used).
        // Restore the flag from the local entry we just applied.
        setIncomeHistory(
          fresh.map((e) =>
            e.id === entry.id ? { ...e, isManualAllocation: entry.isManualAllocation } : e,
          ),
        );
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
    (data: Omit<Envelope, 'id'>, id: string, assetActions: AssetAction[]) => {
      const isNew = !baseEnvelopes.some((e) => e.id === id);
      const order = isNew
        ? baseEnvelopes.length
        : (baseEnvelopes.find((e) => e.id === id)?.order ?? 0);
      const envelope: Envelope = { id, ...data, order };

      // ── Optimistic updates ──────────────────────────────────────────────────
      setBaseEnvelopes((prev) => {
        const exists = prev.some((e) => e.id === id);
        return exists ? prev.map((e) => (e.id === id ? envelope : e)) : [...prev, envelope];
      });

      setAssets((prev) => {
        let next = prev;
        for (const action of assetActions) {
          if (action.type === 'upsert') {
            const resolvedId = action.id ?? crypto.randomUUID();
            const asset: Asset = { id: resolvedId, envelopeId: id, ...action.data };
            const idx = next.findIndex((a) => a.id === resolvedId);
            next = idx >= 0 ? next.map((a, i) => (i === idx ? asset : a)) : [...next, asset];
          } else {
            next = next.filter((a) => a.id !== action.id);
          }
        }
        return next;
      });

      setSnackbar({ open: true, message: isNew ? 'Enveloppe créée' : 'Enveloppe modifiée' });

      // ── Sequential DB writes: envelope first, then assets ────────────────────
      (async () => {
        try {
          await db.upsertEnvelope(userId, { ...data, order }, id);
        } catch (err) {
          console.error('Failed to save envelope:', err);
          const fresh = await db.fetchEnvelopes(userId).catch(() => null);
          if (!fresh) return;
          if (!fresh.some((e) => e.id === id)) {
            console.warn('Envelope not found in DB after failed save — keeping optimistic state:', id);
            setSnackbar({ open: true, message: "Erreur : l'enveloppe n'a pas pu être sauvegardée." });
            return;
          }
          setBaseEnvelopes(fresh);
        }

        for (const action of assetActions) {
          try {
            if (action.type === 'upsert') {
              const resolvedId = action.id ?? crypto.randomUUID();
              await db.upsertAsset(userId, { envelopeId: id, ...action.data }, resolvedId);
            } else {
              await db.deleteAsset(action.id);
            }
          } catch (err) {
            console.error('Failed to save asset:', err);
            const knownIds = baseEnvelopesRef.current.map((e) => e.id);
            const fresh = await db.fetchAssets(knownIds).catch(() => null);
            if (fresh) setAssets(fresh);
            break;
          }
        }
      })();
    },
    [userId, baseEnvelopes],
  );

  const handleDeleteEnvelope = useCallback((id: string) => {
    setBaseEnvelopes((prev) => prev.filter((e) => e.id !== id));
    setAssets((prev) => prev.filter((a) => a.envelopeId !== id));
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
    <>
      {/* Sticky header */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          transition: 'background-color 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          bgcolor: isScrolled ? 'rgba(9, 13, 22, 0.82)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(14px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(14px)' : 'none',
          borderBottom: isScrolled ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid transparent',
          boxShadow: isScrolled ? '0 6px 24px rgba(0, 0, 0, 0.12)' : 'none',
        }}
      >
        <Box px={{ xs: 2, sm: 4, md: 6 }} py={2} maxWidth={1100} mx="auto">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                component="img"
                src="/logo-alou.png"
                alt="Alou"
                sx={{
                  width: 32,
                  height: 32,
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
                    width: 30,
                    height: 30,
                    fontSize: '0.75rem',
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
          <Typography variant="body2" color="text.secondary">
            Gérez vos enveloppes d'investissement et répartissez vos revenus intelligemment.
          </Typography>
        </Box>
      </Box>

      {/* Page content */}
      <Box px={{ xs: 2, sm: 4, md: 6 }} pt={5} pb={10} maxWidth={1100} mx="auto">

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
      <PortfolioSummary envelopes={envelopes} />

      {/* Section enveloppes — primary section */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mt={6} mb={2}>
        <Typography variant="h6" fontWeight={700} display="flex" alignItems="center" gap={1}>
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

      {recommendation && !recommendationDismissed && (
        <Box
          mb={2.5}
          sx={{
            pl: 2,
            pr: 1,
            py: 1.25,
            borderLeft: '2px solid rgba(138, 158, 255, 0.28)',
            bgcolor: 'rgba(77, 107, 255, 0.04)',
            borderRadius: '0 10px 10px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.disabled"
              display="block"
              mb={0.5}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.09em', fontSize: '0.6rem' }}
            >
              Recommandation
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary" lineHeight={1.4}>
              {recommendation.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
              {recommendation.body}
            </Typography>
          </Box>
          <Tooltip title="Fermer">
            <IconButton
              size="small"
              onClick={dismissRecommendation}
              sx={{
                color: 'text.disabled',
                flexShrink: 0,
                mt: -0.25,
                '&:hover': { color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Grille de cards / empty state */}
      {baseEnvelopes.length === 0 ? (
        <Paper variant="outlined" sx={{ py: { xs: 6, sm: 8 }, px: { xs: 3, sm: 6 } }}>
          <Stack alignItems="center" spacing={2.5} textAlign="center">
            <Box sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: 'rgba(77, 107, 255, 0.1)',
              border: '1px solid rgba(77, 107, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AccountBalanceIcon sx={{ fontSize: 22, color: 'primary.light' }} />
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={600} mb={0.75}>
                Aucune enveloppe configurée
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={340}>
                Créez votre première enveloppe pour commencer à organiser votre portefeuille.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingEnvelope(null);
                setEnvelopeDialogOpen(true);
              }}
            >
              Créer une enveloppe
            </Button>
          </Stack>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={envelopes.map((e) => e.id)} strategy={rectSortingStrategy}>
            <Box
              display="grid"
              sx={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
              gap={3}
            >
              {(() => {
                const portfolioTotal = envelopes.reduce((sum, e) => sum + (Number(e.currentAmount) || 0), 0);
                return envelopes.map((envelope) => (
                  <SortableCard
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
          </SortableContext>

          {/* Floating card rendered at the pointer while dragging */}
          <DragOverlay adjustScale={false} dropAnimation={{ duration: 180, easing: 'ease' }}>
            {draggingId ? (() => {
              const draggingEnvelope = envelopes.find((e) => e.id === draggingId);
              if (!draggingEnvelope) return null;
              const portfolioTotal = envelopes.reduce((sum, e) => sum + (Number(e.currentAmount) || 0), 0);
              return (
                <Box sx={{ transform: 'rotate(1.5deg)', boxShadow: '0 24px 60px rgba(0,0,0,0.55)', borderRadius: 3 }}>
                  <EnvelopeCard
                    envelope={draggingEnvelope}
                    portfolioShare={portfolioTotal > 0 ? ((Number(draggingEnvelope.currentAmount) || 0) / portfolioTotal) * 100 : undefined}
                  />
                </Box>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Secondary sections — separated from primary content */}
      <Divider sx={{ mt: 7, mb: 6, borderColor: 'rgba(255,255,255,0.05)' }} />

      {/* Graphique de répartition */}
      <Box>
        <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
          <DonutLargeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Répartition du portefeuille
        </Typography>
        <PortfolioChart envelopes={envelopes} />
      </Box>

      {/* Historique des revenus */}
      <Box mt={6}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
          <HistoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Historique des revenus
        </Typography>
      {incomeHistory.length === 0 ? (
          <Paper variant="outlined" sx={{ py: { xs: 6, sm: 8 }, px: { xs: 3, sm: 6 } }}>
            <Stack alignItems="center" spacing={2.5} textAlign="center">
              <Box sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                bgcolor: 'rgba(77, 107, 255, 0.1)',
                border: '1px solid rgba(77, 107, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <HistoryIcon sx={{ fontSize: 22, color: 'primary.light' }} />
              </Box>
              <Box>
                <Typography variant="body1" fontWeight={600} mb={0.75}>
                  Aucun revenu enregistré
                </Typography>
                <Typography variant="body2" color="text.secondary" maxWidth={340}>
                  Déclarez votre premier revenu pour voir comment il se répartit dans vos enveloppes.
                </Typography>
              </Box>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingIncome(null);
                  setIncomeDialogOpen(true);
                }}
              >
                Déclarer un revenu
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Paper variant="outlined" sx={{ px: 0, py: 0, overflow: 'hidden' }}>
            <Stack divider={<Divider />} spacing={0}>
              {incomeHistory.map((entry) => (
                <Box key={entry.id} px={2.5} py={2.25}>

                  {/* Entry header: amount + date + actions */}
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography variant="body2" fontWeight={700} color="text.primary">
                        {formatCurrency(entry.amount)}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" display="block" mt={0.25}>
                        {formatDate(entry.date)}
                      </Typography>
                      {entry.isManualAllocation && (
                        <Box
                          display="inline-flex"
                          alignItems="center"
                          gap={0.5}
                          mt={0.75}
                          sx={{
                            px: 0.875,
                            py: 0.25,
                            borderRadius: '5px',
                            bgcolor: 'rgba(77, 107, 255, 0.1)',
                            border: '1px solid rgba(77, 107, 255, 0.22)',
                          }}
                        >
                          <TuneRoundedIcon sx={{ fontSize: 10, color: 'primary.light' }} />
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.67rem', color: 'primary.light', lineHeight: 1, fontWeight: 500 }}
                          >
                            Répartition personnalisée
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <Box display="flex" gap={0.25} flexShrink={0} mt={-0.25}>
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

                  {/* Allocation breakdown */}
                  {entry.allocations.length > 0 && (
                    <Box
                      mt={1.5}
                      sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                    >
                      {[...entry.allocations]
                        .sort((a, b) => b.allocatedAmount - a.allocatedAmount)
                        .map(({ envelope, allocatedAmount }) => (
                          <Box
                            key={envelope.id}
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                            pt={1}
                          >
                            <Typography variant="caption" color="text.secondary">
                              {envelope.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight={600}
                              color="text.primary"
                              sx={{ fontVariantNumeric: 'tabular-nums' }}
                            >
                              {formatCurrency(allocatedAmount)}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  )}

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
        assets={assets}
        onApply={handleApplyAllocation}
        initialAmount={editingIncome?.amount}
      />

      {/* Envelope dialog */}
      <EnvelopeDialog
        open={envelopeDialogOpen}
        onClose={handleEnvelopeDialogClose}
        onSave={handleSaveEnvelope}
        initialEnvelope={editingEnvelope ?? undefined}
        initialAssets={editingEnvelope ? assets.filter((a) => a.envelopeId === editingEnvelope.id) : []}
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
    </>
  );
}
