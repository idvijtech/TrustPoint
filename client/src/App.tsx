import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import DevicesPage from "@/pages/devices";
import UsersPage from "@/pages/users";
import SettingsPage from "@/pages/settings";
import { ProtectedRoute } from "./lib/protected-route";
import { useAuth, AuthProvider } from "./hooks/use-auth";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Switch>
      <Route path="/">
        <Dashboard />
      </Route>
      <Route path="/devices">
        <DevicesPage />
      </Route>
      <Route path="/users">
        <UsersPage />
      </Route>
      <Route path="/settings">
        <SettingsPage />
      </Route>
      <Route path="/auth">
        <Dashboard />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
