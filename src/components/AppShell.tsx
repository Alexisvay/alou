import { Box } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar />
      <Box component="main" sx={{ ml: `${SIDEBAR_WIDTH}px`, flex: 1 }}>
        {children}
      </Box>
    </Box>
  );
}
