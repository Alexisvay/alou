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
  Stack,
} from '@mui/material';
import EuroIcon from '@mui/icons-material/Euro';
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

  const isEditing = initialAmount != null;

  useEffect(() => {
    if (open && initialAmount != null) {
      setIncomeInput(String(initialAmount));
    }
    if (!open) {
      setIncomeInput('');
    }
  }, [open, initialAmount]);

  const income = parseFloat(incomeInput);
  const isValid = incomeInput !== '' && !isNaN(income) && income > 0;

  const results = useMemo<AllocationResult[] | null>(() => {
    if (!isValid) return null;
    return calculateAllocation(income, envelopes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomeInput, envelopes]);

  const allTargetsMet = isValid && results !== null && results.length === 0;

  const handleApply = () => {
    if (!isValid || !results || results.length === 0) return;
    onApply?.(results);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
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
          onChange={(e) => setIncomeInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
          inputProps={{ min: 0, step: 1 }}
          InputProps={{
            startAdornment: <EuroIcon sx={{ mr: 1, color: 'text.secondary', fontSize: '1.1rem' }} />,
          }}
          helperText="Répartition calculée automatiquement selon vos objectifs."
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
        {results !== null && results.length > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2.5 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={2}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}
            >
              Répartition · {formatCurrency(income)}
            </Typography>
            <Box
              sx={{
                borderRadius: 1.5,
                border: '1px solid rgba(77, 107, 255, 0.18)',
                overflow: 'hidden',
              }}
            >
              {[...results].sort((a, b) => b.allocatedAmount - a.allocatedAmount).map(({ envelope, allocatedAmount }, i, arr) => {
                const pct = income > 0 ? (allocatedAmount / income) * 100 : 0;
                return (
                  <Box
                    key={envelope.id}
                    display="grid"
                    gridTemplateColumns="1fr auto auto"
                    alignItems="center"
                    gap={2}
                    sx={{
                      px: 2,
                      py: 1.25,
                      bgcolor: i % 2 === 0 ? 'rgba(77, 107, 255, 0.07)' : 'rgba(77, 107, 255, 0.04)',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
                    }}
                  >
                    <Typography variant="body2" fontWeight={500} color="text.primary" noWrap>
                      {envelope.name}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" textAlign="right" sx={{ minWidth: 36 }}>
                      {pct.toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="text.primary" textAlign="right" sx={{ minWidth: 72, fontVariantNumeric: 'tabular-nums' }}>
                      <AnimatedAmount amount={allocatedAmount} />
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} color="inherit">
          Fermer
        </Button>
        {onApply && (
          <Button
            variant="contained"
            onClick={handleApply}
            disabled={!isValid || !results || results.length === 0}
          >
            {isEditing ? 'Enregistrer' : 'Appliquer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
