/**
 * Memory API Layer
 * Centralized Axios client with Firebase token injection
 */

import axios from 'axios';
import { auth } from '../firebase';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ── Axios Instance ────────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s default
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor — Attach Firebase Bearer Token ────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(false);
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Could not attach auth token:', err.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor — Normalize errors ───────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

// ══════════════════════════════════════════════════════════════════
// MEMORIES API
// ══════════════════════════════════════════════════════════════════

/** Fetch paginated memories (with optional mood / year / sort filters) */
export const getMemories = (params = {}) =>
  api.get('/memories', { params }).then((r) => r.data);

/** Fetch a single memory by ID */
export const getMemory = (id) =>
  api.get(`/memories/${id}`).then((r) => r.data);

/** Create a new memory */
export const createMemory = (data) =>
  api.post('/memories', data).then((r) => r.data);

/** Update a memory */
export const updateMemory = (id, data) =>
  api.put(`/memories/${id}`, data).then((r) => r.data);

/** Soft-delete a memory */
export const deleteMemory = (id) =>
  api.delete(`/memories/${id}`).then((r) => r.data);

/** Fetch "On This Day" memories */
export const getOnThisDay = () =>
  api.get('/memories/on-this-day').then((r) => r.data);

/** Fetch dashboard stats (mood breakdown, year counts, media count) */
export const getStats = () =>
  api.get('/memories/stats').then((r) => r.data);

/** Fetch the public community feed (all public memories from all users) */
export const getPublicFeed = (params = {}) =>
  api.get('/memories/public', { params }).then((r) => r.data);

// ══════════════════════════════════════════════════════════════════
// SEARCH API
// ══════════════════════════════════════════════════════════════════

/** Full search with keyword + filters */
export const searchMemories = (params = {}) =>
  api.get('/search', { params }).then((r) => r.data);

/** Autocomplete title suggestions */
export const getSearchSuggestions = (q) =>
  api.get('/search/suggestions', { params: { q } }).then((r) => r.data);

/** Get all unique tags for the current user */
export const getUserTags = () =>
  api.get('/search/tags').then((r) => r.data);

// ══════════════════════════════════════════════════════════════════
// UPLOAD API
// ══════════════════════════════════════════════════════════════════

/** Upload a single media file */
export const uploadSingle = (file, onProgress) => {
  const formData = new FormData();
  formData.append('media', file);

  return api
    .post('/upload/single', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large files
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    })
    .then((r) => r.data);
};

/** Upload multiple media files */
export const uploadMultiple = (files, onProgress) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('media', file));

  return api
    .post('/upload/multiple', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 minutes for large files
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    })
    .then((r) => r.data);
};

/** Delete a file from Cloudinary */
export const deleteFile = (publicId, resourceType = 'image') =>
  api
    .delete(`/upload/${encodeURIComponent(publicId)}`, { params: { resourceType } })
    .then((r) => r.data);

export default api;
