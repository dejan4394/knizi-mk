import axios from "axios";

// 1. Креираме инстанца со основната патека до NestJS
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Request Interceptor: Автоматски го лепи токенот пред да замине барањето
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 3. Response Interceptor: Ако добиеме 401 (истечена сесија), автоматски чистиме меморија
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // Ако сме на фронтендот во прелистувачот, го пренасочуваме корисникот на логин
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
