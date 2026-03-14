import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { type ComputedEnvelope } from '../types/envelope';

interface EnvelopeCardProps {
  envelope: ComputedEnvelope;
  onEdit?: () => void;
  onDelete?: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function displayAmount(value: number): string {
  return Number.isFinite(value) && value > 0 ? formatCurrency(value) : '—';
}

export default function EnvelopeCard({ envelope, onEdit, onDelete }: EnvelopeCardProps) {
  const { name, allocationPercentage } = envelope;
  const currentAmount = Number(envelope.currentAmount) || 0;
  const targetAmount = Number(envelope.targetAmount) || 0;
  const progressValue =
    targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : null;

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.6)',
        },
      }}
    >
      <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header: name + allocation badge */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Typography variant="subtitle1" fontWeight={600} color="text.primary">
            {name}
          </Typography>
          <Box
            sx={{
              px: 1.25,
              py: 0.25,
              borderRadius: '20px',
              bgcolor: 'rgba(77, 107, 255, 0.15)',
              border: '1px solid rgba(77, 107, 255, 0.35)',
              flexShrink: 0,
              ml: 1,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="primary.light" lineHeight={1.6}>
              {allocationPercentage}%
            </Typography>
          </Box>
        </Box>

        {/* Main amount */}
        <Box mb={2.5} flex={1}>
          <Typography variant="h4" fontWeight={700} color="text.primary" lineHeight={1.1}>
            {displayAmount(currentAmount)}
          </Typography>
          <Typography variant="caption" color="text.secondary" mt={0.75} display="block">
            sur {displayAmount(targetAmount)}
          </Typography>
        </Box>

        {/* Progress */}
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="caption" color="text.secondary">
              Progression
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              color={progressValue != null && progressValue >= 100 ? 'secondary.main' : 'primary.light'}
            >
              {progressValue != null ? `${progressValue.toFixed(1)}%` : '—'}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressValue ?? 0}
            sx={{
              height: 5,
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: 'linear-gradient(90deg, #4D6BFF 0%, #8A9EFF 100%)',
              },
            }}
          />
        </Box>

        {/* Actions footer */}
        {(onEdit || onDelete) && (
          <Box
            display="flex"
            justifyContent="flex-end"
            gap={0.5}
            mt={2.5}
            pt={2}
            sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            {onEdit && (
              <Tooltip title="Modifier l'enveloppe">
                <IconButton
                  size="small"
                  onClick={onEdit}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.light', bgcolor: 'rgba(77, 107, 255, 0.12)' },
                  }}
                >
                  <EditIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Supprimer l'enveloppe">
                <IconButton
                  size="small"
                  onClick={onDelete}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.1)' },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

      </CardContent>
    </Card>
  );
}
