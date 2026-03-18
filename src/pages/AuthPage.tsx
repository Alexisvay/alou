import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  Tab,
  Tabs,
} from '@mui/material';

interface AuthPageProps {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<string | null>;
}

export default function AuthPage({ onSignIn, onSignUp }: AuthPageProps) {
  const [tab, setTab] = useState<0 | 1>(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, value: 0 | 1) => {
    setTab(value);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);

    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    const err = tab === 0 ? await onSignIn(email, password) : await onSignUp(email, password);
    setLoading(false);

    if (err) {
      setError(err);
    } else if (tab === 1) {
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.');
    }
  };

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Box width="100%" maxWidth={400}>
        {/* Brand */}
        <Box textAlign="center" mb={4}>
          <Box
            component="img"
            src="/logo-alou.png"
            alt="Alou"
            sx={{
              width: 48,
              height: 48,
              objectFit: 'contain',
              display: 'block',
              mx: 'auto',
              mb: 2,
            }}
          />
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Alou
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Gérez vos enveloppes d'investissement
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab label="Connexion" />
            <Tab label="Inscription" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <TextField
            label="Email"
            type="email"
            fullWidth
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Mot de passe"
            type="password"
            fullWidth
            autoComplete={tab === 0 ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            sx={{ mb: 3 }}
          />

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Chargement…' : tab === 0 ? 'Se connecter' : "S'inscrire"}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
