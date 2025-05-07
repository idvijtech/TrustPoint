import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import DevicesPage from "@/pages/devices";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import MediaPage from "@/pages/media";
import EventDetailsPage from "@/pages/event-details";
import AdminsPage from "@/pages/admins";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { useEffect } from "react";

// A simple protected route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return user ? <>{children}</> : null;
}

// An auth-only route that redirects to dashboard if authenticated
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  
  return !user ? <>{children}</> : null;
}

function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/">
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        </Route>
        <Route path="/devices">
          <ProtectedRoute>
            <DevicesPage />
          </ProtectedRoute>
        </Route>
        <Route path="/users">
          <ProtectedRoute>
            <UsersPage />
          </ProtectedRoute>
        </Route>
        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/admins">
          <ProtectedRoute>
            <AdminsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/media">
          <ProtectedRoute>
            <MediaPage />
          </ProtectedRoute>
        </Route>
        <Route path="/media/events/:id">
          <ProtectedRoute>
            <EventDetailsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/auth">
          <AuthRoute>
            <AuthPage />
          </AuthRoute>
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
