"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface Project {
  id: string;
  name: string;
  description: string | null;
}

interface ProjectMembership {
  id: string;
  projectId: string;
  role: string;
  project: Project;
}

interface Organization {
  id: string;
  name: string;
}

interface OrgMembership {
  id: string;
  organizationId: string;
  role: string;
  organization: Organization;
}

interface User {
  id: string;
  email: string;
  name: string;
  projectMemberships: ProjectMembership[];
  orgMemberships: OrgMembership[];
}

interface AuthContextType {
  user: User | null;
  allUsers: User[];
  isLoading: boolean;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error("Failed to fetch session:", err);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch users list:", err);
    }
  };

  const refreshSession = async () => {
    setIsLoading(true);
    await fetchSession();
    setIsLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchSession(), fetchAllUsers()]);
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (userId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Force refresh page data/state
        window.location.reload();
      } else {
        const err = await res.json();
        console.error("Login failed:", err.error);
      }
    } catch (err) {
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", { method: "DELETE" });
      if (res.ok) {
        setUser(null);
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allUsers,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
