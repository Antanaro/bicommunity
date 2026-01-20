import axios from 'axios';

// Для production: если используется отдельный поддомен для API, 
// установите переменную окружения VITE_API_URL
// Для одного домена используйте '/api' (будет работать через прокси Nginx)
const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // В production используем относительный путь (работает через прокси)
  // В development Vite проксирует на localhost:5000
  return '/api';
};

export const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Upload image function
export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  const token = localStorage.getItem('token');
  const response = await fetch(`${getBaseURL()}/upload/image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  return data.url;
};

// Upload multiple images function
export const uploadImages = async (files: File[]): Promise<string[]> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const token = localStorage.getItem('token');
  const response = await fetch(`${getBaseURL()}/upload/images`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload images');
  }

  const data = await response.json();
  return data.urls;
};

// Invitation API
export const invitationApi = {
  // Проверить валидность кода
  validate: (code: string) => api.get(`/invitations/validate/${code}`),
  
  // Получить свои приглашения
  getMy: () => api.get('/invitations/my'),
  
  // Создать новое приглашение
  create: () => api.post('/invitations/create'),
};
