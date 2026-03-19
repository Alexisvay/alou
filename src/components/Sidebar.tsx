import { NavLink } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HistoryIcon from '@mui/icons-material/History';

export const SIDEBAR_WIDTH = 220;

const navItems = [
  { to: '/vue-densemble', label: "Vue d'ensemble", Icon: GridViewRoundedIcon },
  { to: '/portefeuille', label: 'Portefeuille', Icon: AccountBalanceIcon },
  { to: '/revenus', label: 'Revenus', Icon: HistoryIcon },
];

export default function Sidebar() {
  return (
    <Box
      component="nav"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: SIDEBAR_WIDTH,
        height: '100vh',
        bgcolor: 'background.default',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1200,
        pt: 2.5,
        pb: 3,
      }}
    >
      {/* Brand */}
      <Box px={2.5} mb={4} display="flex" alignItems="center" gap={1.5}>
        <Box
          component="img"
          src="/favicon.svg"
          alt="Alou"
          sx={{ width: 30, height: 30, objectFit: 'contain' }}
        />
        <Typography variant="h6" fontWeight={700} color="text.primary" letterSpacing="-0.02em">
          Alou
        </Typography>
      </Box>

      {/* Nav items */}
      <List dense sx={{ px: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {navItems.map(({ to, label, Icon }) => (
          <ListItem key={to} disablePadding>
            <NavLink to={to} style={{ width: '100%', textDecoration: 'none' }}>
              {({ isActive }) => (
                <ListItemButton
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 1.5,
                    bgcolor: isActive ? 'rgba(198, 161, 91, 0.1)' : 'transparent',
                    transition: 'background 0.15s ease',
                    '&:hover': {
                      bgcolor: isActive ? 'rgba(198, 161, 91, 0.14)' : 'rgba(255,255,255,0.05)',
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{ minWidth: 34, color: isActive ? 'primary.main' : 'text.secondary' }}
                  >
                    <Icon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{
                      variant: 'body2',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? 'primary.main' : 'text.primary',
                    }}
                  />
                </ListItemButton>
              )}
            </NavLink>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
