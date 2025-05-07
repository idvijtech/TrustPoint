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
  const { user } = useAuth();

  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/devices" component={DevicesPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <Route path="/auth">
        {user ? <Route path="/">
          <Dashboard />
        </Route> : <AuthPage />}
      </Route>
      <Route component={NotFound} />
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
