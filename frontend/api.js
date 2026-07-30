

const API_BASE = 'http://localhost:5000/api';

function getToken() { return sessionStorage.getItem('authToken'); }
function setToken(token) { sessionStorage.setItem('authToken', token); }
function clearToken() {
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('currentUser');
}
function getCurrentUser() {
  const raw = sessionStorage.getItem('currentUser');
  return raw ? JSON.parse(raw) : null;
}
function setCurrentUser(user) { sessionStorage.setItem('currentUser', JSON.stringify(user)); }

async function apiRequest(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch (err) {
    throw new Error('Cannot reach the server. Is the backend running on http://localhost:5000?');
  }

  let data = null;
  try { data = await res.json(); } catch (_) { /* no JSON body */ }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => apiRequest('/auth/me'),

  getPets: (query = '') => apiRequest(`/pets${query}`),
  getPet: (id) => apiRequest(`/pets/${id}`),
  createPet: (payload) => apiRequest('/pets', { method: 'POST', body: JSON.stringify(payload) }),
  updatePet: (id, payload) => apiRequest(`/pets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deletePet: (id) => apiRequest(`/pets/${id}`, { method: 'DELETE' }),

  getAdopters: (query = '') => apiRequest(`/adopters${query}`),
  getMyAdopter: () => apiRequest('/adopters/me'),
  createAdopter: (payload) => apiRequest('/adopters', { method: 'POST', body: JSON.stringify(payload) }),
  updateAdopter: (id, payload) => apiRequest(`/adopters/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAdopter: (id) => apiRequest(`/adopters/${id}`, { method: 'DELETE' }),

  getAdoptions: (status = '') => apiRequest(`/adoptions${status ? `?status=${status}` : ''}`),
  getMyAdoptions: () => apiRequest('/adoptions/mine'),
  getAssignedToMe: () => apiRequest('/adoptions/assigned-to-me'),
  createAdoption: (petId) => apiRequest('/adoptions', { method: 'POST', body: JSON.stringify({ petId }) }),
  approveAdoption: (id) => apiRequest(`/adoptions/${id}/approve`, { method: 'PUT' }),
  rejectAdoption: (id) => apiRequest(`/adoptions/${id}/reject`, { method: 'PUT' }),
  assignStaff: (id, staffId) => apiRequest(`/adoptions/${id}/assign-staff`, { method: 'PUT', body: JSON.stringify({ staffId }) }),
  markDelivered: (id) => apiRequest(`/adoptions/${id}/mark-delivered`, { method: 'PUT' }),

  getVaccinations: (petId) => apiRequest(`/vaccinations${petId ? `?petId=${petId}` : ''}`),
  createVaccination: (payload) => apiRequest('/vaccinations', { method: 'POST', body: JSON.stringify(payload) }),
  updateVaccination: (id, payload) => apiRequest(`/vaccinations/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteVaccination: (id) => apiRequest(`/vaccinations/${id}`, { method: 'DELETE' }),

  getDashboard: () => apiRequest('/reports/dashboard'),
  getAvailableReport: () => apiRequest('/reports/available-pets'),
  getAdoptedReport: () => apiRequest('/reports/adopted-pets'),

  getNotifications: () => apiRequest('/notifications'),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),

  listStaff: () => apiRequest('/staff'),
  createStaff: (payload) => apiRequest('/staff', { method: 'POST', body: JSON.stringify(payload) }),
};