import { Switch, Route } from "wouter";
import { useEffect } from "react";
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
import JoinPage from "@/pages/join";
import HostPage from "@/pages/host";
import ContestantSharePage from "@/pages/contestant-share";
import HostProfilePublic from "@/pages/host-profile-public";
import AboutPage from "@/pages/about";
import ViewerDashboard from "@/pages/viewer-dashboard";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={LoginPage} />
      <Route path="/competitions" component={Competitions} />
      <Route path="/talent/:id" component={TalentProfilePublic} />
      <Route path="/checkout/:competitionId/:contestantId" component={CheckoutPage} />
      <Route path="/my-purchases" component={MyPurchasesPage} />
      <Route path="/join" component={JoinPage} />
      <Route path="/host" component={HostPage} />
      <Route path="/about" component={AboutPage} />
      <Route path="/host/:hostSlug" component={HostProfilePublic} />
      <Route path="/viewer" component={ViewerDashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Dashboard} />
      <Route path="/:categorySlug/:compSlug/:talentSlug" component={ContestantSharePage} />
      <Route path="/:categorySlug/:compSlug" component={CompetitionDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("hfc_ref", ref);
    }
  }, []);

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
