import { useOutletContext } from 'react-router-dom';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PortfolioSummary from '../components/PortfolioSummary';
import type { DashboardContext } from './Dashboard';

export default function DashboardPage() {
  const { envelopes, baseEnvelopes, incomeHistory, onAddEnvelope } =
    useOutletContext<DashboardContext>();

  return (
    <Box>
      {/* Onboarding — shown only when the account is brand new */}
      {baseEnvelopes.length === 0 && incomeHistory.length === 0 && (
        <Paper
          variant="outlined"
          sx={{ p: { xs: 4, sm: 6 }, mb: 6, textAlign: 'center' }}
        >
          <Stack alignItems="center" spacing={3}>
            <Box
              component="img"
              src="/logo-alou.png"
              alt="Alou"
              sx={{
                width: 56,
                height: 56,
                objectFit: 'contain',
              }}
            />

            <Box>
              <Typography variant="h5" fontWeight={700} mb={1}>
                Bienvenue dans Alou
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={480} mx="auto">
                Commencez par configurer vos enveloppes d'investissement, puis déclarez vos revenus pour suivre votre progression vers vos objectifs.
              </Typography>
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              sx={{ width: '100%', maxWidth: 480 }}
            >
              {[
                { step: '1', label: 'Créez vos enveloppes' },
                { step: '2', label: 'Déclarez vos revenus' },
                { step: '3', label: 'Suivez votre progression' },
              ].map(({ step, label }) => (
                <Box
                  key={step}
                  flex={1}
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>
                    Étape {step}
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    {label}
                  </Typography>
                </Box>
              ))}
            </Stack>

            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={onAddEnvelope}
            >
              Créer ma première enveloppe
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Portfolio summary */}
      <PortfolioSummary envelopes={envelopes} />
    </Box>
  );
}
