"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { apiRequest } from "@/app/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  const value = useMemo(
    () => ({
      credentials: session?.credentials ?? null,
      user: session?.user ?? null,
      async signIn(username, password) {
        await apiRequest("/api/auth/csrf");
        const user = await apiRequest("/api/auth/login", {
          method: "POST",
          body: { username: username.trim(), password, rememberMe: false },
        });
        setSession({ credentials: {}, user });
        return user;
      },
      async signOut() {
        try {
          await apiRequest("/api/auth/csrf");
          await apiRequest("/api/auth/logout", { method: "POST" });
        } finally {
          setSession(null);
        }
      },
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within the management AuthProvider.");
  }
  return context;
}
