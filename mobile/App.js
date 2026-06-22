import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';

// Custom Material Design 3 Dark Theme for a premium Slate/Indigo/Teal aesthetic
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#6366F1',        // Vibrant Indigo
    secondary: '#14B8A6',      // Premium Teal
    background: '#0F172A',     // Slate Dark Background
    surface: '#1E293B',        // Slate Card Surface
    onSurface: '#F8FAFC',      // Clean Off-White text
    onSurfaceVariant: '#94A3B8', // Muted slate gray text
    outline: '#475569',        // Border outline
    outlineVariant: '#334155',  // Divider line color
    error: '#EF4444',          // Vibrant red for deletion/errors
    errorContainer: '#7F1D1D', // Dark red background for errors
    onErrorContainer: '#FCA5A5', // Soft red text
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: '#1E293B',       // Card surface level 1
      level2: '#334155',       // Active list item overlay level 2
    }
  },
};

export default function App() {
  return (
    <PaperProvider theme={theme}>
      {/* Light status bar icons for dark background */}
      <StatusBar style="light" backgroundColor="#0F172A" />
      <AppNavigator />
    </PaperProvider>
  );
}
