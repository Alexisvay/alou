import { createTheme } from '@mui/material/styles';

// ── Shared surface system (neutral dark gray, no blue tint) ───────────────────
export const SURFACE_MAIN = '#0E0E10';
export const SURFACE_PRIMARY = '#17171A';
export const SURFACE_SECONDARY = '#1E1E22';
export const SURFACE_BORDER = 'rgba(255, 255, 255, 0.08)';
export const SURFACE_BORDER_HOVER = 'rgba(255, 255, 255, 0.12)';
export const SURFACE_SHADOW = '0px 2px 16px rgba(0, 0, 0, 0.4)';
export const SURFACE_SHADOW_HOVER = '0px 6px 24px rgba(0, 0, 0, 0.45)';
export const SURFACE_INSET = 'inset 0px 1px 0px rgba(255, 255, 255, 0.06)';

export const GOLD_GRADIENT = 'linear-gradient(135deg, #C6A15B, #E6C97A, #B8924A)';
export const GOLD_GRADIENT_HOVER = 'linear-gradient(135deg, #D4B86A, #E8D090, #C6A15B)';

const GOLD_MAIN = '#C6A15B';
const GOLD_LIGHT = '#E6C97A';
const GOLD_DARK = '#B8924A';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: GOLD_MAIN,
      light: GOLD_LIGHT,
      dark: GOLD_DARK,
    },
    secondary: {
      main: '#00BFA5',
    },
    info: {
      main: GOLD_MAIN,
      light: GOLD_LIGHT,
      dark: GOLD_DARK,
    },
    success: {
      main: '#22C55E',
      light: '#4ADE80',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
    },
    background: {
      default: SURFACE_MAIN,
      paper: SURFACE_PRIMARY,
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#94A3B8',
      disabled: '#64748B',
    },
    divider: 'rgba(255, 255, 255, 0.07)',
  },
  typography: {
    fontFamily: '"Satoshi", "Inter", "Helvetica Neue", Arial, sans-serif',
    // Number XL — KPI totals, main amounts
    h3: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
    },
    // Number L — envelope card amounts
    h4: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.1,
      fontVariantNumeric: 'tabular-nums',
    },
    // Number M — chart center, allocation amounts
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
      fontVariantNumeric: 'tabular-nums',
    },
    // Section titles, envelope names
    h6: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.9375rem',
      fontWeight: 400,
      lineHeight: 1.55,
    },
    caption: {
      fontSize: '0.8125rem',
      fontWeight: 400,
      lineHeight: 1.45,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          '& *:focus-visible': {
            outline: `2px solid ${GOLD_MAIN}`,
            outlineOffset: 2,
          },
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: SURFACE_PRIMARY,
          border: `1px solid ${SURFACE_BORDER}`,
          boxShadow: [SURFACE_SHADOW, SURFACE_INSET].join(', '),
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            borderColor: SURFACE_BORDER_HOVER,
            boxShadow: [SURFACE_SHADOW_HOVER, SURFACE_INSET].join(', '),
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
          '&:hover': { boxShadow: '0px 3px 14px rgba(0, 0, 0, 0.35)' },
          '&:active': { boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.3)' },
        },
        containedPrimary: {
          background: GOLD_GRADIENT,
          color: '#0D1117',
          '&:hover': { background: GOLD_GRADIENT_HOVER },
        },
        text: {
          '&:hover': { backgroundColor: 'rgba(198, 161, 91, 0.08)' },
        },
        outlined: {
          '&:hover': {
            borderColor: 'rgba(198, 161, 91, 0.6)',
            backgroundColor: 'rgba(198, 161, 91, 0.08)',
          },
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.4)',
        },
        primary: {
          background: GOLD_GRADIENT,
          color: '#0D1117',
          '&:hover': { background: GOLD_GRADIENT_HOVER },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          backgroundColor: SURFACE_PRIMARY,
          border: `1px solid ${SURFACE_BORDER}`,
          boxShadow: [SURFACE_SHADOW, SURFACE_INSET].join(', '),
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          backgroundColor: SURFACE_SECONDARY,
          borderRadius: 20,
          border: `1px solid ${SURFACE_BORDER}`,
          boxShadow: [
            '0px 24px 64px rgba(0, 0, 0, 0.6)',
            SURFACE_INSET,
          ].join(', '),
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
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
            borderColor: 'rgba(198, 161, 91, 0.7)',
            borderWidth: '1px',
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.9375rem',
          fontWeight: 500,
          '&.Mui-focused': {
            color: 'rgba(230, 201, 122, 0.95)',
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
    MuiSwitch: {
      styleOverrides: {
        root: {
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: GOLD_MAIN,
            '& + .MuiSwitch-track': {
              backgroundColor: 'rgba(198, 161, 91, 0.5)',
            },
          },
          '& .MuiSwitch-switchBase.Mui-checked:hover': {
            '& + .MuiSwitch-track': {
              backgroundColor: 'rgba(198, 161, 91, 0.6)',
            },
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: GOLD_MAIN,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            color: GOLD_LIGHT,
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(198, 161, 91, 0.08)',
          },
          '&.Mui-focusVisible': {
            backgroundColor: 'rgba(198, 161, 91, 0.12)',
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: GOLD_MAIN,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        bar: {
          backgroundColor: GOLD_MAIN,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          fontSize: '0.8125rem',
          fontWeight: 500,
          backgroundColor: SURFACE_SECONDARY,
          border: `1px solid ${SURFACE_BORDER}`,
          borderRadius: 8,
          backdropFilter: 'blur(8px)',
        },
        arrow: {
          color: SURFACE_SECONDARY,
        },
      },
    },
  },
});

export default theme;
