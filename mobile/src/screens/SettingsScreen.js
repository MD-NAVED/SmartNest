import { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '../api/client';
import { AuthContext } from '../context/AuthContext';

const TOKENS = {
  bg: '#0D0D0D',
  surface: '#1A1A1A',
  accent: '#22C55E',
  border: '#262626',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  error: '#EF4444'
};

export default function SettingsScreen() {
  const { signOut } = useContext(AuthContext);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Profile edit state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password change state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get('/api/users/me');
      setUser(response.data);
      setEditUsername(response.data.username);
      setEditEmail(response.data.email);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      Alert.alert('Error', 'Could not load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim() || !editEmail.trim()) {
      Alert.alert('Validation Error', 'Username and email cannot be empty');
      return;
    }

    try {
      setIsSavingProfile(true);
      await apiClient.put('/api/users/me', {
        username: editUsername,
        email: editEmail
      });
      Alert.alert('Success', 'Profile updated successfully');
      setIsEditingProfile(false);
      fetchUserProfile();
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Could not update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match');
      return;
    }

    try {
      setIsSavingPassword(true);
      await apiClient.post('/api/users/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      Alert.alert('Success', 'Password changed successfully');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Failed to change password:', error);
      Alert.alert('Error', error.response?.data?.detail || 'Could not change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: signOut
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={TOKENS.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="account-circle" size={24} color={TOKENS.accent} />
          <Text style={styles.sectionTitle}>Profile</Text>
        </View>

        {isEditingProfile ? (
          <View style={styles.card}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={editUsername}
              onChangeText={setEditUsername}
              placeholder="Enter username"
              placeholderTextColor={TOKENS.textSecondary}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Enter email"
              placeholderTextColor={TOKENS.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setIsEditingProfile(false);
                  setEditUsername(user.username);
                  setEditEmail(user.email);
                }}
                disabled={isSavingProfile}
              >
                <Text style={styles.buttonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleSaveProfile}
                disabled={isSavingProfile}
              >
                {isSavingProfile ? (
                  <ActivityIndicator size="small" color={TOKENS.bg} />
                ) : (
                  <Text style={styles.buttonTextPrimary}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{user?.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => setIsEditingProfile(true)}
            >
              <MaterialCommunityIcons name="pencil" size={18} color={TOKENS.bg} />
              <Text style={styles.buttonTextPrimary}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Change Password Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="lock" size={24} color={TOKENS.accent} />
          <Text style={styles.sectionTitle}>Security</Text>
        </View>

        {isChangingPassword ? (
          <View style={styles.card}>
            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              placeholderTextColor={TOKENS.textSecondary}
              secureTextEntry
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password (min 6 chars)"
              placeholderTextColor={TOKENS.textSecondary}
              secureTextEntry
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={TOKENS.textSecondary}
              secureTextEntry
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setIsChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isSavingPassword}
              >
                <Text style={styles.buttonTextSecondary}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={handleChangePassword}
                disabled={isSavingPassword}
              >
                {isSavingPassword ? (
                  <ActivityIndicator size="small" color={TOKENS.bg} />
                ) : (
                  <Text style={styles.buttonTextPrimary}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => setIsChangingPassword(true)}
            >
              <MaterialCommunityIcons name="key-variant" size={18} color={TOKENS.bg} />
              <Text style={styles.buttonTextPrimary}>Change Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleLogout}
        >
          <MaterialCommunityIcons name="logout" size={18} color={TOKENS.error} />
          <Text style={styles.buttonTextDanger}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>4Layers Home Automation</Text>
        <Text style={styles.appInfoText}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.bg
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: TOKENS.bg
  },
  section: {
    marginBottom: 24
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: TOKENS.textPrimary,
    marginLeft: 8
  },
  card: {
    backgroundColor: TOKENS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  infoRow: {
    marginBottom: 16
  },
  infoLabel: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    marginBottom: 4
  },
  infoValue: {
    fontSize: 16,
    color: TOKENS.textPrimary,
    fontWeight: '600'
  },
  label: {
    fontSize: 12,
    color: TOKENS.textSecondary,
    marginBottom: 8,
    marginTop: 8
  },
  input: {
    backgroundColor: TOKENS.bg,
    borderWidth: 1,
    borderColor: TOKENS.border,
    borderRadius: 8,
    padding: 12,
    color: TOKENS.textPrimary,
    fontSize: 14
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1
  },
  buttonPrimary: {
    backgroundColor: TOKENS.accent
  },
  buttonTextPrimary: {
    color: TOKENS.bg,
    fontSize: 14,
    fontWeight: '700'
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TOKENS.border
  },
  buttonTextSecondary: {
    color: TOKENS.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  buttonDanger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TOKENS.error
  },
  buttonTextDanger: {
    color: TOKENS.error,
    fontSize: 14,
    fontWeight: '700'
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 24
  },
  appInfoText: {
    fontSize: 12,
    color: TOKENS.textSecondary
  }
});
