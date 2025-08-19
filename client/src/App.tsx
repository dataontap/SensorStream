import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import DevicePage from "@/pages/device";
import NotFound from "@/pages/not-found";
import { useGlobalStreaming } from "@/hooks/use-global-streaming";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/device" component={DevicePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize global streaming service
  useGlobalStreaming();
  
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
