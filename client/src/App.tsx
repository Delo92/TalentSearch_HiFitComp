import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Competitions from "@/pages/competitions";
import CompetitionDetail from "@/pages/competition-detail";
import TalentProfilePublic from "@/pages/talent-profile-public";
import Dashboard from "@/pages/dashboard";
import LoginPage from "@/pages/login";
import CheckoutPage from "@/pages/checkout";
import MyPurchasesPage from "@/pages/my-purchases";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/competitions" component={Competitions} />
      <Route path="/competition/:id" component={CompetitionDetail} />
      <Route path="/talent/:id" component={TalentProfilePublic} />
      <Route path="/checkout/:competitionId/:contestantId" component={CheckoutPage} />
      <Route path="/my-purchases" component={MyPurchasesPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
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
