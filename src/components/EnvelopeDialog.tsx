import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Divider,
  Typography,
  Box,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { type Envelope } from '../types/envelope';
import { type Asset } from '../types/asset';
import AssetManagementDrawer from './AssetManagementDrawer';

// ── Asset actions (multiple per envelope) ──────────────────────────────────────

export type AssetAction =
  | { type: 'upsert'; data: Omit<Asset, 'id' | 'envelopeId'>; id?: string }
  | { type: 'delete'; id: string };

type ValuationMode = 'manual' | 'asset';

export interface AssetRow {
  id?: string;
  name: string;
  unitPrice: string;
  quantity: string;
  isFractional: boolean;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EnvelopeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Envelope, 'id'>, id: string, assetActions: AssetAction[]) => void;
  initialEnvelope?: Envelope;
  initialAssets?: Asset[];
}

// ── Form state ────────────────────────────────────────────────────────────────

interface EnvForm {
  name: string;
  baseAmount: string;
  targetAmount: string;
}

const emptyEnvForm: EnvForm = { name: '', baseAmount: '', targetAmount: '' };

interface EnvErrors {
  name?: string;
  baseAmount?: string;
  targetAmount?: string;
}

function assetToRow(a: Asset): AssetRow {
  return {
    id: a.id,
    name: a.name,
    unitPrice: String(a.unitPrice),
    quantity: String(a.quantity),
    isFractional: a.isFractional,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnvelopeDialog({
  open,
  onClose,
  onSave,
  initialEnvelope,
  initialAssets = [],
}: EnvelopeDialogProps) {
  const [form, setForm] = useState<EnvForm>(emptyEnvForm);
  const [errors, setErrors] = useState<EnvErrors>({});

  const [pendingEnvelopeId, setPendingEnvelopeId] = useState(() => crypto.randomUUID());
  const envelopeId = initialEnvelope?.id ?? pendingEnvelopeId;

  const [mode, setMode] = useState<ValuationMode>('manual');
  const [assetRows, setAssetRows] = useState<AssetRow[]>([]);
  const [assetDrawerOpen, setAssetDrawerOpen] = useState(false);

  const isEditing = initialEnvelope != null;

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- sync form state when dialog opens */
    if (!initialEnvelope) setPendingEnvelopeId(crypto.randomUUID());
    setForm(
      initialEnvelope
        ? {
            name: initialEnvelope.name,
            baseAmount: String(initialEnvelope.baseAmount),
            targetAmount: String(initialEnvelope.targetAmount),
          }
        : emptyEnvForm,
    );
    setErrors({});

    if (initialAssets.length > 0) {
      setMode('asset');
      setAssetRows(initialAssets.map(assetToRow));
    } else {
      setMode('manual');
      setAssetRows([]);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialEnvelope, initialAssets]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const set = (field: keyof EnvForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: EnvErrors = {};
    if (!form.name.trim()) next.name = 'Nom requis.';
    if (mode === 'manual') {
      const base = parseFloat(form.baseAmount);
      if (form.baseAmount === '' || isNaN(base) || base < 0)
        next.baseAmount = 'Valeur actuelle invalide (≥ 0).';
    }
    const target = parseFloat(form.targetAmount);
    if (form.targetAmount === '' || isNaN(target) || target <= 0)
      next.targetAmount = 'Objectif invalide (> 0).';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const assetActions: AssetAction[] = [];
    const initialIds = new Set(initialAssets.map((a) => a.id));
    const keptIds = new Set<string>();

    if (mode === 'asset') {
      for (const row of assetRows) {
        const unitPrice = parseFloat(row.unitPrice) || 0;
        const quantity = parseFloat(row.quantity) || 0;
        const resolvedId = row.id ?? crypto.randomUUID();
        if (row.id) keptIds.add(row.id);
        assetActions.push({
          type: 'upsert',
          id: resolvedId,
          data: {
            name: row.name.trim() || 'Actif',
            unitPrice,
            quantity,
            isFractional: row.isFractional,
          },
        });
      }
    }

    // Delete assets that were removed or when switching to manual mode
    for (const id of initialIds) {
      if (!keptIds.has(id)) assetActions.push({ type: 'delete', id });
    }

    const baseAmount = mode === 'asset' ? 0 : parseFloat(form.baseAmount) || 0;

    onSave(
      {
        name: form.name.trim(),
        baseAmount,
        targetAmount: parseFloat(form.targetAmount),
        allocationPercentage: initialEnvelope?.allocationPercentage ?? 0,
      },
      envelopeId,
      assetActions,
    );

    onClose();
  };

  const handleClose = () => {
    setForm(emptyEnvForm);
    setErrors({});
    setMode('manual');
    setAssetRows([]);
    onClose();
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

  const totalAssetValue =
    mode === 'asset'
      ? assetRows.reduce((sum, row) => {
          const up = parseFloat(row.unitPrice);
          const qty = parseFloat(row.quantity);
          return sum + (up > 0 && qty > 0 ? up * qty : 0);
        }, 0)
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isEditing ? "Modifier l'enveloppe" : 'Nouvelle enveloppe'}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>

          {/* ── Valuation mode selector ─────────────────────────────────────── */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
              Mode de valorisation
            </Typography>
            <ToggleButtonGroup
              value={mode}
              exclusive
              onChange={(_, v) => v != null && setMode(v)}
              fullWidth
              size="small"
              sx={{
                '& .MuiToggleButtonGroup-grouped': { borderColor: 'rgba(255,255,255,0.12)' },
                '& .MuiToggleButton-root': {
                  color: 'text.secondary',
                  textTransform: 'none',
                  fontSize: '0.8rem',
                  py: 0.75,
                },
                '& .MuiToggleButton-root.Mui-selected': {
                  background: 'linear-gradient(135deg, rgba(198, 161, 91, 0.2), rgba(230, 201, 122, 0.15))',
                  color: 'primary.main',
                  '&:hover': { background: 'linear-gradient(135deg, rgba(198, 161, 91, 0.28), rgba(230, 201, 122, 0.2))' },
                },
              }}
            >
              <ToggleButton value="manual">Saisie manuelle</ToggleButton>
              <ToggleButton value="asset">Actifs liés</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Divider />

          {/* ── Envelope name (always) ────────────────────────────────────────── */}
          <TextField
            label="Nom"
            fullWidth
            value={form.name}
            onChange={set('name')}
            error={!!errors.name}
            helperText={errors.name || ' '}
          />

          {/* ── Manual mode: current value + target ───────────────────────────── */}
          {mode === 'manual' && (
            <TextField
              label="Valeur actuelle (€)"
              type="number"
              fullWidth
              value={form.baseAmount}
              onChange={set('baseAmount')}
              error={!!errors.baseAmount}
              helperText={errors.baseAmount || 'Solde actuel avant revenus'}
              inputProps={{ min: 0, step: 1 }}
            />
          )}

          {/* ── Asset mode: compact summary + manage button ────────────────────── */}
          {mode === 'asset' && (
            <>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.5 }}>
                La valeur de l'enveloppe est calculée automatiquement à partir des actifs liés.
              </Typography>

              <Box
                sx={{
                  px: 1.5,
                  py: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                  <Box>
                    <Typography variant="caption" color="text.disabled" display="block">
                      {assetRows.length} actif{assetRows.length !== 1 ? 's' : ''} lié{assetRows.length !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(totalAssetValue)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setAssetDrawerOpen(true)}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Gérer les actifs
                  </Button>
                </Box>
              </Box>
            </>
          )}

          <AssetManagementDrawer
            open={assetDrawerOpen}
            onClose={() => setAssetDrawerOpen(false)}
            assetRows={assetRows}
            onApply={(rows) => {
              setAssetRows(rows);
              setAssetDrawerOpen(false);
            }}
          />

          {/* ── Target amount (always) ──────────────────────────────────────── */}
          <TextField
            label="Objectif (€)"
            type="number"
            fullWidth
            value={form.targetAmount}
            onChange={set('targetAmount')}
            error={!!errors.targetAmount}
            helperText={errors.targetAmount || ' '}
            inputProps={{ min: 1, step: 1 }}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Annuler
        </Button>
        <Button variant="contained" onClick={handleSave}>
          {isEditing ? 'Enregistrer' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
