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
  isin: string;
  name: string;
  symbol: string;
  unitPrice: number;
  // Optional: present when loaded from an existing saved asset, absent when
  // freshly resolved from the API (FMP stable/search-isin does not return them).
  currency?: string;
  assetType?: string | null;
}

type ResolveStatus = 'idle' | 'loading' | 'success' | 'error';

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/;

async function resolveIsin(isin: string): Promise<ResolvedAsset> {
  const FALLBACK = 'Impossible de résoudre cet ISIN pour le moment.';

  let res: Response;
  try {
    res = await fetch(`/api/resolve-isin?isin=${encodeURIComponent(isin)}`);
  } catch {
    // Network failure (offline, CORS, DNS, …)
    throw new Error(FALLBACK);
  }

  // Parse defensively — the endpoint always returns JSON, but guard against
  // HTML error pages (Vite dev fallback, CDN errors, etc.).
  let body: unknown;
  try {
    const text = await res.text();
    body = JSON.parse(text);
  } catch {
    throw new Error(FALLBACK);
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !(body as Record<string, unknown>).success
  ) {
    const msg = (body as { error?: string } | null)?.error;
    throw new Error(typeof msg === 'string' ? msg : FALLBACK);
  }

  const { asset } = body as { success: true; asset?: ResolvedAsset };
  if (!asset?.symbol || !asset.name) {
    throw new Error(FALLBACK);
  }

  return asset;
}

// ── Asset action ──────────────────────────────────────────────────────────────

export type AssetAction =
  | { type: 'upsert'; data: Omit<Asset, 'id' | 'envelopeId'>; id?: string }
  | { type: 'delete'; id: string }
  | null;

// ── Props ─────────────────────────────────────────────────────────────────────

interface EnvelopeDialogProps {
  open: boolean;
  onClose: () => void;
  /** Envelope data + a resolved asset action so the parent can sequence DB writes. */
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
  // ── Envelope form ──────────────────────────────────────────────────────────
  const [form, setForm] = useState<EnvForm>(emptyEnvForm);
  const [errors, setErrors] = useState<EnvErrors>({});

  // Stable UUID for new envelopes; regenerated each time the dialog opens for create.
  const [pendingEnvelopeId, setPendingEnvelopeId] = useState(() => crypto.randomUUID());
  const envelopeId = initialEnvelope?.id ?? pendingEnvelopeId;

  // ── Asset state ────────────────────────────────────────────────────────────
  const [showAsset, setShowAsset] = useState(false);
  const [assetIsin, setAssetIsin] = useState('');
  const [assetName, setAssetName] = useState('');
  const [assetSymbol, setAssetSymbol] = useState('');
  const [assetUnitPrice, setAssetUnitPrice] = useState('');
  const [assetQuantity, setAssetQuantity] = useState('');
  const [assetIsFractional, setAssetIsFractional] = useState(false);
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
      setAssetName(initialAsset.name);
      setAssetSymbol(initialAsset.symbol ?? '');
      setAssetUnitPrice(String(initialAsset.unitPrice));
      setAssetQuantity(String(initialAsset.quantity));
      setAssetIsFractional(initialAsset.isFractional);
      setResolveStatus('success');
      setShowAsset(true);
    } else {
      setAssetIsin('');
      setAssetName('');
      setAssetSymbol('');
      setAssetUnitPrice('');
      setAssetQuantity('');
      setAssetIsFractional(false);
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
        setAssetName('');
        setAssetSymbol('');
        setAssetUnitPrice('');
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
        setAssetName(data.name);
        setAssetSymbol(data.symbol ?? '');
        setAssetUnitPrice(data.unitPrice > 0 ? String(data.unitPrice) : '');
        setResolveStatus('success');
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted) return;
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

    const isin = assetIsin.toUpperCase().trim();
    let assetAction: AssetAction = null;

    if (showAsset && isin) {
      assetAction = {
        type: 'upsert',
        data: {
          name: assetName.trim() || isin,
          isin,
          symbol: assetSymbol.trim() || undefined,
          unitPrice: parseFloat(assetUnitPrice) || 0,
          currency: 'EUR',
          quantity: parseFloat(assetQuantity) || 0,
          isFractional: assetIsFractional,
        },
        id: initialAsset?.id,
      };
    } else if (!showAsset && initialAsset) {
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
                    onClick={() => { setShowAsset(false); setAssetName(''); setAssetSymbol(''); setAssetUnitPrice(''); setResolveStatus('idle'); setResolveError(null); }}
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

                {/* Asset detail fields — autofilled on resolution, always editable */}
                <TextField
                  label="Nom de l'actif"
                  fullWidth
                  size="small"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="ex: iShares Core S&P 500"
                  helperText={
                    resolveStatus === 'error' && resolveError ? (
                      <>
                        ISIN non reconnu automatiquement.
                        <br />
                        Vous pouvez renseigner l'actif manuellement ou continuer sans résolution.
                      </>
                    ) : ' '
                  }
                  FormHelperTextProps={{
                    sx: resolveStatus === 'error' ? { color: 'warning.main' } : undefined,
                  }}
                />
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    label="Symbole"
                    size="small"
                    value={assetSymbol}
                    onChange={(e) => setAssetSymbol(e.target.value.toUpperCase())}
                    placeholder="ex: CSPX.L"
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                    sx={{ flex: 1 }}
                    helperText=" "
                  />
                  <TextField
                    label="Prix unitaire (€)"
                    type="number"
                    size="small"
                    value={assetUnitPrice}
                    onChange={(e) => setAssetUnitPrice(e.target.value)}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ flex: 1 }}
                    helperText=" "
                  />
                </Stack>

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

                {/* Asset summary — shown once a unit price is available */}
                {parseFloat(assetUnitPrice) > 0 && (
                  <Box
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 1.5,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {/* Name + identifiers */}
                    {assetName && (
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color="text.primary"
                        lineHeight={1.3}
                        mb={0.4}
                        noWrap
                      >
                        {assetName}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ fontFamily: 'monospace', letterSpacing: '0.04em', fontSize: '0.68rem' }}
                    >
                      {[assetIsin || null, assetSymbol || null].filter(Boolean).join(' · ')}
                    </Typography>

                    {/* Price × qty = total */}
                    <Box
                      display="flex"
                      alignItems="flex-end"
                      gap={1.5}
                      mt={1.25}
                      sx={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.disabled" display="block" lineHeight={1.2} mb={0.2}>
                          Prix unitaire
                        </Typography>
                        <Typography variant="body2" fontWeight={600} color="text.secondary">
                          {formatPrice(parseFloat(assetUnitPrice), 'EUR')}
                        </Typography>
                      </Box>

                      {parseFloat(assetQuantity) > 0 && (
                        <>
                          <Typography variant="body2" color="text.disabled" pb={0.1}>×</Typography>
                          <Box>
                            <Typography variant="caption" color="text.disabled" display="block" lineHeight={1.2} mb={0.2}>
                              Quantité
                            </Typography>
                            <Typography variant="body2" fontWeight={600} color="text.secondary">
                              {parseFloat(assetQuantity).toLocaleString('fr-FR')}
                            </Typography>
                          </Box>

                          <Typography variant="body2" color="text.disabled" pb={0.1}>=</Typography>
                          <Box ml="auto" textAlign="right">
                            <Typography variant="caption" color="text.disabled" display="block" lineHeight={1.2} mb={0.2}>
                              Valeur totale
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{ color: 'primary.light', letterSpacing: '-0.01em' }}
                            >
                              {formatPrice(parseFloat(assetUnitPrice) * parseFloat(assetQuantity), 'EUR')}
                            </Typography>
                          </Box>
                        </>
                      )}
                    </Box>
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
