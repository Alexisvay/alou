import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import theme from './theme/theme';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box minHeight="100vh" bgcolor="background.default">
        <Dashboard />
      </Box>
    </ThemeProvider>
  );
}