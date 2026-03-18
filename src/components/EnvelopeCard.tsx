import {
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Box,
  IconButton,
  Tooltip,
} from '@mui/material';
import { SURFACE_BORDER_HOVER } from '../theme/theme';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import { type ComputedEnvelope } from '../types/envelope';
import { formatCurrency, displayAmount } from '../utils/format';

interface EnvelopeCardProps {
  envelope: ComputedEnvelope;
  portfolioShare?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  /** Props spread onto the drag-handle element (from useSortable). */
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}

type StatusConfig = { label: string; color: string };

function getStatus(progress: number | null, reached: boolean): StatusConfig {
  if (reached) return { label: 'Atteinte', color: '#22C55E' };
  if (progress != null && progress >= 80) return { label: 'Presque atteinte', color: '#F59E0B' };
  return { label: 'En cours', color: '#94A3B8' };
}

export default function EnvelopeCard({ envelope, portfolioShare, onEdit, onDelete, dragHandleProps }: EnvelopeCardProps) {
  const { name } = envelope;
  const currentAmount = Number(envelope.currentAmount) || 0;
  const targetAmount = Number(envelope.targetAmount) || 0;
  const progressValue =
    targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : null;
  const reached = currentAmount >= targetAmount && targetAmount > 0;
  const status = getStatus(progressValue, reached);

  return (
    <Card
      sx={{
        height: '100%',
        bgcolor: reached ? 'rgba(34, 197, 94, 0.06)' : undefined,
        borderColor: reached ? 'rgba(34, 197, 94, 0.25)' : undefined,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          borderColor: reached ? 'rgba(34, 197, 94, 0.4)' : SURFACE_BORDER_HOVER,
          boxShadow: [
            '0px 6px 24px rgba(0, 0, 0, 0.45)',
            'inset 0px 1px 0px rgba(255, 255, 255, 0.06)',
          ].join(', '),
        },
      }}
    >
      <CardContent sx={{ p: 3.5, display: 'flex', flexDirection: 'column', height: '100%' }}>

        {/* Header: drag handle + name + portfolio share badge */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3.5}>
          <Box display="flex" alignItems="flex-start" gap={0.5} flex={1} minWidth={0}>
            {dragHandleProps && (
              <Box
                component="span"
                {...dragHandleProps}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  mt: '3px',
                  flexShrink: 0,
                  cursor: 'grab',
                  color: 'text.disabled',
                  opacity: 0,
                  transition: 'opacity 0.15s',
                  '.MuiCard-root:hover &': { opacity: 1 },
                  '&:hover': { color: 'text.secondary' },
                  '&:active': { cursor: 'grabbing' },
                  touchAction: 'none',
                }}
              >
                <DragIndicatorRoundedIcon sx={{ fontSize: 15 }} />
              </Box>
            )}
            <Typography variant="h6" color="text.primary" noWrap>
              {name}
            </Typography>
          </Box>
          {portfolioShare != null && portfolioShare > 0 && (
            <Tooltip title="Part du portefeuille total" placement="top">
              <Box
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: '20px',
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  flexShrink: 0,
                  ml: 1,
                }}
              >
                <Typography variant="caption" fontWeight={600} color="text.secondary" lineHeight={1.6} noWrap>
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
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Box display="flex" alignItems="center" gap={0.75}>
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  bgcolor: status.color,
                  flexShrink: 0,
                  opacity: 0.9,
                }}
              />
              <Typography variant="caption" fontWeight={500} sx={{ color: status.color }}>
                {status.label}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{ opacity: 0.9, color: reached ? 'success.main' : 'text.secondary' }}
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
              backgroundColor: 'rgba(255, 255, 255, 0.07)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                background: reached
                  ? 'linear-gradient(90deg, #22C55E 0%, #4ADE80 100%)'
                  : 'linear-gradient(135deg, #C6A15B, #E6C97A, #B8924A)',
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
                    '&:hover': { color: 'primary.main', bgcolor: 'rgba(198, 161, 91, 0.12)' },
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
                    '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.08)' },
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
