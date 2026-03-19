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
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import type { DashboardContext } from './Dashboard';
import { formatCurrency, formatDate } from '../utils/format';

export default function RevenusPage() {
  const { incomeHistory, onDeclareIncome, onEditIncome, onDeleteIncome } =
    useOutletContext<DashboardContext>();

  return (
    <Box id="revenus">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600} display="flex" alignItems="center" gap={1}>
          <HistoryIcon fontSize="small" sx={{ color: 'text.secondary' }} />
          Historique des revenus
        </Typography>
        {incomeHistory.length > 0 && (
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={onDeclareIncome}
          >
            Déclarer un revenu
          </Button>
        )}
      </Box>

      {incomeHistory.length === 0 ? (
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
              <HistoryIcon sx={{ fontSize: 22, color: 'text.secondary' }} />
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={600} mb={0.75}>
                Aucun revenu enregistré
              </Typography>
              <Typography variant="body2" color="text.secondary" maxWidth={340}>
                Déclarez votre premier revenu pour voir comment il se répartit dans vos enveloppes.
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onDeclareIncome}
            >
              Déclarer un revenu
            </Button>
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ px: 0, py: 0, overflow: 'hidden' }}>
          <Stack divider={<Divider />} spacing={0}>
            {incomeHistory.map((entry) => (
              <Box key={entry.id} px={2.5} py={2.25}>

                {/* Entry header: amount + date + actions */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="text.primary">
                      {formatCurrency(entry.amount)}
                    </Typography>
                    <Typography variant="caption" color="text.disabled" display="block" mt={0.25}>
                      {formatDate(entry.date)}
                    </Typography>
                    {entry.isManualAllocation && (
                      <Box
                        display="inline-flex"
                        alignItems="center"
                        gap={0.5}
                        mt={0.75}
                        sx={{
                          px: 0.875,
                          py: 0.25,
                          borderRadius: '5px',
                          bgcolor: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                        }}
                      >
                        <TuneRoundedIcon sx={{ fontSize: 10, color: 'text.secondary' }} />
                        <Typography
                          variant="caption"
                          sx={{ fontSize: '0.67rem', color: 'text.secondary', lineHeight: 1, fontWeight: 500 }}
                        >
                          Répartition personnalisée
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  <Box display="flex" gap={0.25} flexShrink={0} mt={-0.25}>
                    <Tooltip title="Modifier">
                      <IconButton
                        size="small"
                        onClick={() => onEditIncome(entry)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(198, 161, 91, 0.12)' } }}
                      >
                        <EditIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        onClick={() => onDeleteIncome(entry.id)}
                        sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(211, 47, 47, 0.08)' } }}
                      >
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {/* Allocation breakdown */}
                {entry.allocations.length > 0 && (
                  <Box
                    mt={1.5}
                    sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
                  >
                    {[...entry.allocations]
                      .sort((a, b) => b.allocatedAmount - a.allocatedAmount)
                      .map(({ envelope, allocatedAmount }) => (
                        <Box
                          key={envelope.id}
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          pt={1}
                        >
                          <Typography variant="caption" color="text.secondary">
                            {envelope.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight={600}
                            color="text.primary"
                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {formatCurrency(allocatedAmount)}
                          </Typography>
                        </Box>
                      ))}
                  </Box>
                )}

              </Box>
            ))}
          </Stack>
        </Paper>
      )}

      {/* FAB — Déclarer un revenu */}
      <Tooltip title="Déclarer un revenu" placement="left">
        <Fab
          color="primary"
          aria-label="Déclarer un revenu"
          onClick={onDeclareIncome}
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1000,
            '&:hover': {
              boxShadow: '0px 6px 28px rgba(0, 0, 0, 0.4)',
              bgcolor: 'primary.light',
            },
          }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
}
