import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Vote, Heart, ArrowLeft, Users, Flame, Crown, Award } from "lucide-react";
import { Link } from "wouter";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Skeleton className="h-64 rounded-md mb-6 bg-white/5" />
          <Skeleton className="h-8 w-1/2 mb-4 bg-white/10" />
          <Skeleton className="h-4 w-3/4 bg-white/10" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Competition not found</h3>
          <Link href="/competitions">
            <Button variant="ghost" className="mt-4 text-orange-400">Back to Competitions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const maxVotes = Math.max(...(competition.contestants?.map((c) => c.voteCount) || [1]), 1);
  const isVotingOpen = competition.status === "voting" || competition.status === "active";
  const sorted = [...(competition.contestants || [])].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-serif text-xl font-bold">StarVote</span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/dashboard">
                <Button data-testid="button-dashboard" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">Dashboard</Button>
              </Link>
            ) : (
              <a href="/api/login">
                <Button data-testid="button-login" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">Log In</Button>
              </a>
            )}
          </div>
        </div>
      </nav>

      <div className="relative h-72 md:h-96 overflow-hidden">
        <img
          src={competition.coverImage || "/images/template/bg-1.jpg"}
          alt={competition.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-orange-900/10 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            <Link href="/competitions" className="inline-flex items-center gap-1.5 text-sm text-white/50 mb-4 hover:text-orange-400 transition-colors" data-testid="link-back">
              <ArrowLeft className="h-4 w-4" /> Back to Competitions
            </Link>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl md:text-5xl font-bold" data-testid="text-competition-title">{competition.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Badge className="bg-orange-500/20 text-orange-400 border-0" data-testid="badge-category">
                    {competition.category}
                  </Badge>
                  <Badge className={`border-0 ${isVotingOpen ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"}`} data-testid="badge-status">
                    <Flame className="h-3 w-3 mr-1" />
                    {competition.status}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-sm text-white/40">
                {competition.endDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-orange-400/50" />
                    Ends {new Date(competition.endDate).toLocaleDateString()}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Vote className="h-4 w-4 text-orange-400/50" />
                  {competition.totalVotes} total votes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {competition.description && (
          <p className="text-white/40 mb-10 text-lg max-w-3xl leading-relaxed" data-testid="text-description">{competition.description}</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h2 className="font-serif text-2xl md:text-3xl font-bold" data-testid="text-contestants-heading">
            Contestants ({sorted.length})
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/30">
            {competition.voteCost > 0 && (
              <span className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-orange-400" /> {competition.voteCost} credits/vote
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Vote className="h-4 w-4 text-orange-400/50" /> Max {competition.maxVotesPerDay}/day
            </span>
          </div>
        </div>

        {sorted.length > 0 ? (
          <div className="space-y-4">
            {sorted.map((contestant, index) => {
              const pct = maxVotes > 0 ? (contestant.voteCount / maxVotes) * 100 : 0;
              const rankIcon = index === 0 ? <Crown className="h-5 w-5 text-yellow-400" /> : index === 1 ? <Award className="h-5 w-5 text-gray-300" /> : index === 2 ? <Award className="h-5 w-5 text-orange-400" /> : null;

              return (
                <div
                  key={contestant.id}
                  className="group relative rounded-md bg-white/5 border border-white/5 hover:border-orange-500/20 transition-all duration-300 overflow-hidden"
                  data-testid={`card-contestant-${contestant.id}`}
                >
                  <div className="p-5 md:p-6">
                    <div className="flex items-start gap-4 md:gap-6">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-16 w-16 md:h-20 md:w-20 ring-2 ring-white/10">
                          <AvatarImage src={contestant.talentProfile.imageUrls?.[0] || ""} />
                          <AvatarFallback className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-400 font-bold text-xl">
                            {contestant.talentProfile.displayName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {rankIcon && (
                          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black border-2 border-white/10 flex items-center justify-center">
                            {rankIcon}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-bold group-hover:text-orange-400 transition-colors" data-testid={`text-contestant-name-${contestant.id}`}>
                              {contestant.talentProfile.displayName}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              {contestant.talentProfile.category && (
                                <span className="text-xs text-white/30">{contestant.talentProfile.category}</span>
                              )}
                              {contestant.talentProfile.location && (
                                <span className="text-xs text-white/30">{contestant.talentProfile.location}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid={`text-votes-${contestant.id}`}>
                              {contestant.voteCount}
                            </span>
                            <span className="text-xs text-white/30 ml-1.5">votes</span>
                          </div>
                        </div>

                        {contestant.talentProfile.bio && (
                          <p className="text-sm text-white/30 mt-2 line-clamp-2">{contestant.talentProfile.bio}</p>
                        )}

                        <div className="mt-4 relative h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-1000"
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <Link href={`/talent/${contestant.talentProfileId}`} className="text-sm text-orange-400 font-medium hover:underline" data-testid={`link-profile-${contestant.id}`}>
                            View Profile
                          </Link>
                          {isVotingOpen && (
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                voteMutation.mutate(contestant.id);
                              }}
                              disabled={voteMutation.isPending}
                              className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white"
                              data-testid={`button-vote-${contestant.id}`}
                            >
                              <Heart className="h-4 w-4 mr-1.5" />
                              {voteMutation.isPending ? "Voting..." : "Vote"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 rounded-md bg-white/5 border border-white/5">
            <Users className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No contestants yet</h3>
            <p className="text-sm text-white/30 mb-4">Be the first to apply!</p>
            {!user && (
              <a href="/api/login">
                <Button className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white" data-testid="button-apply-login">Log in to Apply</Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
