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
  onApply?: (results: AllocationResult[]) => void;
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

  const isManualValid = isValid && Math.abs(manualTotal - income) < 0.5;

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
      onApply?.(manualResults);
    } else {
      if (!isValid || !results || results.length === 0) return;
      onApply?.(results);
    }
    onClose();
  };

  const canApply = isManual
    ? isManualValid
    : isValid && !!results && results.length > 0;

  const remainingDiff = isManual ? income - manualTotal : 0;
  const totalColor = isManualValid ? '#00BFA5' : Math.abs(remainingDiff) < 1 ? '#00BFA5' : '#FF6B6B';

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
              : 'Répartition calculée automatiquement selon vos objectifs.'
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
              mb={2}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}
            >
              {isManual ? 'Répartition personnalisée' : 'Répartition'} · {formatCurrency(income)}
            </Typography>

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
                      <Box
                        component="input"
                        type="number"
                        value={manualAmounts[envelope.id] ?? ''}
                        onChange={(e) =>
                          setManualAmounts((prev) => ({ ...prev, [envelope.id]: e.target.value }))
                        }
                        sx={{
                          width: 84,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(77, 107, 255, 0.3)',
                          borderRadius: '6px',
                          color: '#E2E8F0',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          fontFamily: 'inherit',
                          fontVariantNumeric: 'tabular-nums',
                          textAlign: 'right',
                          outline: 'none',
                          px: '8px',
                          py: '5px',
                          transition: 'border-color 0.15s',
                          '&:focus': {
                            borderColor: 'rgba(77, 107, 255, 0.7)',
                            background: 'rgba(77, 107, 255, 0.08)',
                          },
                          '&::-webkit-outer-spin-button, &::-webkit-inner-spin-button': {
                            WebkitAppearance: 'none',
                            margin: 0,
                          },
                          '&[type=number]': { MozAppearance: 'textfield' },
                        }}
                      />
                    ) : (
                      <Typography variant="body2" fontWeight={700} color="text.primary" textAlign="right" sx={{ minWidth: 72, fontVariantNumeric: 'tabular-nums' }}>
                        <AnimatedAmount amount={allocatedAmount} />
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* Manual mode: total summary + back button */}
            {isManual && (
              <Box mt={2} display="flex" alignItems="center" justifyContent="space-between">
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<AutorenewRoundedIcon sx={{ fontSize: '0.9rem !important' }} />}
                  onClick={exitManualMode}
                  sx={{
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    px: 0,
                    '&:hover': { color: 'text.primary', background: 'transparent' },
                  }}
                  disableRipple
                >
                  Automatique
                </Button>
                <Box textAlign="right">
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
                  {!isManualValid && Math.abs(remainingDiff) > 0.5 && (
                    <Typography variant="caption" display="block" sx={{ color: 'rgba(255,107,107,0.8)', fontSize: '0.68rem', mt: 0.25 }}>
                      {remainingDiff > 0
                        ? `${formatCurrency(remainingDiff)} restant à répartir`
                        : `Dépassement de ${formatCurrency(Math.abs(remainingDiff))}`}
                    </Typography>
                  )}
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
