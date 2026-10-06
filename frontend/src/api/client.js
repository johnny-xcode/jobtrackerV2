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
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export const getJobs = (params) => api.get("/jobs", { params }).then((r) => r.data);
export const getStats = () => api.get("/jobs/stats").then((r) => r.data);
export const createJob = (data) => api.post("/jobs", data).then((r) => r.data);
export const extractJob = (link) => api.post("/jobs/extract", { link }).then((r) => r.data);
export const addJobFromLink = (link) => api.post("/jobs/from-link", { link }).then((r) => r.data);
export const updateJob = (id, data) => api.put(`/jobs/${id}`, data).then((r) => r.data);
export const deleteJob = (id) => api.delete(`/jobs/${id}`).then((r) => r.data);

export const login = (credentials) => api.post("/users/login", credentials).then((r) => r.data);
export const register = (payload) => api.post("/users/register", payload).then((r) => r.data);
export const getMe = () => api.get("/users/me").then((r) => r.data);

export default api;