import React, { useState } from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Snackbar, useTheme } from 'react-native-paper';
import apiClient from '../api/client';

export default function AddDeviceScreen({ navigation }) {
  const theme = useTheme();
  
  const [name, setName] = useState('');
  const [type, setType] = useState('light');
  const [loading, setLoading] = useState(false);
  
  // Alert Snackbar states
  const [errorMsg, setErrorMsg] = useState('');
  const [showSnackbar, setShowSnackbar] = useState(false);

  const handleAddDevice = async () => {
    if (!name.trim()) {
      setErrorMsg('Please enter a device name.');
      setShowSnackbar(true);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const payload = {
        name: name.trim(),
        type: type,
      };

      await apiClient.post('/api/devices', payload);
      
      // Navigate back to the home screen
      navigation.goBack();
    } catch (error) {
      console.error('[AddDevice] Error creating device:', error);
      const detail = error.response?.data?.detail || 'Failed to create device. Please check your internet connection.';
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
        <View style={styles.formCard}>
          <Text style={styles.sectionLabel}>Device Name</Text>
          <TextInput
            label="e.g. Living Room Light, Bed AC"
            value={name}
            onChangeText={setName}
            mode="outlined"
            maxLength={50}
            style={styles.input}
          />

          <Text style={styles.sectionLabel}>Device Type</Text>
          <SegmentedButtons
            value={type}
            onValueChange={setType}
            buttons={[
              {
                value: 'light',
                label: 'Light',
                icon: 'lightbulb-outline',
              },
              {
                value: 'fan',
                label: 'Fan',
                icon: 'fan',
              },
              {
                value: 'AC',
                label: 'AC',
                icon: 'air-conditioner',
              },
            ]}
            style={styles.segmentedButtons}
          />

          <Button
            mode="contained"
            onPress={handleAddDevice}
            loading={loading}
            disabled={loading}
            style={styles.submitBtn}
            contentStyle={styles.btnContent}
            icon="plus"
          >
            Add Device
          </Button>

          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.cancelBtn}
            contentStyle={styles.btnContent}
          >
            Cancel
          </Button>
        </View>

        <Snackbar
          visible={showSnackbar}
          onDismiss={() => setShowSnackbar(false)}
          duration={3000}
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
    padding: 16,
  },
  formCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 3,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    marginBottom: 24,
    backgroundColor: '#1E293B',
  },
  segmentedButtons: {
    marginBottom: 32,
  },
  submitBtn: {
    borderRadius: 12,
    marginBottom: 12,
  },
  cancelBtn: {
    borderRadius: 12,
    borderColor: '#475569',
  },
  btnContent: {
    paddingVertical: 6,
  },
});
