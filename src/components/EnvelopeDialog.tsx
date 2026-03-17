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
  FormControlLabel,
  Switch,
  Typography,
  Box,
} from '@mui/material';
import { type Envelope } from '../types/envelope';
import { type Asset } from '../types/asset';

// ── Asset action ──────────────────────────────────────────────────────────────

export type AssetAction =
  | { type: 'upsert'; data: Omit<Asset, 'id' | 'envelopeId'>; id?: string }
  | { type: 'delete'; id: string }
  | null;

// ── Props ─────────────────────────────────────────────────────────────────────

interface EnvelopeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<Envelope, 'id'>, id: string, assetAction: AssetAction) => void;
  initialEnvelope?: Envelope;
  initialAsset?: Asset | null;
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function EnvelopeDialog({
  open,
  onClose,
  onSave,
  initialEnvelope,
  initialAsset,
}: EnvelopeDialogProps) {
  const [form, setForm] = useState<EnvForm>(emptyEnvForm);
  const [errors, setErrors] = useState<EnvErrors>({});

  const [pendingEnvelopeId, setPendingEnvelopeId] = useState(() => crypto.randomUUID());
  const envelopeId = initialEnvelope?.id ?? pendingEnvelopeId;

  // ── Asset state (manual entry only) ─────────────────────────────────────────
  const [showAsset, setShowAsset] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetUnitPrice, setAssetUnitPrice] = useState('');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetIsFractional, setAssetIsFractional] = useState(false);

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

    if (initialAsset) {
      setAssetName(initialAsset.name);
      setAssetUnitPrice(String(initialAsset.unitPrice));
      setAssetQuantity(String(initialAsset.quantity));
      setAssetIsFractional(initialAsset.isFractional);
      setShowAsset(true);
    } else {
      setAssetName('');
      setAssetUnitPrice('');
      setAssetQuantity('');
      setAssetIsFractional(false);
      setShowAsset(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [open, initialEnvelope, initialAsset]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const set = (field: keyof EnvForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: EnvErrors = {};
    if (!form.name.trim()) next.name = 'Nom requis.';
    const base = parseFloat(form.baseAmount);
    if (form.baseAmount === '' || isNaN(base) || base < 0)
      next.baseAmount = 'Montant de base invalide (≥ 0).';
    const target = parseFloat(form.targetAmount);
    if (form.targetAmount === '' || isNaN(target) || target <= 0)
      next.targetAmount = 'Objectif invalide (> 0).';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    let assetAction: AssetAction = null;

    if (showAsset) {
      assetAction = {
        type: 'upsert',
        data: {
          name: assetName.trim() || 'Actif',
          unitPrice: parseFloat(assetUnitPrice) || 0,
          quantity: parseFloat(assetQuantity) || 0,
          isFractional: assetIsFractional,
        },
        id: initialAsset?.id,
      };
    } else if (initialAsset) {
      assetAction = { type: 'delete', id: initialAsset.id };
    }

    onSave(
      {
        name: form.name.trim(),
        baseAmount: parseFloat(form.baseAmount),
        targetAmount: parseFloat(form.targetAmount),
        allocationPercentage: initialEnvelope?.allocationPercentage ?? 0,
      },
      envelopeId,
      assetAction,
    );

    onClose();
  };

  const handleClose = () => {
    setForm(emptyEnvForm);
    setErrors({});
    setShowAsset(false);
    onClose();
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);

  const totalValue =
    parseFloat(assetUnitPrice) > 0 && parseFloat(assetQuantity) > 0
      ? parseFloat(assetUnitPrice) * parseFloat(assetQuantity)
      : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isEditing ? "Modifier l'enveloppe" : 'Nouvelle enveloppe'}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>

          {/* ── Envelope fields ──────────────────────────────────────────── */}
          <TextField
            label="Nom"
            fullWidth
            value={form.name}
            onChange={set('name')}
            error={!!errors.name}
            helperText={errors.name || ' '}
          />
          <TextField
            label="Montant de base (€)"
            type="number"
            fullWidth
            value={form.baseAmount}
            onChange={set('baseAmount')}
            error={!!errors.baseAmount}
            helperText={errors.baseAmount || 'Solde actuel avant revenus'}
            inputProps={{ min: 0, step: 1 }}
          />
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

          {/* ── Asset section ─────────────────────────────────────────────── */}
          <Box>
            <Divider sx={{ mb: 1.5 }} />
            {!showAsset ? (
              <Button
                size="small"
                color="inherit"
                onClick={() => setShowAsset(true)}
                sx={{ fontSize: '0.78rem', color: 'text.secondary', px: 0, '&:hover': { color: 'text.primary', background: 'transparent' } }}
                disableRipple
              >
                + Lier un actif financier
              </Button>
            ) : (
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}
                  >
                    Actif lié
                  </Typography>
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => { setShowAsset(false); setAssetName(''); setAssetUnitPrice(''); setAssetQuantity(''); }}
                    sx={{ fontSize: '0.72rem', color: 'text.disabled', px: 0, minWidth: 0, '&:hover': { color: 'error.main', background: 'transparent' } }}
                    disableRipple
                  >
                    Supprimer
                  </Button>
                </Box>

                <TextField
                  label="Nom de l'actif"
                  fullWidth
                  size="small"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="ex: iShares Core S&P 500"
                />

                <TextField
                  label="Prix unitaire (€)"
                  type="number"
                  fullWidth
                  size="small"
                  value={assetUnitPrice}
                  onChange={(e) => setAssetUnitPrice(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                />

                <Stack direction="row" spacing={1.5} alignItems="center">
                  <TextField
                    label="Quantité détenue"
                    type="number"
                    fullWidth
                    value={assetQuantity}
                    onChange={(e) => setAssetQuantity(e.target.value)}
                    inputProps={{ min: 0, step: 0.001 }}
                    size="small"
                  />
                  <FormControlLabel
                    sx={{ flexShrink: 0, mr: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={assetIsFractional}
                        onChange={(e) => setAssetIsFractional(e.target.checked)}
                      />
                    }
                    label={
                      <Typography variant="caption" color="text.secondary" noWrap>
                        Fract.
                      </Typography>
                    }
                  />
                </Stack>

                {totalValue !== null && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>
                      Valeur totale
                    </Typography>
                    <Typography variant="body2" fontWeight={700} sx={{ color: 'primary.light', fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(totalValue)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            )}
          </Box>
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
