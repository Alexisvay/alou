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
    divider: 'rgba(255, 255, 255, 0.07)',
  },
  typography: {
    fontFamily: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
    // Number XL — dashboard totals
    h3: {
      fontSize: '2.25rem',
      fontWeight: 700,
      letterSpacing: '-0.75px',
      lineHeight: 1,
    },
    // Number L — envelope card amounts
    h4: {
      fontSize: '1.625rem',
      fontWeight: 600,
      letterSpacing: '-0.5px',
      lineHeight: 1.1,
    },
    // Number M — chart center, allocation amounts
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.25px',
      lineHeight: 1.2,
    },
    // Section titles
    h6: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      letterSpacing: '-0.1px',
    },
    body1: {
      lineHeight: 1.6,
    },
    body2: {
      lineHeight: 1.5,
    },
    caption: {
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.35)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          letterSpacing: '-0.1px',
          borderRadius: 10,
          paddingLeft: 18,
          paddingRight: 18,
        },
        sizeSmall: {
          paddingLeft: 14,
          paddingRight: 14,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(77, 107, 255, 0.35)',
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
          borderRadius: 18,
          border: '1px solid rgba(255, 255, 255, 0.07)',
          boxShadow: '0px 24px 64px rgba(0, 0, 0, 0.6)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.0625rem',
          fontWeight: 700,
          letterSpacing: '-0.2px',
          padding: '24px 24px 8px',
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '16px 24px',
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '12px 24px 20px',
          gap: 8,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255, 255, 255, 0.07)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default theme;
