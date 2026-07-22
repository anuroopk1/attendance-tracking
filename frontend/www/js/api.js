/* ============================================================
   API CONFIG — Connects frontend to Node.js backend API
   ============================================================ */

const API_BASE_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== ''
  ? 'http://localhost:8080'
  : 'https://attendance-tracking-rj45.onrender.com'; // Replace with your actual Render backend URL once deployed

window.AppAPI = {
  get BASE_URL() {
    return API_BASE_URL;
  },

  get token() {
    return localStorage.getItem('att_token') || '';
  },

  saveToken(token) {
    if (token) {
      localStorage.setItem('att_token', token);
    } else {
      localStorage.removeItem('att_token');
    }
  },

  // Unified fetch wrapper
  async fetch(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // Token expired or invalid
      this.saveToken(null);
      localStorage.removeItem('att_user');
      window.location.hash = '#login';
      throw new Error('Session expired. Please log in again.');
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP error! status: ${res.status}`);
    }

    return res.json();
  }
};
