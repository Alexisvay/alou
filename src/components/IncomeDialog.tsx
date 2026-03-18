import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import EuroIcon from '@mui/icons-material/Euro';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import AutorenewRoundedIcon from '@mui/icons-material/AutorenewRounded';
import { type ComputedEnvelope } from '../types/envelope';
import { type Asset } from '../types/asset';
import { calculateAllocation, type AllocationResult } from '../utils/calculateAllocation';
import { computeUnits } from '../utils/computeUnits';
import { formatCurrency } from '../utils/format';

// Animates a number from 0 to `target` over `duration` ms with ease-out cubic easing.
function useCountUp(target: number, duration = 380): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function AnimatedAmount({ amount }: { amount: number }) {
  const animated = useCountUp(amount);
  return <>{formatCurrency(animated)}</>;
}


interface IncomeDialogProps {
  open: boolean;
  onClose: () => void;
  envelopes: ComputedEnvelope[];
  assets?: Asset[];
  /** Called with (results, isManual, totalAmount). When all targets met, results=[], totalAmount=income. */
  onApply?: (results: AllocationResult[], isManual: boolean, totalAmount: number) => void;
  initialAmount?: number;
}

export default function IncomeDialog({ open, onClose, envelopes, assets = [], onApply, initialAmount }: IncomeDialogProps) {
  const [incomeInput, setIncomeInput] = useState<string>('');
  const [isManual, setIsManual] = useState(false);
  const [manualAmounts, setManualAmounts] = useState<Record<string, string>>({});

  const isEditing = initialAmount != null;

  useEffect(() => {
    if (open && initialAmount != null) {
      setIncomeInput(String(initialAmount));
    }
    if (!open) {
      setIncomeInput('');
      setIsManual(false);
      setManualAmounts({});
    }
  }, [open, initialAmount]);

  const income = parseFloat(incomeInput);
  const isValid = incomeInput !== '' && !isNaN(income) && income > 0;

  const results = useMemo<AllocationResult[] | null>(() => {
    if (!isValid) return null;
    return calculateAllocation(income, envelopes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomeInput, envelopes]);

  const sortedResults = useMemo(() => {
    if (!results) return null;
    return [...results].sort((a, b) => b.allocatedAmount - a.allocatedAmount);
  }, [results]);

  const allTargetsMet = isValid && results !== null && results.length === 0;

  // Envelopes excluded from allocation because they have already hit their target.
  const reachedEnvelopes = useMemo(() => {
    if (!isValid) return [];
    return envelopes.filter((e) => e.targetAmount > 0 && e.currentAmount >= e.targetAmount);
  }, [envelopes, isValid]);

  // Manual mode derived values
  const manualTotal = useMemo(() => {
    return Object.values(manualAmounts).reduce((sum, v) => {
      const n = parseFloat(v);
      return sum + (isNaN(n) || n < 0 ? 0 : n);
    }, 0);
  }, [manualAmounts]);

  // Valid when every field has a usable number and the sum matches (tolerance for float drift)
  const isManualValid = isValid && Math.abs(manualTotal - income) < 0.5 &&
    Object.values(manualAmounts).every((v) => v !== '' && !isNaN(parseFloat(v)));

  // On every keystroke: lock the edited row, rebalance all others immediately.
  // All arithmetic uses integers (cents) to avoid float drift causing React to
  // skip DOM updates on controlled number inputs.
  const handleManualChange = (envelopeId: string, rawValue: string) => {
    if (!sortedResults || !isValid) return;

    const parsed = parseFloat(rawValue);
    const totalInt = Math.round(income); // work in whole numbers throughout

    // How much the locked row contributes:
    // empty/invalid → 0 for redistribution, keep raw string for display
    const isEmpty = rawValue === '' || isNaN(parsed);
    const lockedInt = isEmpty ? 0 : Math.max(0, Math.min(Math.round(parsed), totalInt));
    const remainingInt = totalInt - lockedInt;

    const others = sortedResults.filter((r) => r.envelope.id !== envelopeId);

    // Build a completely fresh map — no stale values from previous state
    const next: Record<string, string> = {};

    // Edited field: show raw input so typing feels natural; clamped value otherwise
    next[envelopeId] = isEmpty ? rawValue : String(lockedInt);

    if (others.length === 0 || remainingInt <= 0) {
      // Nothing left for the other rows
      others.forEach((r) => { next[r.envelope.id] = '0'; });
    } else {
      // Proportional split using original auto-allocation weights.
      // Last envelope absorbs any rounding remainder so the total is exact.
      const weightsTotal = others.reduce((s, r) => s + r.allocatedAmount, 0);

      if (weightsTotal <= 0) {
        // Equal split when originals had no weights (edge case)
        const base = Math.floor(remainingInt / others.length);
        let leftover = remainingInt - base * others.length;
        others.forEach((r) => { next[r.envelope.id] = String(base + (leftover-- > 0 ? 1 : 0)); });
      } else {
        let given = 0;
        others.forEach((r, i) => {
          if (i === others.length - 1) {
            next[r.envelope.id] = String(Math.max(0, remainingInt - given));
          } else {
            const share = Math.round((r.allocatedAmount / weightsTotal) * remainingInt);
            next[r.envelope.id] = String(share);
            given += share;
          }
        });
      }
    }

    setManualAmounts(next);
  };

  const enterManualMode = () => {
    if (!sortedResults) return;
    const initial: Record<string, string> = {};
    sortedResults.forEach(({ envelope, allocatedAmount }) => {
      initial[envelope.id] = String(Math.round(allocatedAmount));
    });
    setManualAmounts(initial);
    setIsManual(true);
  };

  const exitManualMode = () => {
    setIsManual(false);
    setManualAmounts({});
  };

  const handleApply = () => {
    if (isManual) {
      if (!isManualValid || !sortedResults) return;
      const manualResults: AllocationResult[] = sortedResults.map(({ envelope }) => ({
        envelope,
        allocatedAmount: parseFloat(manualAmounts[envelope.id] || '0'),
      }));
      onApply?.(manualResults, true, income);
    } else if (allTargetsMet) {
      onApply?.([], false, income);
    } else {
      if (!isValid || !results || results.length === 0) return;
      onApply?.(results, false, income);
    }
    onClose();
  };

  const canApply = isManual
    ? isManualValid
    : isValid && (allTargetsMet || (!!results && results.length > 0));

  const totalColor = isManualValid ? '#00BFA5' : '#FF6B6B';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      {/* Header: title + amount */}
      <DialogTitle sx={{ pb: isValid ? 0.5 : 1 }}>
        <Box display="flex" flexDirection="column" gap={0.5}>
          <Typography variant="h6" fontWeight={600}>
            {isEditing ? 'Modifier le revenu' : 'Déclarer un revenu'}
          </Typography>
          {isValid && (
            <Typography
              variant="h4"
              fontWeight={600}
              color="primary.main"
              sx={{ letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrency(income)}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {/* Amount input */}
        <TextField
          label="Montant"
          type="number"
          fullWidth
          autoFocus
          value={incomeInput}
          onChange={(e) => {
            setIncomeInput(e.target.value);
            if (isManual) exitManualMode();
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && canApply) handleApply(); }}
          inputProps={{ min: 0, step: 1 }}
          InputProps={{
            startAdornment: <EuroIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.1rem' }} />,
          }}
          helperText={isManual ? 'Mode personnalisé' : undefined}
          sx={{
            '& .MuiInputBase-input': {
              fontSize: '1.5rem',
              fontWeight: 600,
              letterSpacing: '-0.02em',
            },
          }}
        />

        {/* All targets met — success callout */}
        {allTargetsMet && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Box
              sx={{
                py: 2,
                px: 2,
                borderRadius: 2,
                bgcolor: 'rgba(34, 197, 94, 0.08)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
              }}
            >
              <Typography variant="body2" fontWeight={600} color="success.main" mb={0.5}>
                Tous vos objectifs sont atteints
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.5, fontSize: '0.8125rem' }}>
                Ce revenu ne sera pas réparti. Vous pouvez enregistrer l'entrée pour l'historique.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Allocation suggestion block */}
        {sortedResults !== null && sortedResults.length > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />

            {/* Section header */}
            <Box mb={2}>
              <Typography variant="body2" fontWeight={600} color="text.primary" mb={0.5}>
                {isManual ? 'Répartition personnalisée' : 'Répartition recommandée'}
              </Typography>
              {!isManual && (
                <>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.8125rem' }}>
                    Basée sur l'avancement de vos objectifs.
                  </Typography>
                  {sortedResults.length > 1 && (
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        mt: 1,
                        px: 1.25,
                        py: 0.375,
                        borderRadius: '20px',
                        bgcolor: 'rgba(198, 161, 91, 0.12)',
                        border: '1px solid rgba(198, 161, 91, 0.25)',
                      }}
                    >
                      <Typography variant="caption" fontWeight={600} color="primary.main" sx={{ fontSize: '0.75rem' }}>
                        Priorité actuelle : {sortedResults[0].envelope.name}
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>

            {/* Allocation list */}
            <Box
              sx={{
                borderRadius: 1.5,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
              }}
            >
              {sortedResults.map(({ envelope, allocatedAmount }, i, arr) => {
                const pct = income > 0 ? (allocatedAmount / income) * 100 : 0;
                const asset = assets.find((a) => a.envelopeId === envelope.id);
                const effectiveAmount = isManual
                  ? Math.max(0, parseFloat(manualAmounts[envelope.id] ?? '0') || 0)
                  : allocatedAmount;
                const unitHint = (asset && asset.unitPrice > 0 && effectiveAmount > 0)
                  ? computeUnits(effectiveAmount, asset.unitPrice, asset.isFractional)
                  : null;

                return (
                  <Box
                    key={envelope.id}
                    sx={{
                      px: 2,
                      py: 1.5,
                      bgcolor: i % 2 === 0 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                    }}
                  >
                    <Box
                      display="grid"
                      gridTemplateColumns={isManual ? '1fr auto' : '1fr auto auto'}
                      alignItems="center"
                      gap={isManual ? 1.5 : 2}
                    >
                      <Typography variant="body2" fontWeight={600} color="text.primary" noWrap>
                        {envelope.name}
                      </Typography>

                      {!isManual && (
                        <Typography variant="caption" color="text.disabled" textAlign="right" sx={{ minWidth: 36, fontSize: '0.75rem', opacity: 0.8 }}>
                          {pct.toFixed(0)}%
                        </Typography>
                      )}

                      {isManual ? (
                        <Box
                          sx={{
                            '& input[type=number]': {
                              display: 'block',
                              width: '84px',
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid rgba(255,255,255,0.15)',
                              borderRadius: '6px',
                              color: '#E2E8F0',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              fontVariantNumeric: 'tabular-nums',
                              textAlign: 'right',
                              outline: 'none',
                              padding: '6px 8px',
                              boxSizing: 'border-box',
                              transition: 'border-color 0.15s, background 0.15s',
                              MozAppearance: 'textfield',
                            },
                            '& input[type=number]:focus': {
                              borderColor: 'rgba(198, 161, 91, 0.6)',
                              background: 'rgba(198, 161, 91, 0.06)',
                            },
                            '& input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
                            '& input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
                          }}
                        >
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={manualAmounts[envelope.id] ?? ''}
                            onChange={(e) => handleManualChange(envelope.id, e.target.value)}
                          />
                        </Box>
                      ) : (
                        <Typography variant="body2" fontWeight={700} color="text.primary" textAlign="right" sx={{ minWidth: 80, fontVariantNumeric: 'tabular-nums', fontSize: '1rem' }}>
                          <AnimatedAmount amount={allocatedAmount} />
                        </Typography>
                      )}
                    </Box>

                    {unitHint !== null && (() => {
                      const { units, remainingCash } = unitHint;
                      const unitsLabel = asset!.isFractional
                        ? units.toFixed(3).replace(/\.?0+$/, '')
                        : String(units);
                      const line = units === 0
                        ? `Prix unitaire ${formatCurrency(asset!.unitPrice)} — montant insuffisant pour 1 part`
                        : `≈ ${unitsLabel} part${units !== 1 ? 's' : ''}${remainingCash > 0.005 ? ` · reste ${formatCurrency(remainingCash)}` : ''}`;
                      return (
                        <Typography
                          variant="caption"
                          display="block"
                          mt={0.75}
                          sx={{
                            fontSize: '0.6875rem',
                            fontVariantNumeric: 'tabular-nums',
                            color: units === 0 ? 'warning.main' : 'text.disabled',
                            opacity: 0.85,
                          }}
                        >
                          {line}
                        </Typography>
                      );
                    })()}
                  </Box>
                );
              })}
            </Box>

            {/* Manual mode: total + reset */}
            {isManual && (
              <Box mt={2}>
                <Box display="flex" justifyContent="flex-end" alignItems="baseline" gap={1}>
                  <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.75rem' }}>
                    Total réparti
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontVariantNumeric: 'tabular-nums', color: totalColor, fontWeight: 600, transition: 'color 0.2s' }}
                  >
                    {formatCurrency(manualTotal)} / {formatCurrency(income)}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<AutorenewRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                  onClick={exitManualMode}
                  sx={{ mt: 1.5, fontSize: '0.75rem', color: 'text.secondary', px: 0, '&:hover': { color: 'text.primary', background: 'transparent' } }}
                  disableRipple
                >
                  Revenir à la répartition automatique
                </Button>
              </Box>
            )}

            {/* Completed-envelope callout */}
            {!isManual && reachedEnvelopes.length > 0 && (
              <Box
                mt={2}
                sx={{
                  py: 1.5,
                  px: 2,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.2)',
                }}
              >
                <Typography variant="caption" color="success.main" fontWeight={600} display="block" sx={{ fontSize: '0.75rem', mb: 0.5 }}>
                  Objectifs atteints
                </Typography>
                {reachedEnvelopes.map((e) => (
                  <Typography key={e.id} variant="caption" display="block" sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.5 }}>
                    {e.name} — non incluse dans cette répartition
                  </Typography>
                ))}
              </Box>
            )}

            {/* Footer secondary action */}
            {!isManual && (
              <Box mt={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  startIcon={<TuneRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                  onClick={enterManualMode}
                  sx={{
                    fontSize: '0.8125rem',
                    color: 'text.secondary',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    '&:hover': { borderColor: 'rgba(255, 255, 255, 0.35)', bgcolor: 'rgba(255, 255, 255, 0.04)' },
                  }}
                >
                  Personnaliser la répartition
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Footer actions */}
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: 'wrap' }}>
        <Button onClick={onClose} color="inherit" sx={{ order: 1 }}>
          Fermer
        </Button>
        {onApply && (
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!canApply}
            sx={{ order: 2 }}
          >
            {isEditing ? 'Enregistrer' : 'Appliquer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
