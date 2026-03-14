import { useState } from 'react';
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
import { type Envelope } from '../types/envelope';
import { calculateAllocation, type AllocationResult } from '../utils/calculateAllocation';

interface IncomeDialogProps {
  open: boolean;
  onClose: () => void;
  envelopes: Envelope[];
  onApply?: (results: AllocationResult[]) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function IncomeDialog({ open, onClose, envelopes, onApply }: IncomeDialogProps) {
  const [incomeInput, setIncomeInput] = useState<string>('');
  const [results, setResults] = useState<AllocationResult[] | null>(null);
  const [error, setError] = useState<string>('');

  const handleCalculate = () => {
    const income = parseFloat(incomeInput);

    // Validation
    if (!incomeInput || isNaN(income) || income <= 0) {
      setError('Veuillez entrer un montant valide.');
      setResults(null);
      return;
    }

    setError('');
    setResults(calculateAllocation(income, envelopes));
  };

  const handleApply = () => {
    if (results) {
      onApply?.(results);
      setIncomeInput('');
      setResults(null);
      setError('');
      onClose();
    }
  };

  const handleClose = () => {
    setIncomeInput('');
    setResults(null);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Déclarer un revenu
      </DialogTitle>

      <DialogContent>
        {/* Champ montant */}
        <TextField
          label="Montant"
          type="number"
          fullWidth
          value={incomeInput}
          onChange={(e) => setIncomeInput(e.target.value)}
          error={!!error}
          helperText={error || ' '}
          inputProps={{ min: 0, step: 1 }}
          InputProps={{
            startAdornment: <EuroIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          sx={{ mt: 1 }}
        />

        {/* Bouton calculer */}
        <Button
          variant="contained"
          fullWidth
          onClick={handleCalculate}
          sx={{ mt: 1, mb: results ? 3 : 1 }}
        >
          Calculer la répartition
        </Button>

        {/* Résultats */}
        {results && (
          <>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" mb={1.5}>
              Répartition pour {formatCurrency(parseFloat(incomeInput))}
            </Typography>
            <Stack spacing={1.5}>
              {results.map(({ envelope, allocatedAmount }) => (
                <Box
                  key={envelope.id}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 3,
                    bgcolor: 'primary.main',
                    // Légère variation d'opacité pour chaque ligne
                    opacity: 0.85 + (envelope.allocationPercentage / 100) * 0.15,
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="white">
                      {envelope.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
                      {envelope.allocationPercentage}%
                    </Typography>
                  </Box>
                  <Typography variant="h6" fontWeight={700} color="white">
                    {formatCurrency(allocatedAmount)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Fermer
        </Button>
        {results && onApply && (
          <Button variant="contained" onClick={handleApply}>
            Appliquer
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}