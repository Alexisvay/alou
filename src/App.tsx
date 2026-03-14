import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import theme from './theme/theme';
import { useAuth } from './hooks/useAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

export default function App() {
  const { session, user, loading, signIn, signUp, signOut } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box minHeight="100vh" bgcolor="background.default">
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" minHeight="100vh">
            <CircularProgress />
          </Box>
        ) : session && user ? (
          <Dashboard userId={user.id} userEmail={user.email ?? ''} onSignOut={signOut} />
        ) : (
          <AuthPage onSignIn={signIn} onSignUp={signUp} />
        )}
      </Box>
    </ThemeProvider>
  );
}
