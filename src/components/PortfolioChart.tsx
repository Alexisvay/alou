import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import { type ComputedEnvelope } from '../types/envelope';
import { formatCurrency, displayAmount } from '../utils/format';

interface PortfolioChartProps {
  envelopes: ComputedEnvelope[];
}

const COLORS = ['#3D5AFE', '#00BFA5', '#FF6B6B', '#FFB547', '#A78BFA', '#38BDF8'];


interface TooltipPayloadItem {
  name: string;
  value: number;
  payload: { pct: number };
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
        {data.pct.toFixed(1)}% · {displayAmount(value)}
      </Typography>
    </Box>
  );
}

export default function PortfolioChart({ envelopes }: PortfolioChartProps) {
  const total = envelopes.reduce((sum, env) => sum + env.currentAmount, 0);

  const data = envelopes.map((env) => ({
    name: env.name,
    value: env.currentAmount,
    pct: total > 0 ? (env.currentAmount / total) * 100 : 0,
  }));

  if (total === 0) {
    return (
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
            <DonutLargeIcon fontSize="small" />
            Répartition du portefeuille
          </Typography>
          <Stack alignItems="center" spacing={1.5} textAlign="center" py={4} sx={{ opacity: 0.45 }}>
            <BarChartIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
            <Typography variant="body1" fontWeight={600} color="text.secondary">
              Graphique non disponible
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Le graphique apparaîtra après vos premiers revenus.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" display="flex" alignItems="center" gap={1} mb={2}>
          <DonutLargeIcon fontSize="small" />
          Répartition du portefeuille
        </Typography>

        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} alignItems="center" gap={6}>
          {/* Donut */}
          <Box position="relative" flexShrink={0} width={170} height={170}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={76}
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
              sx={{ transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none', width: '100%' }}
            >
              <Typography variant="h5" color="text.primary" display="block" fontWeight={700} lineHeight={1.1}>
                {formatCurrency(total)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5} sx={{ fontSize: '0.65rem', letterSpacing: '0.04em' }}>
                Patrimoine total
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
                  {total > 0 ? ((env.currentAmount / total) * 100).toFixed(1) : '0'}%
                </Typography>
                <Typography variant="body2" fontWeight={500} color="text.primary" minWidth={70} textAlign="right">
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
