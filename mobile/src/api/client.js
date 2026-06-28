import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Toggle local development vs production Render API
// Set to true to connect the app to the backend server running locally on your computer.
const USE_LOCAL_BACKEND = false; // Set to true only for local dev 
const LOCAL_PC_IP = '10.245.153.121'; // Your computer's network IP for phone/emulator connection

let baseURL = USE_LOCAL_BACKEND
  ? (Platform.OS === 'web' ? 'http://localhost:8000' : `http://${LOCAL_PC_IP}:8000`)
  : 'https://smartnest-3jr4.onrender.com';

console.log(`[SmartNest API Client] Initialized. Base URL: ${baseURL}`);

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
});

let onUnauthorized = () => {};

export const registerUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Add an interceptor to inject the JWT token from AsyncStorage into every outgoing request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('user_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('[API Client] Error reading auth token:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auto-logout on 401 errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log('[API Client] 401 Unauthorized detected. Clearing token and forcing logout.');
      try {
        await AsyncStorage.removeItem('user_token');
      } catch (e) {
        console.error('[API Client] Error removing token on 401:', e);
      }
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default apiClient;
