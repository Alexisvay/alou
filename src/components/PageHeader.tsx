import { Box, Typography } from '@mui/material';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <Box mb={4}>
      <Typography variant="h4" color="text.primary">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="text.secondary" mt={0.5}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}