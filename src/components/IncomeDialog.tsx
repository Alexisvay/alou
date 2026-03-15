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
import { calculateAllocation, type AllocationResult } from '../utils/calculateAllocation';
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
  onApply?: (results: AllocationResult[], isManual: boolean) => void;
  initialAmount?: number;
}

export default function IncomeDialog({ open, onClose, envelopes, onApply, initialAmount }: IncomeDialogProps) {
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
      onApply?.(manualResults, true);
    } else {
      if (!isValid || !results || results.length === 0) return;
      onApply?.(results, false);
    }
    onClose();
  };

  const canApply = isManual
    ? isManualValid
    : isValid && !!results && results.length > 0;

  const totalColor = isManualValid ? '#00BFA5' : '#FF6B6B';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isEditing ? 'Modifier le revenu' : 'Déclarer un revenu'}
      </DialogTitle>

      <DialogContent>
        <TextField
          label="Montant"
          type="number"
          fullWidth
          autoFocus
          value={incomeInput}
          onChange={(e) => {
            setIncomeInput(e.target.value);
            // Reset manual mode when income changes so amounts stay coherent
            if (isManual) exitManualMode();
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' && canApply) handleApply(); }}
          inputProps={{ min: 0, step: 1 }}
          InputProps={{
            startAdornment: <EuroIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.1rem' }} />,
          }}
          helperText={
            isManual
              ? 'Mode personnalisé — saisissez les montants manuellement.'
              : 'Répartition recommandée selon l\'avancement de chaque enveloppe.'
          }
          sx={{
            mt: 0.5,
            '& .MuiInputBase-input': {
              fontSize: '1.25rem',
              fontWeight: 600,
              letterSpacing: '-0.25px',
            },
          }}
        />

        {/* Tous les objectifs atteints */}
        {allTargetsMet && (
          <Box mt={3}>
            <Divider sx={{ mb: 2.5 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center" py={1.5}>
              Tous les objectifs sont atteints.
            </Typography>
          </Box>
        )}

        {/* Résultats */}
        {sortedResults !== null && sortedResults.length > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2.5 }} />

            {/* Section label */}
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={isManual ? 2 : 0.75}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}
            >
              {isManual ? 'Répartition personnalisée' : 'Répartition recommandée'} · {formatCurrency(income)}
            </Typography>

            {/* Auto mode: explanation + top-priority hint */}
            {!isManual && (
              <Box mb={1.75}>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  display="block"
                  sx={{ fontSize: '0.7rem', lineHeight: 1.5 }}
                >
                  Cette suggestion privilégie les enveloppes les plus en retard par rapport à leurs objectifs.
                </Typography>
                {sortedResults.length > 1 && (
                  <Typography
                    variant="caption"
                    display="block"
                    mt={0.5}
                    sx={{ fontSize: '0.7rem', color: 'text.disabled' }}
                  >
                    Priorité actuelle :{' '}
                    <Box component="span" sx={{ color: 'primary.light', fontWeight: 600 }}>
                      {sortedResults[0].envelope.name}
                    </Box>
                  </Typography>
                )}
              </Box>
            )}

            {/* Allocation rows */}
            <Box
              sx={{
                borderRadius: 1.5,
                border: '1px solid rgba(77, 107, 255, 0.18)',
                overflow: 'hidden',
              }}
            >
              {sortedResults.map(({ envelope, allocatedAmount }, i, arr) => {
                const pct = income > 0 ? (allocatedAmount / income) * 100 : 0;
                return (
                  <Box
                    key={envelope.id}
                    display="grid"
                    gridTemplateColumns={isManual ? '1fr auto' : '1fr auto auto'}
                    alignItems="center"
                    gap={isManual ? 1.5 : 2}
                    sx={{
                      px: 2,
                      py: isManual ? 1 : 1.25,
                      bgcolor: i % 2 === 0 ? 'rgba(77, 107, 255, 0.07)' : 'rgba(77, 107, 255, 0.04)',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                    }}
                  >
                    <Typography variant="body2" fontWeight={500} color="text.primary" noWrap>
                      {envelope.name}
                    </Typography>

                    {!isManual && (
                      <Typography variant="caption" color="text.disabled" textAlign="right" sx={{ minWidth: 36 }}>
                        {pct.toFixed(0)}%
                      </Typography>
                    )}

                    {isManual ? (
                      // Wrapper Box carries the Emotion styles; the inner <input> is a
                      // plain native element so React's controlled-input reconciliation
                      // always updates the DOM value when manualAmounts changes.
                      <Box
                        sx={{
                          '& input[type=number]': {
                            display: 'block',
                            width: '84px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(77,107,255,0.3)',
                            borderRadius: '6px',
                            color: '#E2E8F0',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            fontFamily: 'inherit',
                            fontVariantNumeric: 'tabular-nums',
                            textAlign: 'right',
                            outline: 'none',
                            padding: '5px 8px',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.15s, background 0.15s',
                            MozAppearance: 'textfield',
                          },
                          '& input[type=number]:focus': {
                            borderColor: 'rgba(77,107,255,0.7)',
                            background: 'rgba(77,107,255,0.08)',
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
                      <Typography variant="body2" fontWeight={700} color="text.primary" textAlign="right" sx={{ minWidth: 72, fontVariantNumeric: 'tabular-nums' }}>
                        <AnimatedAmount amount={allocatedAmount} />
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Manual mode: total summary + reset button */}
            {isManual && (
              <Box mt={2}>
                {/* Total summary — right aligned */}
                <Box display="flex" justifyContent="flex-end" alignItems="baseline" gap={1}>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.disabled', fontSize: '0.7rem' }}
                  >
                    Total réparti
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      color: totalColor,
                      fontWeight: 600,
                      transition: 'color 0.2s',
                    }}
                  >
                    {formatCurrency(manualTotal)} / {formatCurrency(income)}
                  </Typography>
                </Box>
                {/* Reset to automatic */}
                <Box mt={1.5}>
                  <Button
                    size="small"
                    color="inherit"
                    startIcon={<AutorenewRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                    onClick={exitManualMode}
                    sx={{
                      fontSize: '0.75rem',
                      color: 'text.secondary',
                      px: 0,
                      '&:hover': { color: 'text.primary', background: 'transparent' },
                    }}
                    disableRipple
                  >
                    Revenir à la répartition automatique
                  </Button>
                </Box>
              </Box>
            )}

            {/* Auto mode: customize link */}
            {!isManual && (
              <Box mt={1.5} display="flex" justifyContent="flex-end">
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<TuneRoundedIcon sx={{ fontSize: '0.85rem !important' }} />}
                  onClick={enterManualMode}
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    px: 0,
                    '&:hover': { color: 'text.primary', background: 'transparent' },
                  }}
                  disableRipple
                >
                  Personnaliser la répartition
                </Button>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Fermer
        </Button>
        {onApply && (
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!canApply}
          >
            {isEditing ? 'Enregistrer' : 'Appliquer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
