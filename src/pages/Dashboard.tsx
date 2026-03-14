import { useState, useCallback } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Box, Button, Grid, Typography, Paper, Stack, Divider } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import PageHeader from '../components/PageHeader';
import EnvelopeCard from '../components/EnvelopeCard';
import IncomeDialog from '../components/IncomeDialog';
import { mockEnvelopes } from '../data/mockEnvelopes';
import { type AllocationResult } from '../utils/calculateAllocation';
import { type IncomeEntry } from '../types/income';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export default function Dashboard() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const [envelopes, setEnvelopes] = useLocalStorage('alou_envelopes', mockEnvelopes);

  const [incomeHistory, setIncomeHistory] = useLocalStorage<IncomeEntry[]>(
    'alou_income_history',
    [],
    (raw) =>
      (raw as IncomeEntry[]).map((entry) => ({
        ...entry,
        date: new Date(entry.date as unknown as string),
      })),
  );

  const handleApplyAllocation = useCallback((results: AllocationResult[]) => {
    setEnvelopes((prev) =>
      prev.map((env) => {
        const result = results.find((r) => r.envelope.id === env.id);
        if (!result) return env;
        return {
          ...env,
          currentAmount: env.currentAmount + result.allocatedAmount,
        };
      })
    );
    setIncomeHistory((prev) => [
      {
        id: crypto.randomUUID(),
        amount: results.reduce((sum, r) => sum + r.allocatedAmount, 0),
        date: new Date(),
        allocations: results,
      },
      ...prev,
    ]);
  }, []);

  return (
    <Box px={{ xs: 2, sm: 4, md: 6 }} py={4} maxWidth={1100} mx="auto">
      {/* Header + bouton */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="flex-start"
        flexWrap="wrap"
        gap={2}
        mb={4}
      >
        <PageHeader
          title="Alou"
          subtitle="Gérez vos enveloppes d'investissement et répartissez vos revenus intelligemment."
        />

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
          size="large"
        >
          Déclarer un revenu
        </Button>
      </Box>

      {/* Grille de cards */}
      <Grid container spacing={3}>
        {envelopes.map((envelope) => (
          <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={envelope.id}>
            <EnvelopeCard envelope={envelope} />
          </Grid>
        ))}
      </Grid>

      {/* Historique des revenus */}
      {incomeHistory.length > 0 && (
        <Box mt={6}>
          <Typography variant="h6" fontWeight={600} mb={2} display="flex" alignItems="center" gap={1}>
            <HistoryIcon fontSize="small" />
            Historique des revenus
          </Typography>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack divider={<Divider />} spacing={0}>
              {incomeHistory.map((entry) => (
                <Box
                  key={entry.id}
                  display="flex"
                  flexDirection={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  gap={1}
                  py={2}
                >
                  <Box>
                    <Typography variant="body1" fontWeight={600}>
                      {formatCurrency(entry.amount)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(entry.date)}
                    </Typography>
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
                    {entry.allocations.map(({ envelope, allocatedAmount }) => (
                      <Typography
                        key={envelope.id}
                        variant="body2"
                        component="span"
                        sx={{
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: 'action.hover',
                        }}
                      >
                        {envelope.name}: {formatCurrency(allocatedAmount)}
                      </Typography>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      {/* Dialog */}
      <IncomeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        envelopes={envelopes}
        onApply={handleApplyAllocation}
      />
    </Box>
  );
}