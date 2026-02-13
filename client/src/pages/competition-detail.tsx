import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Trophy, Calendar, Vote, Heart, ArrowLeft, Users } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ContestantWithProfile {
  id: number;
  competitionId: number;
  talentProfileId: number;
  applicationStatus: string;
  voteCount: number;
  talentProfile: {
    id: number;
    displayName: string;
    bio: string | null;
    category: string | null;
    imageUrls: string[] | null;
    location: string | null;
  };
}

interface CompetitionDetail {
  id: number;
  title: string;
  description: string | null;
  category: string;
  coverImage: string | null;
  status: string;
  voteCost: number;
  maxVotesPerDay: number;
  startDate: string | null;
  endDate: string | null;
  contestants: ContestantWithProfile[];
  totalVotes: number;
}

export default function CompetitionDetail() {
  const [, params] = useRoute("/competition/:id");
  const id = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: competition, isLoading } = useQuery<CompetitionDetail>({
    queryKey: ["/api/competitions", id],
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: async (contestantId: number) => {
      await apiRequest("POST", `/api/competitions/${id}/vote`, { contestantId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", id] });
      toast({ title: "Vote cast!", description: "Your vote has been recorded." });
    },
    onError: (error: Error) => {
      toast({ title: "Vote failed", description: error.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const coverImages = [
    "/images/competition-cover-1.png",
    "/images/competition-cover-2.png",
    "/images/competition-cover-3.png",
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Skeleton className="h-64 rounded-md mb-6" />
          <Skeleton className="h-8 w-1/2 mb-4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Competition not found</h3>
        </div>
      </div>
    );
  }

  const maxVotes = Math.max(...(competition.contestants?.map((c) => c.voteCount) || [1]), 1);
  const isVotingOpen = competition.status === "voting" || competition.status === "active";

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

      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={competition.coverImage || coverImages[(competition.id || 0) % 3]}
          alt={competition.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            <Link href="/competitions" className="inline-flex items-center gap-1 text-sm text-white/70 mb-3 hover:text-white transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Competitions
            </Link>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-white" data-testid="text-competition-title">{competition.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30" data-testid="badge-category">{competition.category}</Badge>
                  <Badge className={competition.status === "voting" || competition.status === "active" ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"} data-testid="badge-status">
                    {competition.status}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-white/70">
                {competition.endDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Ends {new Date(competition.endDate).toLocaleDateString()}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Vote className="h-4 w-4" />
                  {competition.totalVotes} total votes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {competition.description && (
          <p className="text-muted-foreground mb-8 max-w-3xl" data-testid="text-description">{competition.description}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h2 className="font-serif text-2xl font-bold" data-testid="text-contestants-heading">
            Contestants ({competition.contestants?.length || 0})
          </h2>
          {competition.voteCost > 0 && (
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-primary" /> Vote cost: {competition.voteCost} credits
            </span>
          )}
        </div>

        {competition.contestants && competition.contestants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competition.contestants
              .sort((a, b) => b.voteCount - a.voteCount)
              .map((contestant, index) => (
                <Card key={contestant.id} className="overflow-visible" data-testid={`card-contestant-${contestant.id}`}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <Avatar className="h-14 w-14">
                          <AvatarImage src={contestant.talentProfile.imageUrls?.[0] || ""} />
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                            {contestant.talentProfile.displayName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {index < 3 && (
                          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            index === 0 ? "bg-yellow-500 text-yellow-950" : index === 1 ? "bg-gray-300 text-gray-700" : "bg-orange-400 text-orange-950"
                          }`}>
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-semibold" data-testid={`text-contestant-name-${contestant.id}`}>
                              {contestant.talentProfile.displayName}
                            </h3>
                            {contestant.talentProfile.location && (
                              <p className="text-xs text-muted-foreground">{contestant.talentProfile.location}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-primary" data-testid={`text-votes-${contestant.id}`}>{contestant.voteCount}</span>
                            <span className="text-xs text-muted-foreground ml-1">votes</span>
                          </div>
                        </div>
                        {contestant.talentProfile.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{contestant.talentProfile.bio}</p>
                        )}
                        <div className="mt-3">
                          <Progress value={(contestant.voteCount / maxVotes) * 100} className="h-1.5" />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/talent/${contestant.talentProfileId}`} className="text-xs text-primary font-medium" data-testid={`link-profile-${contestant.id}`}>
                            View Profile
                          </Link>
                          {isVotingOpen && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                voteMutation.mutate(contestant.id);
                              }}
                              disabled={voteMutation.isPending}
                              data-testid={`button-vote-${contestant.id}`}
                            >
                              <Heart className="h-3.5 w-3.5 mr-1" />
                              Vote
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">No contestants yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to apply!</p>
            {!user && (
              <a href="/api/login">
                <Button className="mt-4" data-testid="button-apply-login">Log in to Apply</Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
