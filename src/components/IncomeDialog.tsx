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
          value={incomeInput}
          onChange={(e) => setIncomeInput(e.target.value)}
          inputProps={{ min: 0, step: 1 }}
          InputProps={{
            startAdornment: <EuroIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          helperText="Répartition calculée automatiquement selon vos objectifs."
          sx={{ mt: 0.5 }}
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
            <Stack spacing={1}>
              {[...results].sort((a, b) => b.allocatedAmount - a.allocatedAmount).map(({ envelope, allocatedAmount }) => {
                const pct = income > 0 ? (allocatedAmount / income) * 100 : 0;
                return (
                  <Box
                    key={envelope.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      px: 2,
                      py: 1.25,
                      borderRadius: 2,
                      bgcolor: 'rgba(77, 107, 255, 0.1)',
                      border: '1px solid rgba(77, 107, 255, 0.2)',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {envelope.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pct.toFixed(1)}%
                      </Typography>
                    </Box>
                    <Typography variant="h5" color="primary.light">
                      {formatCurrency(allocatedAmount)}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
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
