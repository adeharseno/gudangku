import { createTheme } from '@mui/material/styles';
import { brandColors } from './palette';

export const theme = createTheme({
  palette: {
    primary: {
      main: brandColors.primary,
    },
    secondary: {
      main: brandColors.secondary,
    },
    background: {
      default: brandColors.background,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    // 48px minimum touch targets for gloved warehouse operators on tablets
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48,
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          minHeight: 48,
        },
      },
    },
  },
});
