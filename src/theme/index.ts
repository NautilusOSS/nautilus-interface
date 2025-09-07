import { createTheme } from '@mui/material/styles';

export const createAppTheme = (isDarkMode: boolean) => createTheme({
  palette: {
    mode: isDarkMode ? 'dark' : 'light',
    background: {
      default: isDarkMode ? '#161717' : '#FFFFFF',
      paper: isDarkMode ? 'rgba(40, 40, 40, 0.85)' : 'rgba(255, 255, 255, 0.95)',
    },
    text: {
      primary: isDarkMode ? '#fff' : '#000',
      secondary: isDarkMode ? '#ccc' : '#666',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: isDarkMode ? '#161717' : '#FFFFFF',
          color: isDarkMode ? '#fff' : '#000',
        },
      },
    },
  },
});

// Keep the old export for backward compatibility
export const theme = createAppTheme(false); 