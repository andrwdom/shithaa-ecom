import axios from 'axios';
import { backendUrl } from '../config';

// Create an axios instance with default config
const api = axios.create({
  baseURL: backendUrl,
  withCredentials: true, // This is important for sending cookies
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Clear admin status and reload page to trigger redirect to login
      localStorage.removeItem('isAdmin');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
