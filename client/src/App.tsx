import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import Playground from "./pages/Playground";
import Tutorials from "./pages/Tutorials";
import TutorialDetail from "./pages/TutorialDetail";
import Architecture from "./pages/Architecture";
import About from "./pages/About";

function AppRouter() {
  return (
    <WouterRouter hook={useHashLocation}>
      <Layout>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/tutorials" component={Tutorials} />
          <Route path="/tutorials/:id" component={TutorialDetail} />
          <Route path="/playground" component={Playground} />
          <Route path="/architecture" component={Architecture} />
          <Route path="/about" component={About} />
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </WouterRouter>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster position="top-center" richColors />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
