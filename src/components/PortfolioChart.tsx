import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { Box, Card, CardContent, Typography, Stack } from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import { type ComputedEnvelope } from '../types/envelope';
import { formatCurrency, displayAmount } from '../utils/format';

interface PortfolioChartProps {
  envelopes: ComputedEnvelope[];
}

const COLORS = ['#C6A15B', '#22C55E', '#64748B', '#94A3B8', '#A78BFA', '#06B6D4'];

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
        boxShadow: '0px 8px 24px rgba(0,0,0,0.5)',
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
          <Stack alignItems="center" spacing={1.5} textAlign="center" py={4} sx={{ opacity: 0.4 }}>
            <BarChartIcon sx={{ fontSize: 36, color: 'text.secondary' }} />
            <Typography variant="body2" fontWeight={600} color="text.secondary">
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
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'center', sm: 'center' }}
          gap={{ xs: 4, sm: 4 }}
        >
          {/* Col 1 — Donut */}
          <Box position="relative" flexShrink={0} width={144} height={144}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={66}
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

            {/* Center label */}
            <Box
              position="absolute"
              top="50%"
              left="50%"
              sx={{
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none',
                width: '100%',
              }}
            >
              <Typography variant="h5" color="primary.main" display="block" lineHeight={1.1}>
                {formatCurrency(total)}
              </Typography>
              <Typography
                display="block"
                mt={0.5}
                sx={{
                  fontSize: '0.6rem',
                  lineHeight: 1.3,
                  color: 'text.disabled',
                  letterSpacing: '0.01em',
                }}
              >
                Patrimoine total
              </Typography>
            </Box>
          </Box>

          {/* Col 2+3 — Name | Amount / % */}
          <Box flex={1} width="100%">
            {envelopes.map((env, index) => {
              const pct = total > 0 ? ((env.currentAmount / total) * 100).toFixed(1) : '0';
              return (
                <Box
                  key={env.id}
                  display="flex"
                  alignItems="center"
                  gap={1.5}
                  py={1.125}
                  sx={{
                    borderBottom: index < envelopes.length - 1
                      ? '1px solid rgba(255, 255, 255, 0.05)'
                      : 'none',
                  }}
                >
                  {/* Color dot */}
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      bgcolor: COLORS[index % COLORS.length],
                      flexShrink: 0,
                    }}
                  />

                  {/* Name */}
                  <Typography variant="body2" color="text.primary" flex={1}>
                    {env.name}
                  </Typography>

                  {/* Amount + percentage stacked */}
                  <Box textAlign="right" flexShrink={0}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="text.primary"
                      lineHeight={1.25}
                      display="block"
                    >
                      {displayAmount(env.currentAmount)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      lineHeight={1.25}
                      display="block"
                    >
                      {pct}%
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
