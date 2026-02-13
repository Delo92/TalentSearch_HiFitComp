import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Users, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { Competition } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

export default function Competitions() {
  const { user } = useAuth();
  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
  });

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold tracking-tight">StarVote</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Link href="/dashboard">
                <Button variant="outline" data-testid="button-dashboard">Dashboard</Button>
              </Link>
            ) : (
              <a href="/api/login">
                <Button data-testid="button-login">Log In</Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight" data-testid="text-page-title">Competitions</h1>
          <p className="mt-2 text-muted-foreground">Browse active competitions and vote for your favorites.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 rounded-t-md" />
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : competitions && competitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitions.map((comp) => (
              <CompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No competitions yet</h3>
            <p className="text-muted-foreground text-sm">Check back soon for exciting new competitions.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CompetitionCard({ competition }: { competition: Competition }) {
  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 dark:text-green-400",
    voting: "bg-primary/10 text-primary",
    completed: "bg-muted text-muted-foreground",
    draft: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  };

  const coverImages = [
    "/images/competition-cover-1.png",
    "/images/competition-cover-2.png",
    "/images/competition-cover-3.png",
  ];

  return (
    <Link href={`/competition/${competition.id}`}>
      <Card className="overflow-visible hover-elevate cursor-pointer group" data-testid={`card-competition-${competition.id}`}>
        <div className="relative h-48 overflow-hidden rounded-t-md">
          <img
            src={competition.coverImage || coverImages[competition.id % 3]}
            alt={competition.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <Badge className={`absolute top-3 right-3 ${statusColors[competition.status] || ""}`} data-testid={`badge-status-${competition.id}`}>
            {competition.status}
          </Badge>
        </div>
        <CardContent className="p-5">
          <h3 className="font-semibold text-lg mb-1 line-clamp-1" data-testid={`text-title-${competition.id}`}>{competition.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{competition.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {competition.endDate ? new Date(competition.endDate).toLocaleDateString() : "Open"}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {competition.category}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm text-primary font-medium">
            View Details <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
