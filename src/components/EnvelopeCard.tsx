import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
} from '@mui/material';
import { type Envelope } from '../types/envelope';

interface EnvelopeCardProps {
  envelope: Envelope;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function EnvelopeCard({ envelope }: EnvelopeCardProps) {
  const { name, currentAmount, targetAmount, allocationPercentage } = envelope;
  const progressValue = Math.min((currentAmount / targetAmount) * 100, 100);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        {/* En-tête de la card */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" color="text.primary">
            {name}
          </Typography>
          <Chip
            label={`${allocationPercentage}%`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 600, borderRadius: 2 }}
          />
        </Box>

        {/* Montants */}
        <Box mb={2}>
          <Typography variant="h5" fontWeight={700} color="primary.main">
            {formatCurrency(currentAmount)}
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Objectif : {formatCurrency(targetAmount)}
          </Typography>
        </Box>

        {/* Barre de progression */}
        <Box>
          <Box display="flex" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Progression
            </Typography>
            <Typography variant="caption" fontWeight={600} color="text.primary">
              {progressValue.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressValue}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(61, 90, 254, 0.12)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}