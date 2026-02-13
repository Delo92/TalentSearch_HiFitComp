import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import type { TalentProfile } from "@shared/schema";
import TalentDashboard from "./talent-dashboard";
import AdminDashboard from "./admin-dashboard";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [authLoading, isAuthenticated]);

  const { data: profile, isLoading: profileLoading } = useQuery<TalentProfile | null>({
    queryKey: ["/api/talent-profiles/me"],
    enabled: isAuthenticated,
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-10 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const isAdmin = profile?.role === "admin";

  if (isAdmin) {
    return <AdminDashboard user={user} profile={profile!} />;
  }

  return <TalentDashboard user={user} profile={profile} />;
}
