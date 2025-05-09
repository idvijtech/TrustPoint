import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { adminInsertSchema, Admin, AdminInsert, LoginData } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  user: Admin | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<{ admin: Admin; token: string }, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<{ admin: Admin; token: string }, Error, AdminInsert>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(localStorage.getItem("jwt"));
  
  const {
    data: user,
    error,
    isLoading,
    refetch,
  } = useQuery<Admin | undefined, Error>({
    queryKey: ["/api/admin"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!token,
  });
  
  // Check token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("jwt");
    if (storedToken && !token) {
      setToken(storedToken);
      refetch();
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (data: { admin: Admin; token: string }) => {
      queryClient.setQueryData(["/api/admin"], data.admin);
      localStorage.setItem("jwt", data.token);
      refetch(); // Refetch user data with the new token
      window.location.href = "/"; // Redirect to home/dashboard
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.admin.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: AdminInsert) => {
      const res = await apiRequest("POST", "/api/register", userData);
      return await res.json();
    },
    onSuccess: (data: { admin: Admin; token: string }) => {
      queryClient.setQueryData(["/api/admin"], data.admin);
      localStorage.setItem("jwt", data.token);
      refetch(); // Refetch user data with the new token
      window.location.href = "/"; // Redirect to home/dashboard
      toast({
        title: "Registration successful",
        description: `Welcome, ${data.admin.fullName}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/admin"], null);
      localStorage.removeItem("jwt");
      window.location.href = "/auth"; // Redirect to login page
      toast({
        title: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
