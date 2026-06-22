import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Snackbar, useTheme } from 'react-native-paper';
import apiClient from '../api/client';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Alert and Snackbar states
  const [snackMsg, setSnackMsg] = useState('');
  const [snackIsError, setSnackIsError] = useState(true);
  const [showSnackbar, setShowSnackbar] = useState(false);

  const validateEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleRegister = async () => {
    // 1. Basic Validation
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setSnackMsg('Please fill in all fields.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (username.length < 3) {
      setSnackMsg('Username must be at least 3 characters.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (!validateEmail(email)) {
      setSnackMsg('Please enter a valid email address.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (password.length < 6) {
      setSnackMsg('Password must be at least 6 characters.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    if (password !== confirmPassword) {
      setSnackMsg('Passwords do not match.');
      setSnackIsError(true);
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setSnackMsg('');

    try {
      // Register request payload
      const registerPayload = {
        username: username.trim(),
        email: email.trim(),
        password: password
      };

      await apiClient.post('/api/users/register', registerPayload);

      // Success
      setSnackIsError(false);
      setSnackMsg('Registration successful! Please login.');
      setShowSnackbar(true);
      
      // Delay navigation back to Login screen to let the user see the success message
      setTimeout(() => {
        navigation.navigate('Login');
      }, 2000);
    } catch (error) {
      console.error('[Register] Error during registration:', error);
      const detail = error.response?.data?.detail || 'Registration failed. Username/Email might be taken.';
      setSnackIsError(true);
      setSnackMsg(detail);
      setShowSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: theme.colors.primary }]}>SmartNest</Text>
          <Text style={styles.subtitle}>Join Our Connected Home Ecosystem</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Create Account</Text>

          <TextInput
            label="Username"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            autoCapitalize="none"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Email Address"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon 
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                onPress={() => setShowPassword(!showPassword)}
              />
            }
            style={styles.input}
          />

          <TextInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            left={<TextInput.Icon icon="lock-check-outline" />}
            style={styles.input}
          />

          <Button 
            mode="contained" 
            onPress={handleRegister} 
            loading={loading}
            disabled={loading}
            style={styles.registerBtn}
            contentStyle={styles.btnContent}
          >
            Sign Up
          </Button>

          <View style={styles.loginPrompt}>
            <Text style={styles.promptText}>Already have an account?</Text>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Login')}
              compact
              labelStyle={styles.loginLink}
            >
              Sign In
            </Button>
          </View>
        </View>

        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={3000}
          style={{ backgroundColor: snackIsError ? theme.colors.errorContainer : '#10B981' }}
          action={{
            label: 'OK',
            textColor: snackIsError ? theme.colors.onErrorContainer : '#FFFFFF',
            onPress: () => setShowSnackbar(false),
          }}
        >
          <Text style={{ color: snackIsError ? theme.colors.onErrorContainer : '#FFFFFF' }}>
            {snackMsg}
          </Text>
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#1E293B',
  },
  registerBtn: {
    marginTop: 8,
    borderRadius: 12,
  },
  btnContent: {
    paddingVertical: 8,
  },
  loginPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  promptText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  loginLink: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
