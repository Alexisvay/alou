import {
  Drawer,
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { type AssetRow } from './EnvelopeDialog';

interface AssetManagementDrawerProps {
  open: boolean;
  onClose: () => void;
  assetRows: AssetRow[];
  onUpdate: (rows: AssetRow[]) => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);

function emptyAssetRow(): AssetRow {
  return { name: '', unitPrice: '', quantity: '', isFractional: false };
}

export default function AssetManagementDrawer({
  open,
  onClose,
  assetRows,
  onUpdate,
}: AssetManagementDrawerProps) {
  const updateRow = (index: number, updates: Partial<AssetRow>) => {
    onUpdate(
      assetRows.map((row, i) => (i === index ? { ...row, ...updates } : row)),
    );
  };

  const addAsset = () => {
    onUpdate([...assetRows, emptyAssetRow()]);
  };

  const removeAsset = (index: number) => {
    onUpdate(assetRows.filter((_, i) => i !== index));
  };

  const totalValue = assetRows.reduce((sum, row) => {
    const up = parseFloat(row.unitPrice);
    const qty = parseFloat(row.quantity);
    return sum + (up > 0 && qty > 0 ? up * qty : 0);
  }, 0);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100%', sm: 380 },
            bgcolor: 'background.paper',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
          },
        },
      }}
    >
      <Box sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={700}>
            Actifs liés
          </Typography>
        </Box>

        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: 1.5,
            mb: 2,
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Typography variant="caption" color="text.disabled" display="block" mb={0.5}>
            Valeur totale des actifs
          </Typography>
          <Typography variant="body1" fontWeight={700} sx={{ color: 'primary.main', fontVariantNumeric: 'tabular-nums' }}>
            {formatPrice(totalValue)}
          </Typography>
        </Box>

        <Stack spacing={1.5} sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {assetRows.map((row, idx) => {
            const rowValue =
              parseFloat(row.unitPrice) > 0 && parseFloat(row.quantity) > 0
                ? parseFloat(row.unitPrice) * parseFloat(row.quantity)
                : null;
            return (
              <Box
                key={row.id ?? `new-${idx}`}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1} mb={1}>
                  <TextField
                    label="Nom"
                    size="small"
                    fullWidth
                    value={row.name}
                    onChange={(e) => updateRow(idx, { name: e.target.value })}
                    placeholder="ex: iShares Core S&P 500"
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeAsset(idx)}
                    sx={{ color: 'text.disabled', flexShrink: 0, mt: 0.5, '&:hover': { color: 'error.main' } }}
                    aria-label="Supprimer l'actif"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    label="Prix unit. (€)"
                    type="number"
                    size="small"
                    value={row.unitPrice}
                    onChange={(e) => updateRow(idx, { unitPrice: e.target.value })}
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="Quantité"
                    type="number"
                    size="small"
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                    inputProps={{ min: 0, step: 0.001 }}
                    sx={{ flex: 1 }}
                  />
                  <FormControlLabel
                    sx={{ flexShrink: 0, mr: 0 }}
                    control={
                      <Switch
                        size="small"
                        checked={row.isFractional}
                        onChange={(e) => updateRow(idx, { isFractional: e.target.checked })}
                      />
                    }
                    label={<Typography variant="caption" color="text.secondary">Fract.</Typography>}
                  />
                </Stack>
                {rowValue !== null && (
                  <Typography variant="caption" color="text.disabled" display="block" mt={1}>
                    Valeur : {formatPrice(rowValue)}
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>

        <Button
          size="small"
          color="inherit"
          onClick={addAsset}
          fullWidth
          sx={{
            mt: 2,
            py: 1,
            fontSize: '0.8rem',
            color: 'text.secondary',
            border: '1px dashed rgba(255,255,255,0.2)',
            '&:hover': { color: 'primary.main', borderColor: 'rgba(198, 161, 91, 0.4)', bgcolor: 'rgba(198, 161, 91, 0.06)' },
          }}
        >
          + Ajouter un actif
        </Button>
      </Box>
    </Drawer>
  );
}
