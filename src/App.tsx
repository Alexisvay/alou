import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import theme from './theme/theme';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import DashboardPage from './pages/DashboardPage';
import PortefeuillePage from './pages/PortefeuillePage';
import RevenusPage from './pages/RevenusPage';
import AppShell from './components/AppShell';

export default function App() {
  const { session, user, loading, signIn, signUp, signOut } = useAuth();

  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box minHeight="100vh" bgcolor="background.default">
          {loading ? (
            <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
              <CircularProgress />
            </Box>
          ) : session && user ? (
            <Routes>
              <Route path="/" element={<Navigate to="/vue-densemble" replace />} />
              {/* Legacy redirects */}
              <Route path="/dashboard" element={<Navigate to="/vue-densemble" replace />} />
              <Route path="/enveloppes" element={<Navigate to="/portefeuille" replace />} />
              <Route
                element={
                  <AppShell>
                    <Dashboard userId={user.id} userEmail={user.email ?? ''} onSignOut={signOut} />
                  </AppShell>
                }
              >
                <Route path="vue-densemble" element={<DashboardPage />} />
                <Route path="portefeuille" element={<PortefeuillePage />} />
                <Route path="revenus" element={<RevenusPage />} />
                <Route path="*" element={<Navigate to="/vue-densemble" replace />} />
              </Route>
            </Routes>
          ) : (
            <AuthPage onSignIn={signIn} onSignUp={signUp} />
          )}
        </Box>
      </ThemeProvider>
    </BrowserRouter>
  );
}
