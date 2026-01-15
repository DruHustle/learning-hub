import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Playground from "./pages/Playground";
import Tutorials from "./pages/Tutorials";
import TutorialDetail from "./pages/TutorialDetail";
import Architecture from "./pages/Architecture";
import About from "./pages/About";
import Analytics from "./pages/Analytics";

function AppRouter() {
  return (
    <WouterRouter hook={useHashLocation}>
      <Switch>
        {/* Main Application Routes */}
        <Route path="/">
          <Layout><Home /></Layout>
        </Route>
        <Route path="/tutorials">
          <Layout><Tutorials /></Layout>
        </Route>
        <Route path="/tutorials/:id">
          <Layout><TutorialDetail /></Layout>
        </Route>
        <Route path="/playground">
          <Layout><Playground /></Layout>
        </Route>
        <Route path="/architecture">
          <Layout><Architecture /></Layout>
        </Route>
        <Route path="/about">
          <Layout><About /></Layout>
        </Route>
        <Route path="/analytics">
          <Layout><Analytics /></Layout>
        </Route>
        {/* Auth Routes */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        {/* Fallback */}
        <Route>
          <Layout><NotFound /></Layout>
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