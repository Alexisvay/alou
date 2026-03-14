import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import { type ComputedEnvelope } from '../types/envelope';

interface PortfolioChartProps {
  envelopes: ComputedEnvelope[];
}

const COLORS = ['#3D5AFE', '#00BFA5', '#FF6B6B', '#FFB547', '#A78BFA', '#38BDF8'];

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

interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { currentAmount: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: data } = payload[0];
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        px: 2,
        py: 1.5,
        boxShadow: '0px 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      <Typography variant="body2" fontWeight={600} color="text.primary">
        {name}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {value}% · {displayAmount(data.currentAmount)}
      </Typography>
    </Box>
  );
}

export default function PortfolioChart({ envelopes }: PortfolioChartProps) {
  const data = envelopes.map((env) => ({
    name: env.name,
    value: env.allocationPercentage,
    currentAmount: env.currentAmount,
  }));

  const total = envelopes.reduce((sum, env) => sum + env.currentAmount, 0);

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} mb={3}>
          Répartition du portefeuille
        </Typography>

        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={4}>
          {/* Donut */}
          <Box position="relative" flexShrink={0} width={200} height={200}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Total au centre */}
            <Box
              position="absolute"
              top="50%"
              left="50%"
              sx={{ transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}
            >
              <Typography variant="caption" color="text.secondary" display="block">
                Total
              </Typography>
              <Typography variant="body1" fontWeight={700} color="text.primary" lineHeight={1.2}>
                {formatCurrency(total)}
              </Typography>
            </Box>
          </Box>

          {/* Légende */}
          <Stack spacing={1.5} flex={1} width="100%">
            {envelopes.map((env, index) => (
              <Box key={env.id} display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: COLORS[index % COLORS.length],
                    flexShrink: 0,
                  }}
                />
                <Typography variant="body2" color="text.primary" flex={1}>
                  {env.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  {env.allocationPercentage}%
                </Typography>
                <Typography variant="body2" fontWeight={600} color="text.primary" minWidth={70} textAlign="right">
                  {displayAmount(env.currentAmount)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
