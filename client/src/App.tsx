import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import Playground from "./pages/Playground";
import Tutorials from "./pages/Tutorials";
import TutorialDetail from "./pages/TutorialDetail";
import Architecture from "./pages/Architecture";
import About from "./pages/About";

function AppRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <WouterRouter hook={useHashLocation}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />

        <Route path="/:rest*">
          <Layout>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/tutorials" component={Tutorials} />
              <Route path="/tutorials/:id" component={TutorialDetail} />
              <Route path="/playground" component={Playground} />
              <Route path="/architecture" component={Architecture} />
              <Route path="/about" component={About} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        </Route>
      </Switch>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster position="top-center" richColors />
            <AppRouter />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}