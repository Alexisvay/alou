import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PortfolioSummary from '../components/PortfolioSummary';
import type { DashboardContext } from './Dashboard';
import { formatCurrency, formatDate } from '../utils/format';

export default function DashboardPage() {
  const { envelopes, baseEnvelopes, incomeHistory, onAddEnvelope, onDeclareIncome } =
    useOutletContext<DashboardContext>();

  const recentIncome = incomeHistory.slice(0, 3);

  return (
    <Box>
      {/* Onboarding — shown only when the account is brand new */}
      {baseEnvelopes.length === 0 && incomeHistory.length === 0 && (
        <Paper variant="outlined" sx={{ p: { xs: 4, sm: 6 }, mb: 4, textAlign: 'center' }}>
          <Stack alignItems="center" spacing={3}>
            <Box>
              <Typography variant="h5" fontWeight={700} mb={1}>
                Bienvenue dans Alou
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={480} mx="auto">
                Commencez par configurer vos enveloppes d'investissement, puis déclarez vos revenus
                pour suivre votre progression vers vos objectifs.
              </Typography>
            </Box>
            <Button variant="contained" size="large" startIcon={<AddIcon />} onClick={onAddEnvelope}>
              Créer ma première enveloppe
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Portfolio summary */}
      <PortfolioSummary envelopes={envelopes} />

      {/* Two-column overview */}
      <Box
        mt={3}
        display="grid"
        sx={{ gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}
        gap={3}
      >
        {/* Envelopes mini-list */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Typography variant="body2" fontWeight={600}>
              Enveloppes
            </Typography>
            <Button
              component={Link}
              to="/portefeuille"
              size="small"
              endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
              sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
            >
              Voir tout
            </Button>
          </Box>

          {envelopes.length === 0 ? (
            <Box textAlign="center" py={3}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Aucune enveloppe configurée
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={onAddEnvelope}>
                Créer une enveloppe
              </Button>
            </Box>
          ) : (
            <Stack spacing={2.25}>
              {envelopes.map((envelope) => {
                const progress =
                  envelope.targetAmount > 0
                    ? Math.min((envelope.currentAmount / envelope.targetAmount) * 100, 100)
                    : 0;
                return (
                  <Box key={envelope.id}>
                    <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={0.75}>
                      <Typography variant="body2" fontWeight={500} noWrap sx={{ mr: 1, flex: 1, minWidth: 0 }}>
                        {envelope.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}
                      >
                        {formatCurrency(envelope.currentAmount)}
                        {envelope.targetAmount > 0 && (
                          <Typography
                            component="span"
                            variant="caption"
                            color="text.disabled"
                          >
                            {' / '}
                            {formatCurrency(envelope.targetAmount)}
                          </Typography>
                        )}
                      </Typography>
                    </Box>
                    {envelope.targetAmount > 0 && (
                      <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{
                          height: 4,
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.07)',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: progress >= 100 ? 'success.main' : 'primary.main',
                            borderRadius: 2,
                          },
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Paper>

        {/* Recent income */}
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Typography variant="body2" fontWeight={600}>
              Revenus récents
            </Typography>
            {incomeHistory.length > 0 && (
              <Button
                component={Link}
                to="/revenus"
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: '14px !important' }} />}
                sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
              >
                Voir tout
              </Button>
            )}
          </Box>

          {recentIncome.length === 0 ? (
            <Box textAlign="center" py={3}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Aucun revenu déclaré
              </Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={onDeclareIncome}>
                Déclarer un revenu
              </Button>
            </Box>
          ) : (
            <Stack spacing={0} divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}>
              {recentIncome.map((entry) => (
                <Box
                  key={entry.id}
                  py={1.75}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(entry.date)}
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCurrency(entry.amount)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
