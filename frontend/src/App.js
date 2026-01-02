import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  useMediaQuery,
  Container,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Receipt as TransactionsIcon,
  Flag as GoalsIcon,
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  AccountBalance,
  TrendingUp,
  Settings as SettingsIconMui,
  KeyboardArrowDown,
  PieChart as PieChartIcon,
} from '@mui/icons-material';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Goals from './components/Goals';
import Settings from './components/Settings';
import Holdings from './components/Holdings';

const drawerWidth = 0; // Drawer removed

// Professional banking theme inspired by ABN-AMRO
const createAppTheme = (mode) => createTheme({
  palette: {
    mode,
    primary: {
      main: '#F58220', // ICICI Orange
      light: '#F89C4C',
      dark: '#D96D12',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#85291F', // Deep Red/Brown
      light: '#A64D42',
      dark: '#5C1D16',
    },
    success: {
      main: '#4caf50',
    },
    error: {
      main: '#f44336',
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#f5f7fa',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#ffffff' : '#2c3e50',
      secondary: mode === 'dark' ? '#b0b0b0' : '#5a6c7d',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.2,
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: mode === 'dark'
            ? '0 2px 8px rgba(0,0,0,0.4)'
            : '0 2px 8px rgba(0,0,0,0.08)',
          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: mode === 'dark'
              ? '0 4px 16px rgba(0,0,0,0.5)'
              : '0 4px 16px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.9375rem',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});



const ASSET_CLASSES = [
  'Equity',
  'Mutual Funds',
  'PPF',
  'Gold',
  'Bonds',
  'Real Estate',
  'NPS Tier I',
];

function AppContent() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [darkMode, setDarkMode] = useState(prefersDarkMode);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Update theme with new navigation styles
  const theme = React.useMemo(() => {
    const baseTheme = createAppTheme(darkMode ? 'dark' : 'light');
    return createTheme(baseTheme, {
      components: {
        ...baseTheme.components,
        MuiAppBar: {
          styleOverrides: {
            root: {
              background: 'linear-gradient(90deg, #F58220 0%, #F89C4C 100%)', // Orange Gradient
              borderBottom: 'none',
              boxShadow: '0 2px 10px rgba(245, 130, 32, 0.25)',
              color: '#ffffff', // White text
            },
          },
        },
      },
    });
  }, [darkMode]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };


  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Holdings', icon: <PieChartIcon />, path: '/holdings' },
    { text: 'Transactions', icon: <TransactionsIcon />, path: '/transactions' },
    { text: 'Goals', icon: <GoalsIcon />, path: '/goals' },
    { text: 'Settings', icon: <SettingsIconMui />, path: '/settings' },
  ];

  const NavButton = ({ item }) => {
    const isActive = location.pathname === item.path || (item.children && location.pathname === item.path);
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
      if (item.children) {
        setAnchorEl(event.currentTarget);
      }
    };

    const handleClose = () => {
      setAnchorEl(null);
    };

    const content = (
      <Box
        onClick={item.children ? handleClick : undefined}
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          mx: 0.5,
          borderRadius: 2,
          cursor: item.children ? 'pointer' : 'default',
          color: isActive ? '#85291F' : 'rgba(0, 0, 0, 0.75)', // Active: Deep Red, Inactive: Dark Grey
          backgroundColor: isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent', // White tint on orange bg? No, this is inside AppBar? 
          // WAIT: The NavButton is inside the Toolbar which now has an Orange Gradient Background.
          // So the text should be WHITE.
          // Let's re-think. If AppBar is Orange, text is White.
          // Active state could be a White Box with Orange Text OR just White Text with Underline.
          // The previous design had NavButtons on a white/transparent bar.
          // If we make AppBar Orange, NavButtons are ON Orange.

          color: '#ffffff', // Always white on orange header
          backgroundColor: isActive ? 'rgba(133, 41, 31, 0.2)' : 'transparent', // Darker Red tint for active
          borderRadius: 4,
          fontWeight: isActive ? 700 : 500,

          transition: 'all 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            color: '#ffffff',
          },
        }}
      >
        {React.cloneElement(item.icon, { sx: { fontSize: 20, mr: 1 } })}
        <Typography variant="body2" fontWeight={isActive ? 700 : 500}>
          {item.text}
        </Typography>
        {item.children && <KeyboardArrowDown sx={{ fontSize: 16, ml: 0.5 }} />}
      </Box>
    );

    if (item.children) {
      return (
        <React.Fragment>
          {content}
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 180,
                boxShadow: theme.shadows[3],
                bgcolor: darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
              }
            }}
          >
            {item.children.map((child) => (
              <MenuItem
                key={child.text}
                onClick={handleClose}
                component={Link}
                to={child.path}
                sx={{ fontSize: '0.875rem' }}
              >
                {child.text}
              </MenuItem>
            ))}
          </Menu>
        </React.Fragment>
      );
    }

    return (
      <Link to={item.path} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Top Navigation Bar */}
        <AppBar position="sticky">
          <Container maxWidth="xl">
            <Toolbar disableGutters sx={{ height: 70 }}>
              {/* Logo */}
              <Box display="flex" alignItems="center" gap={1.5} sx={{ mr: 4 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 3,
                    background: '#ffffff', // White bg for logo icon
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  <AccountBalance sx={{ fontSize: 24, color: '#F58220' }} />
                </Box>
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1, letterSpacing: '-0.5px' }}>
                    WealthHub
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', fontWeight: 500 }}>
                    PORTFOLIO MANAGER
                  </Typography>
                </Box>
              </Box>

              {/* Desktop Navigation */}
              <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
                {menuItems.map((item) => (
                  <NavButton key={item.text} item={item} />
                ))}
              </Box>

              {/* Spacer for mobile */}
              <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }} />

              {/* Theme Toggle & Mobile Menu */}
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton
                  onClick={() => setDarkMode(!darkMode)}
                  sx={{
                    color: 'inherit',
                    border: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: 3,
                    padding: '8px',
                  }}
                >
                  {darkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
                </IconButton>

                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="end"
                  onClick={handleDrawerToggle}
                  sx={{ display: { md: 'none' }, ml: 1 }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            </Toolbar>
          </Container>
        </AppBar>

        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          anchor="right"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280 },
          }}
        >
          <Box sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" fontWeight="bold">Menu</Typography>
            <IconButton onClick={handleDrawerToggle} size="small">
              <MenuIcon />
            </IconButton>
          </Box>
          <Divider />
          <List sx={{ px: 2 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                  <ListItemButton
                    component={Link}
                    to={item.path}
                    onClick={handleDrawerToggle}
                    selected={isActive}
                    sx={{
                      borderRadius: 2,
                      '&.Mui-selected': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': { backgroundColor: 'primary.dark' },
                        '& .MuiListItemIcon-root': { color: 'white' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40, color: isActive ? 'inherit' : 'text.secondary' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: 600 }} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </Drawer>

        {/* Main Content */}
        <Box component="main" sx={{ flexGrow: 1, py: 4 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/holdings" element={<Holdings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Box>
      </Box>
    </ThemeProvider >
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
