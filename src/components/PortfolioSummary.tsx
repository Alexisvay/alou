import { Box, Paper, Typography, Stack, Divider } from '@mui/material';
import { type ComputedEnvelope } from '../types/envelope';
import { formatCurrency } from '../utils/format';

interface PortfolioSummaryProps {
  envelopes: ComputedEnvelope[];
}

export default function PortfolioSummary({ envelopes }: PortfolioSummaryProps) {
  const totalCurrent = envelopes.reduce((sum, e) => sum + (Number(e.currentAmount) || 0), 0);
  const totalTarget = envelopes.reduce((sum, e) => sum + (Number(e.targetAmount) || 0), 0);
  const progress = totalTarget > 0 ? Math.min((totalCurrent / totalTarget) * 100, 100) : 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        px: { xs: 3, sm: 5 },
        py: { xs: 3, sm: 4 },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        divider={<Divider orientation="vertical" flexItem />}
        spacing={{ xs: 3, sm: 0 }}
      >
        <Block
          label="Patrimoine total"
          value={formatCurrency(totalCurrent)}
          valueColor="primary.main"
          flex={2}
        />
        <Block
          label="Objectif total"
          value={formatCurrency(totalTarget)}
          flex={2}
        />
        <Block
          label="Progression globale"
          value={`${progress.toFixed(1)} %`}
          valueColor={progress >= 100 ? 'success.main' : 'text.primary'}
          flex={1}
        />
      </Stack>
    </Paper>
  );
}

interface BlockProps {
  label: string;
  value: string;
  valueColor?: string;
  flex?: number;
}

function Block({ label, value, valueColor = 'text.primary', flex = 1 }: BlockProps) {
  return (
    <Box
      flex={flex}
      px={{ xs: 0, sm: 4 }}
      sx={{ '&:first-of-type': { pl: 0 }, '&:last-of-type': { pr: 0 } }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.65rem' }}
        display="block"
        mb={1.5}
      >
        {label}
      </Typography>
      <Typography variant="h3" color={valueColor}>
        {value}
      </Typography>
    </Box>
  );
}
