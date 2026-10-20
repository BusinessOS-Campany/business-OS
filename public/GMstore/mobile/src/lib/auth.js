import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, setAuthToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem("auth").then((s) => {
      if (s) try {
        const parsed = JSON.parse(s);
        setUser(parsed.user);
        setToken(parsed.token);
        setAuthToken(parsed.token);
      } catch {}
      setLoading(false);
    });
  }, []);

  async function login(email, password) {
    const res = await api("/auth/token", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res?.token && res?.user) {
      setUser(res.user);
      setToken(res.token);
      setAuthToken(res.token);
      await AsyncStorage.setItem("auth", JSON.stringify({ user: res.user, token: res.token }));
    } else {
      throw new Error(res?.error || "Login failed");
    }
    return res;
  }

  function logout() {
    setUser(null);
    setToken(null);
    setAuthToken(null);
    AsyncStorage.removeItem("auth");
  }

  return <AuthContext.Provider value={{ user, token, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
