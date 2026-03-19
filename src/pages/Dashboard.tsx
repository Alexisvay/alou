import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Stack,
  Divider,
  CircularProgress,
  Snackbar,
  Alert,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import { Outlet } from 'react-router-dom';
import { type DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import IncomeDialog from '../components/IncomeDialog';
import EnvelopeDialog, { type AssetAction } from '../components/EnvelopeDialog';
import { mockEnvelopes } from '../data/mockEnvelopes';
import { recalculateEnvelopes, type AllocationResult } from '../utils/calculateAllocation';
import { type Envelope, type ComputedEnvelope } from '../types/envelope';
import { type IncomeEntry } from '../types/income';
import { type Asset } from '../types/asset';
import * as db from '../lib/db';
import { formatCurrency } from '../utils/format';

interface DashboardProps {
  userId: string;
  userEmail: string;
  onSignOut: () => Promise<void>;
}

export interface DashboardContext {
  envelopes: ComputedEnvelope[];
  baseEnvelopes: Envelope[];
  incomeHistory: IncomeEntry[];
  assets: Asset[];
  recommendation: { title: string; body: string } | null;
  recommendationDismissed: boolean;
  dismissRecommendation: () => void;
  handleDragEnd: (event: DragEndEvent) => void;
  onEditEnvelope: (envelope: Envelope) => void;
  onDeleteEnvelope: (id: string) => void;
  onAddEnvelope: () => void;
  onDeclareIncome: () => void;
  onEditIncome: (entry: IncomeEntry) => void;
  onDeleteIncome: (id: string) => void;
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

  // ── Drag-and-drop handler (state lives in EnveloppesPage) ─────────────────
  const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const current = baseEnvelopesRef.current;
    const oldIndex = current.findIndex((e) => e.id === active.id);
    const newIndex = current.findIndex((e) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(current, oldIndex, newIndex).map((e, i) => ({ ...e, order: i }));

    setBaseEnvelopes(reordered);

    db.updateEnvelopeOrders(
      userId,
      reordered.map(({ id, order }) => ({ id, order: order! })),
    ).catch((err) => console.error('Failed to persist envelope order:', err));
  }, [userId]);

  // ── Remote data state ─────────────────────────────────────────────────────
  const [baseEnvelopes, setBaseEnvelopes] = useState<Envelope[]>([]);
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
        const [envelopes, incomes] = await Promise.all([
          db.fetchEnvelopes(userId),
          db.fetchIncomes(userId),
        ]);
        if (cancelled) return;

        let resolvedEnvelopes = envelopes;
        if (envelopes.length === 0) {
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

  const recommendation = useMemo((): { title: string; body: string } | null => {
    if (envelopes.length === 0) return null;

    const portfolioTotal = envelopes.reduce((sum, e) => sum + e.currentAmount, 0);

    if (envelopes.every((e) => e.currentAmount >= e.targetAmount)) {
      return {
        title: 'Tous les objectifs sont atteints',
        body: 'Votre portefeuille a atteint tous ses objectifs.',
      };
    }

    const reached = envelopes.find((e) => e.targetAmount > 0 && e.currentAmount >= e.targetAmount);
    if (reached) {
      return {
        title: `Objectif atteint : ${reached.name}`,
        body: 'Les prochains revenus seront alloués aux autres enveloppes.',
      };
    }

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

    if (open.length >= 2) {
      const priority = open
        .map((e) => ({ name: e.name, remaining: e.targetAmount - e.currentAmount }))
        .reduce((best, c) => (c.remaining > best.remaining ? c : best));
      return {
        title: `Priorité actuelle : ${priority.name}`,
        body: 'Cette enveloppe reçoit actuellement la plus grande part de vos prochains revenus.',
      };
    }

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
    (results: AllocationResult[], isManual: boolean, totalAmount: number) => {
      const amount = results.length > 0 ? results.reduce((sum, r) => sum + r.allocatedAmount, 0) : totalAmount;
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
        if (!entryInDb) return;

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

  // ── Dialog open callbacks (passed to pages via context) ───────────────────
  const onAddEnvelope = useCallback(() => {
    setEditingEnvelope(null);
    setEnvelopeDialogOpen(true);
  }, []);

  const onEditEnvelope = useCallback((envelope: Envelope) => {
    setEditingEnvelope(envelope);
    setEnvelopeDialogOpen(true);
  }, []);

  const onDeclareIncome = useCallback(() => {
    setEditingIncome(null);
    setIncomeDialogOpen(true);
  }, []);

  const onEditIncome = useCallback((entry: IncomeEntry) => {
    setEditingIncome(entry);
    setIncomeDialogOpen(true);
  }, []);

  // ── Outlet context ────────────────────────────────────────────────────────
  const outletContext: DashboardContext = {
    envelopes,
    baseEnvelopes,
    incomeHistory,
    assets,
    recommendation,
    recommendationDismissed,
    dismissRecommendation,
    handleDragEnd,
    onEditEnvelope,
    onDeleteEnvelope: handleDeleteEnvelope,
    onAddEnvelope,
    onDeclareIncome,
    onEditIncome,
    onDeleteIncome: handleDeleteIncome,
  };

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
          transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
          ...(isScrolled
            ? {
                background: [
                  'radial-gradient(circle at 20% 20%, rgba(198, 161, 91, 0.05), transparent 26%)',
                  'radial-gradient(circle at 80% 25%, rgba(230, 201, 122, 0.04), transparent 22%)',
                  'linear-gradient(180deg, rgba(12, 12, 14, 0.96) 0%, rgba(16, 16, 18, 0.96) 100%)',
                ].join(', '),
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                borderBottom: '1px solid rgba(198, 161, 91, 0.08)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
              }
            : {
                bgcolor: 'transparent',
                borderBottom: '1px solid transparent',
              }),
        }}
      >
        <Box px={{ xs: 2, sm: 4, md: 6 }} py={2} maxWidth={1100} mx="auto">
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {/* Action buttons */}
            <Stack direction="row" gap={1.5} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={onDeclareIncome}
              >
                Déclarer un revenu
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={onAddEnvelope}
              >
                Nouvelle enveloppe
              </Button>
            </Stack>
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
                    bgcolor: 'rgba(255, 255, 255, 0.1)',
                    color: 'text.primary',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
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
        </Box>
      </Box>

      {/* Page content — rendered by child routes */}
      <Box px={{ xs: 2, sm: 4, md: 6 }} pt={5} pb={10} maxWidth={1100} mx="auto">
        <Outlet context={outletContext} />
      </Box>

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
    </>
  );
}
