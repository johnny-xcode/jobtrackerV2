import { useState, useEffect, createContext, useContext } from "react";
import { getMe, login, register } from "../api/client.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token") || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const me = await getMe();
          setUser(me);
          setToken(storedToken);
        } catch {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async (credentials) => {
    const res = await login(credentials);
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify({ name: res.name, email: res.email, _id: res._id }));
    setToken(res.token);
    setUser({ name: res.name, email: res.email, _id: res._id });
  };

  const handleRegister = async (payload) => {
    const res = await register(payload);
    localStorage.setItem("token", res.token);
    localStorage.setItem("user", JSON.stringify({ name: res.name, email: res.email, _id: res._id }));
    setToken(res.token);
    setUser({ name: res.name, email: res.email, _id: res._id });
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login: handleLogin, register: handleRegister, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};