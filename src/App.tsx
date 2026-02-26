import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import DashboardLayout from "@/pages/DashboardLayout";
import Home from "@/pages/Home";
import Selection from "@/pages/Selection";
import Monitor from "@/pages/Monitor";
import Analysis from "@/pages/Analysis";
import Market from "@/pages/Market";
import StockDetail from "@/pages/StockDetail";
import Signals from "@/pages/Signals";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/selection" component={Selection} />
        <Route path="/monitor" component={Monitor} />
        <Route path="/analysis" component={Analysis} />
        <Route path="/market" component={Market} />
        <Route path="/stock/:code" component={StockDetail} />
        <Route path="/signals" component={Signals} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster position="top-right" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
