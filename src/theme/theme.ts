import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4D6BFF',
      light: '#8A9EFF',
      dark: '#2C47D9',
    },
    secondary: {
      main: '#00BFA5',
    },
    background: {
      default: '#0D1117',
      paper: '#1C2230',
    },
    text: {
      primary: '#E8EEFF',
      secondary: '#8892B0',
    },
    divider: 'rgba(255, 255, 255, 0.08)',
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
    // Number XL — dashboard totals
    h3: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-1px',
      lineHeight: 1,
    },
    // Number L — envelope card amounts
    h4: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.5px',
      lineHeight: 1.1,
    },
    // Number M — chart center, allocation amounts
    h5: {
      fontSize: '1.125rem',
      fontWeight: 500,
      letterSpacing: '-0.25px',
      lineHeight: 1.2,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          paddingLeft: 20,
          paddingRight: 20,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.06)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
