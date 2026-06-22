import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, HelperText, Snackbar, useTheme } from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';

export default function LoginScreen({ navigation }) {
  const theme = useTheme();
  const { signIn } = useAuth();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Validation and Error states
  const [errorMsg, setErrorMsg] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Please fill in all fields.');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // FastAPI login expects x-www-form-urlencoded form data
      const urlEncodedBody = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      
      const response = await apiClient.post('/api/users/login', urlEncodedBody, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      if (access_token) {
        await signIn(access_token);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('[Login] Error during authentication:', error);
      const detail = error.response?.data?.detail || 'Invalid username or password.';
      setErrorMsg(detail);
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
          <Text style={styles.subtitle}>Modern Home Automation System</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Sign In</Text>

          <TextInput
            label="Username or Email"
            value={username}
            onChangeText={setUsername}
            mode="outlined"
            autoCapitalize="none"
            left={<TextInput.Icon icon="account-outline" />}
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

          <Button 
            mode="contained" 
            onPress={handleLogin} 
            loading={loading}
            disabled={loading}
            style={styles.loginBtn}
            contentStyle={styles.btnContent}
          >
            Log In
          </Button>

          <View style={styles.registerPrompt}>
            <Text style={styles.promptText}>New to SmartNest?</Text>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Register')}
              compact
              labelStyle={styles.registerLink}
            >
              Create Account
            </Button>
          </View>
        </View>

        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={4000}
          style={{ backgroundColor: theme.colors.errorContainer }}
          action={{
            label: 'OK',
            textColor: theme.colors.onErrorContainer,
            onPress: () => setShowSnackbar(false),
          }}
        >
          <Text style={{ color: theme.colors.onErrorContainer }}>{errorMsg}</Text>
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
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#1E293B',
  },
  loginBtn: {
    marginTop: 8,
    borderRadius: 12,
  },
  btnContent: {
    paddingVertical: 8,
  },
  registerPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  promptText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  registerLink: {
    fontWeight: 'bold',
    fontSize: 14,
  },
});
