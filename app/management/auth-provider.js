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
        const credentials = { username: username.trim(), password };
        const user = await apiRequest("/api/auth/me", { auth: credentials });
        setSession({ credentials, user });
        return user;
      },
      signOut() {
        setSession(null);
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
