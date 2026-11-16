import axios from "axios";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    // Credenciais inválidas devem ser tratadas pelo formulário, sem recarregar a página.
    const path = new URL(err.config?.url || "/", window.location.origin).pathname;
    const isAuthRequest = /\/auth\/(login|register)\/?$/.test(path);
    if (err.response?.status === 401 && !isAuthRequest) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export default api;
