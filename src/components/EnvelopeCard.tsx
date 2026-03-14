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
import { formatCurrency, displayAmount } from '../utils/format';

interface EnvelopeCardProps {
  envelope: ComputedEnvelope;
  portfolioShare?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function EnvelopeCard({ envelope, portfolioShare, onEdit, onDelete }: EnvelopeCardProps) {
  const { name } = envelope;
  const currentAmount = Number(envelope.currentAmount) || 0;
  const targetAmount = Number(envelope.targetAmount) || 0;
  const progressValue =
    targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : null;

  return (
    <Card
      sx={{
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: 'rgba(255, 255, 255, 0.14)',
          boxShadow: [
            '0px 10px 36px rgba(0, 0, 0, 0.5)',
            'inset 0px 1px 0px rgba(255, 255, 255, 0.1)',
          ].join(', '),
        },
      }}
    >
      <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header: name + portfolio share badge */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3.5}>
          <Typography variant="h6" color="text.primary">
            {name}
          </Typography>
          {portfolioShare != null && portfolioShare > 0 && (
            <Tooltip title="Part du portefeuille total" placement="top">
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: '20px',
                  bgcolor: 'rgba(77, 107, 255, 0.12)',
                  border: '1px solid rgba(77, 107, 255, 0.28)',
                  flexShrink: 0,
                  ml: 1,
                }}
              >
                <Typography variant="caption" fontWeight={600} color="primary.light" lineHeight={1.6} noWrap>
                  {portfolioShare.toFixed(1)}%
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        {/* Main amount */}
        <Box mb={3.5} flex={1}>
          <Typography variant="h4" color="text.primary" fontWeight={700}>
            {displayAmount(currentAmount)}
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            mt={1}
            display="block"
            sx={{ fontSize: '0.72rem' }}
          >
            <Box component="span" sx={{ opacity: 0.6 }}>sur</Box>
            {' '}
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
              {displayAmount(targetAmount)}
            </Box>
          </Typography>
          {targetAmount > currentAmount && (
            <Typography
              variant="caption"
              color="text.disabled"
              mt={0.5}
              display="block"
              sx={{ fontSize: '0.68rem', opacity: 0.7 }}
            >
              <Box component="span" sx={{ opacity: 0.7 }}>reste</Box>
              {' '}
              {formatCurrency(targetAmount - currentAmount)}
            </Typography>
          )}
        </Box>

        {/* Progress */}
        <Box>
          <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={1}>
            <Typography variant="caption" color="text.disabled" fontWeight={400}>
              Progression
            </Typography>
            <Typography
              variant="caption"
              fontWeight={600}
              color={progressValue != null && progressValue >= 100 ? 'secondary.main' : 'primary.light'}
              sx={{ opacity: 0.85 }}
            >
              {progressValue != null ? `${progressValue.toFixed(1)} %` : '—'}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressValue ?? 0}
            sx={{
              height: 6,
              borderRadius: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
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
            mt={3}
            pt={2}
            sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
          >
            {onEdit && (
              <Tooltip title="Modifier l'enveloppe">
                <IconButton
                  size="small"
                  onClick={onEdit}
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.light', bgcolor: 'rgba(77, 107, 255, 0.1)' },
                  }}
                >
                  <EditIcon sx={{ fontSize: 14 }} />
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
                    '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.08)' },
                  }}
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}

      </CardContent>
    </Card>
  );
}
