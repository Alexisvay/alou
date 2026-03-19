import { useState, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import EnvelopeCard from '../components/EnvelopeCard';
import PortfolioChart from '../components/PortfolioChart';
import type { DashboardContext } from './Dashboard';
import type { ComputedEnvelope } from '../types/envelope';

// ── Sortable card wrapper ──────────────────────────────────────────────────────
interface SortableCardProps {
  envelope: ComputedEnvelope;
  portfolioShare?: number;
  onEdit: () => void;
  onDelete: () => void;
}

function SortableCard({ envelope, portfolioShare, onEdit, onDelete }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: envelope.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 1 : undefined,
      }}
    >
      <EnvelopeCard
        envelope={envelope}
        portfolioShare={portfolioShare}
        onEdit={onEdit}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLElement>}
      />
    </div>
  );
}

export default function EnveloppesPage() {
  const {
    envelopes,
    recommendation,
    recommendationDismissed,
    dismissRecommendation,
    handleDragEnd,
    onEditEnvelope,
    onDeleteEnvelope,
    onAddEnvelope,
  } = useOutletContext<DashboardContext>();

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setDraggingId(active.id as string);
  }, []);

  const handleDragEndLocal = useCallback(
    (event: Parameters<typeof handleDragEnd>[0]) => {
      setDraggingId(null);
      handleDragEnd(event);
    },
    [handleDragEnd],
  );

  return (
    <Box>
      {/* Section enveloppes */}
      <Box id="enveloppes" display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600} display="flex" alignItems="center" gap={1}>
          <AccountBalanceIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Enveloppes
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={onAddEnvelope}
        >
          Nouvelle enveloppe
        </Button>
      </Box>

      {recommendation && !recommendationDismissed && (
        <Box
          mb={2.5}
          sx={{
            pl: 2,
            pr: 1,
            py: 1.25,
            borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
            bgcolor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '0 10px 10px 0',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box>
            <Typography
              variant="caption"
              color="text.disabled"
              display="block"
              mb={0.5}
              sx={{ textTransform: 'uppercase', letterSpacing: '0.09em', fontSize: '0.6rem' }}
            >
              Recommandation
            </Typography>
            <Typography variant="body2" fontWeight={600} color="text.primary" lineHeight={1.4}>
              {recommendation.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
              {recommendation.body}
            </Typography>
          </Box>
          <Tooltip title="Fermer">
            <IconButton
              size="small"
              onClick={dismissRecommendation}
              sx={{
                color: 'text.disabled',
                flexShrink: 0,
                mt: -0.25,
                '&:hover': { color: 'text.secondary', bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Grille de cards / empty state */}
      {envelopes.length === 0 ? (
        <Paper variant="outlined" sx={{ py: { xs: 6, sm: 8 }, px: { xs: 3, sm: 6 } }}>
          <Stack alignItems="center" spacing={2.5} textAlign="center">
            <Box sx={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              bgcolor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <AccountBalanceIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={600} mb={0.75}>
                Aucune enveloppe configurée
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={340}>
                Créez votre première enveloppe pour commencer à organiser votre portefeuille.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onAddEnvelope}
            >
              Créer une enveloppe
            </Button>
          </Stack>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEndLocal}
        >
          <SortableContext items={envelopes.map((e) => e.id)} strategy={rectSortingStrategy}>
            <Box
              display="grid"
              sx={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
              gap={3}
            >
              {(() => {
                const portfolioTotal = envelopes.reduce((sum, e) => sum + (Number(e.currentAmount) || 0), 0);
                return envelopes.map((envelope) => (
                  <SortableCard
                    key={envelope.id}
                    envelope={envelope}
                    portfolioShare={portfolioTotal > 0 ? ((Number(envelope.currentAmount) || 0) / portfolioTotal) * 100 : undefined}
                    onEdit={() => onEditEnvelope(envelope)}
                    onDelete={() => onDeleteEnvelope(envelope.id)}
                  />
                ));
              })()}
            </Box>
          </SortableContext>

          <DragOverlay adjustScale={false} dropAnimation={{ duration: 180, easing: 'ease' }}>
            {draggingId ? (() => {
              const draggingEnvelope = envelopes.find((e) => e.id === draggingId);
              if (!draggingEnvelope) return null;
              const portfolioTotal = envelopes.reduce((sum, e) => sum + (Number(e.currentAmount) || 0), 0);
              return (
                <Box sx={{ transform: 'rotate(1.5deg)', boxShadow: '0 24px 60px rgba(0,0,0,0.55)', borderRadius: 3 }}>
                  <EnvelopeCard
                    envelope={draggingEnvelope}
                    portfolioShare={portfolioTotal > 0 ? ((Number(draggingEnvelope.currentAmount) || 0) / portfolioTotal) * 100 : undefined}
                  />
                </Box>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Graphique de répartition */}
      <Divider sx={{ mt: 8, mb: 7, borderColor: 'rgba(255,255,255,0.05)' }} />
      <Box id="repartition">
        <Typography variant="h6" fontWeight={600} display="flex" alignItems="center" gap={1} mb={2}>
          <DonutLargeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Répartition du portefeuille
        </Typography>
        <PortfolioChart envelopes={envelopes} />
      </Box>
    </Box>
  );
}
