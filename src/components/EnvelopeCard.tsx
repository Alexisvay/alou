import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  Chip,
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

export default function EnvelopeCard({ envelope, onEdit, onDelete }: EnvelopeCardProps) {
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
              backgroundColor: 'rgba(77, 107, 255, 0.2)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
              },
            }}
          />
        </Box>

        {/* Actions */}
        {(onEdit || onDelete) && (
          <Box display="flex" justifyContent="flex-end" gap={0.5} mt={1.5}>
            {onEdit && (
              <Tooltip title="Modifier l'enveloppe">
                <IconButton size="small" onClick={onEdit}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Supprimer l'enveloppe">
                <IconButton size="small" color="error" onClick={onDelete}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
