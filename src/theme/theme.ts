import { createTheme } from '@mui/material/styles';

const SURFACE = '#1A2132';
const BORDER   = 'rgba(255, 255, 255, 0.08)';
const INSET    = 'inset 0px 1px 0px rgba(255, 255, 255, 0.06)';

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
      fontVariantNumeric: 'tabular-nums',
    },
    // Number L — envelope card amounts
    h4: {
      fontSize: '1.625rem',
      fontWeight: 600,
      letterSpacing: '-0.5px',
      lineHeight: 1.1,
      fontVariantNumeric: 'tabular-nums',
    },
    // Number M — chart center, allocation amounts
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      letterSpacing: '-0.25px',
      lineHeight: 1.2,
      fontVariantNumeric: 'tabular-nums',
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
    borderRadius: 16,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: SURFACE,
          border: `1px solid ${BORDER}`,
          boxShadow: [`0px 2px 16px rgba(0, 0, 0, 0.4)`, INSET].join(', '),
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.13)',
            boxShadow: [
              '0px 6px 24px rgba(0, 0, 0, 0.45)',
              'inset 0px 1px 0px rgba(255, 255, 255, 0.09)',
            ].join(', '),
          },
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
        sizeMedium: {
          paddingTop: 8,
          paddingBottom: 8,
        },
        sizeSmall: {
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 14,
          paddingRight: 14,
        },
        sizeLarge: {
          paddingTop: 11,
          paddingBottom: 11,
          paddingLeft: 24,
          paddingRight: 24,
        },
        contained: {
          boxShadow: '0px 1px 8px rgba(0, 0, 0, 0.3)',
          '&:hover': {
            boxShadow: '0px 3px 14px rgba(0, 0, 0, 0.35)',
          },
          '&:active': {
            boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.3)',
          },
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
          backgroundColor: SURFACE,
          borderColor: BORDER,
          boxShadow: [
            '0px 2px 16px rgba(0, 0, 0, 0.35)',
            'inset 0px 1px 0px rgba(255, 255, 255, 0.05)',
          ].join(', '),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: SURFACE,
          borderRadius: 20,
          border: `1px solid ${BORDER}`,
          boxShadow: [
            '0px 24px 64px rgba(0, 0, 0, 0.6)',
            'inset 0px 1px 0px rgba(255, 255, 255, 0.06)',
          ].join(', '),
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
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.12)',
            transition: 'border-color 0.2s ease',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.22)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(77, 107, 255, 0.7)',
            borderWidth: '1px',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: 'rgba(138, 158, 255, 0.9)',
          },
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
          transition: 'color 0.15s ease, background-color 0.15s ease',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.75rem',
          fontWeight: 500,
          backgroundColor: 'rgba(15, 20, 35, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
        },
        arrow: {
          color: 'rgba(15, 20, 35, 0.95)',
        },
      },
    },
  },
});

export default theme;
