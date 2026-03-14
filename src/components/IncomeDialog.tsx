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

interface IncomeDialogProps {
  open: boolean;
  onClose: () => void;
  envelopes: ComputedEnvelope[];
  onApply?: (results: AllocationResult[]) => void;
  initialAmount?: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
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
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        {isEditing ? 'Modifier le revenu' : 'Déclarer un revenu'}
      </DialogTitle>

      <DialogContent>
        {/* Champ montant */}
        <TextField
          label="Montant"
          type="number"
          fullWidth
          value={incomeInput}
          onChange={(e) => setIncomeInput(e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          InputProps={{
            startAdornment: <EuroIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          helperText="La répartition sera calculée automatiquement selon vos objectifs."
          sx={{ mt: 1 }}
        />

        {/* Tous les objectifs atteints */}
        {allTargetsMet && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center" py={1}>
              Tous les objectifs sont atteints.
            </Typography>
          </Box>
        )}

        {/* Résultats */}
        {results !== null && results.length > 0 && (
          <Box mt={3}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
              Répartition pour {formatCurrency(income)}
            </Typography>
            <Stack spacing={1.5}>
              {[...results].sort((a, b) => b.allocatedAmount - a.allocatedAmount).map(({ envelope, allocatedAmount }) => {
                const pct = income > 0 ? (allocatedAmount / income) * 100 : 0;
                return (
                  <Box
                    key={envelope.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ px: 2, py: 1.5, borderRadius: 3, bgcolor: 'primary.main' }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="white">
                        {envelope.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                        {pct.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Typography variant="h6" fontWeight={700} color="white">
                      {formatCurrency(allocatedAmount)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mt={2}
              textAlign="center"
            >
              Répartition calculée automatiquement selon les objectifs restants.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
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
