import { useState, useEffect, useRef } from 'react';
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
  CircularProgress,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { type Envelope } from '../types/envelope';
import { type Asset } from '../types/asset';

// ── ISIN resolution ────────────────────────────────────────────────────────────

interface ResolvedAsset {
  name: string;
  symbol: string;
  unitPrice: number;
  currency: string;
  assetType: string | null;
}

type ResolveStatus = 'idle' | 'loading' | 'success' | 'error';

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/;

async function resolveIsin(isin: string): Promise<ResolvedAsset> {
  const res = await fetch(`/api/resolve-isin?isin=${encodeURIComponent(isin)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Résolution échouée');
  return data as ResolvedAsset;
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface EnvelopeDialogProps {
  open: boolean;
  onClose: () => void;
  /** id is always provided so the dialog can correlate asset saves with the envelope. */
  onSave: (data: Omit<Envelope, 'id'>, id: string) => void;
  onSaveAsset?: (envelopeId: string, data: Omit<Asset, 'id' | 'envelopeId'>, assetId?: string) => void;
  onDeleteAsset?: (assetId: string) => void;
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
  onSaveAsset,
  onDeleteAsset,
  initialEnvelope,
  initialAsset,
}: EnvelopeDialogProps) {
  // ── Envelope form ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<EnvForm>(emptyEnvForm);
  const [errors, setErrors] = useState<EnvErrors>({});

  // Stable UUID for new envelopes; regenerated each time the dialog opens for create.
  const [pendingEnvelopeId, setPendingEnvelopeId] = useState(() => crypto.randomUUID());
  const envelopeId = initialEnvelope?.id ?? pendingEnvelopeId;

  // ── Asset state ────────────────────────────────────────────────────────────
  const [showAsset, setShowAsset] = useState(false);
  const [assetIsin, setAssetIsin] = useState('');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetIsFractional, setAssetIsFractional] = useState(false);
  const [resolved, setResolved] = useState<ResolvedAsset | null>(null);
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>('idle');
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Abort controller so a stale in-flight request doesn't overwrite newer state.
  const abortRef = useRef<AbortController | null>(null);

  const isEditing = initialEnvelope != null;

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

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
      setAssetIsin(initialAsset.isin);
      setAssetQuantity(String(initialAsset.quantity));
      setAssetIsFractional(initialAsset.isFractional);
      setResolved({
        name: initialAsset.name,
        symbol: initialAsset.symbol ?? '',
        unitPrice: initialAsset.unitPrice,
        currency: initialAsset.currency,
        assetType: initialAsset.assetType ?? null,
      });
      setResolveStatus('success');
      setShowAsset(true);
    } else {
      setAssetIsin('');
      setAssetQuantity('');
      setAssetIsFractional(false);
      setResolved(null);
      setResolveStatus('idle');
      setResolveError(null);
      setShowAsset(false);
    }
  }, [open, initialEnvelope, initialAsset]);

  // ── Auto-resolve when ISIN becomes valid ───────────────────────────────────
  useEffect(() => {
    if (!showAsset) return;

    const cleaned = assetIsin.toUpperCase().trim();
    if (!ISIN_RE.test(cleaned)) {
      // Incomplete ISIN — clear any previous result but don't show an error yet.
      if (resolveStatus !== 'idle') {
        setResolved(null);
        setResolveStatus('idle');
        setResolveError(null);
      }
      return;
    }

    // Cancel any in-flight request.
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setResolveStatus('loading');
    setResolveError(null);

    resolveIsin(cleaned)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setResolved(data);
        setResolveStatus('success');
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted) return;
        setResolved(null);
        setResolveStatus('error');
        setResolveError(err.message);
      });

    return () => ctrl.abort();
  // Only re-run when the ISIN string changes (or the section opens).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetIsin, showAsset]);

  // ── Envelope form handlers ─────────────────────────────────────────────────
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

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!validate()) return;

    onSave(
      {
        name: form.name.trim(),
        baseAmount: parseFloat(form.baseAmount),
        targetAmount: parseFloat(form.targetAmount),
        allocationPercentage: initialEnvelope?.allocationPercentage ?? 0,
      },
      envelopeId,
    );

    const isin = assetIsin.toUpperCase().trim();
    if (showAsset && isin && onSaveAsset) {
      onSaveAsset(
        envelopeId,
        {
          name: resolved?.name || isin,
          isin,
          symbol: resolved?.symbol || undefined,
          unitPrice: resolved?.unitPrice ?? 0,
          currency: resolved?.currency ?? 'EUR',
          quantity: parseFloat(assetQuantity) || 0,
          isFractional: assetIsFractional,
          assetType: resolved?.assetType ?? undefined,
        },
        initialAsset?.id,
      );
    } else if (!showAsset && initialAsset && onDeleteAsset) {
      onDeleteAsset(initialAsset.id);
    }

    onClose();
  };

  const handleClose = () => {
    abortRef.current?.abort();
    setForm(emptyEnvForm);
    setErrors({});
    setShowAsset(false);
    onClose();
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatPrice = (price: number, currency: string) => {
    try {
      return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price);
    } catch {
      // Unknown currency code (e.g. "GBX") — fall back to plain number.
      return `${price.toFixed(2)} ${currency}`;
    }
  };

  const totalValue =
    resolved && parseFloat(assetQuantity) > 0
      ? resolved.unitPrice * parseFloat(assetQuantity)
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
                    onClick={() => { setShowAsset(false); setResolved(null); setResolveStatus('idle'); }}
                    sx={{ fontSize: '0.72rem', color: 'text.disabled', px: 0, minWidth: 0, '&:hover': { color: 'error.main', background: 'transparent' } }}
                    disableRipple
                  >
                    Supprimer
                  </Button>
                </Box>

                {/* ISIN input */}
                <TextField
                  label="ISIN"
                  fullWidth
                  value={assetIsin}
                  onChange={(e) => setAssetIsin(e.target.value.toUpperCase())}
                  placeholder="ex: IE00B5BMR087"
                  size="small"
                  inputProps={{
                    maxLength: 12,
                    style: { letterSpacing: '0.1em', fontFamily: 'monospace', textTransform: 'uppercase' },
                  }}
                  helperText="12 caractères — résolution automatique"
                  InputProps={{
                    endAdornment: (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                        {resolveStatus === 'loading' && (
                          <CircularProgress size={14} sx={{ color: 'text.disabled' }} />
                        )}
                        {resolveStatus === 'success' && (
                          <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        )}
                        {resolveStatus === 'error' && (
                          <ErrorOutlineIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                        )}
                      </Box>
                    ),
                  }}
                />

                {/* Resolved asset info */}
                {resolveStatus === 'success' && resolved && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(0, 191, 165, 0.06)',
                      border: '1px solid rgba(0, 191, 165, 0.18)',
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} color="text.primary" lineHeight={1.35}>
                      {resolved.name}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" display="block" mt={0.25}>
                      {[resolved.symbol, resolved.assetType].filter(Boolean).join(' · ')}
                      {' · '}
                      {formatPrice(resolved.unitPrice, resolved.currency)}
                    </Typography>
                  </Box>
                )}

                {/* Resolve error */}
                {resolveStatus === 'error' && resolveError && (
                  <Typography variant="caption" color="warning.main" sx={{ mt: -0.5, display: 'block' }}>
                    {resolveError} — vous pouvez enregistrer sans résolution.
                  </Typography>
                )}

                {/* Quantity + fractional */}
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

                {/* Total value preview */}
                {totalValue !== null && resolved && (
                  <Typography variant="caption" color="text.disabled" sx={{ mt: -0.5 }}>
                    Valeur totale :{' '}
                    <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {formatPrice(totalValue, resolved.currency)}
                    </Box>
                  </Typography>
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
