import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Vote, Heart, Users, Crown, Award, ChevronRight, ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SiteNavbar from "@/components/site-navbar";
import SiteFooter from "@/components/site-footer";
import { useLivery } from "@/hooks/use-livery";

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

export default function CompetitionDetailPage() {
  const [, params] = useRoute("/competition/:id");
  const id = params?.id;
  const { user } = useAuth();
  const { toast } = useToast();

  const { getImage, getMedia } = useLivery();
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
        <SiteNavbar />
        <div className="max-w-5xl mx-auto px-4 py-32">
          <Skeleton className="h-64 mb-6 bg-white/5" />
          <Skeleton className="h-8 w-1/2 mb-4 bg-white/10" />
          <Skeleton className="h-4 w-3/4 bg-white/10" />
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <SiteNavbar />
        <div className="text-center">
          <Trophy className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Competition not found</h3>
          <Link href="/competitions">
            <Button variant="ghost" className="mt-4 text-orange-400" data-testid="button-back">Back to Competitions</Button>
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
      <SiteNavbar />

      <section className="relative h-[270px] md:h-[340px] overflow-hidden">
        {(() => {
          const headerMedia = competition.coverImage ? { url: competition.coverImage, type: "image" as const } : getMedia("competition_detail_header", "/images/template/breadcumb3.jpg");
          return headerMedia.type === "video" ? (
            <video src={headerMedia.url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${headerMedia.url}')` }} />
          );
        })()}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white text-center pt-10 pb-6 px-8 z-10 w-[calc(100%-60px)] max-w-[552px]">
          <p className="text-[#5f5f5f] text-base leading-relaxed mb-1">
            <Link href="/competitions" className="hover:text-black transition-colors" data-testid="link-back">
              Competitions
            </Link>
            <span className="mx-2">/</span>
            {competition.category}
          </p>
          <h2
            className="text-[24px] md:text-[30px] uppercase text-black font-normal leading-none"
            style={{ letterSpacing: "10px" }}
            data-testid="text-competition-title"
          >
            {competition.title}
          </h2>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {competition.description && (
          <p className="text-white/40 mb-6 text-base max-w-3xl leading-relaxed" data-testid="text-description">
            {competition.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-10">
          <Link
            href={`/join?competition=${competition.id}`}
            className="inline-block bg-[#FF5A09] text-white font-bold text-sm uppercase px-6 leading-[42px] border border-[#FF5A09] transition-all duration-500 hover:bg-transparent hover:text-[#FF5A09] cursor-pointer"
            style={{ letterSpacing: "2px" }}
            data-testid="button-join-competition"
          >
            Join This Competition <ChevronRight className="inline h-4 w-4 ml-1" /><ChevronRight className="inline h-4 w-4 -ml-2" />
          </Link>
          <Link
            href={`/host?competition=${competition.id}`}
            className="inline-block bg-transparent text-white font-bold text-sm uppercase px-6 leading-[42px] border border-white/30 transition-all duration-500 hover:bg-white hover:text-black hover:border-white cursor-pointer"
            style={{ letterSpacing: "2px" }}
            data-testid="button-host-event"
          >
            Host My Own Event <ChevronRight className="inline h-4 w-4 ml-1" /><ChevronRight className="inline h-4 w-4 -ml-2" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-6 text-sm text-white/40">
            {competition.endDate && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-white/30" />
                Ends {new Date(competition.endDate).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Vote className="h-4 w-4 text-white/30" />
              {competition.totalVotes} total votes
            </span>
            {competition.voteCost > 0 && (
              <span className="flex items-center gap-1.5">
                <Heart className="h-4 w-4 text-white/30" />
                {competition.voteCost} credits/vote
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Vote className="h-4 w-4 text-white/30" />
              Max {competition.maxVotesPerDay}/day
            </span>
          </div>
        </div>

        <div className="text-center mb-12">
          <p className="text-[#5f5f5f] text-sm mb-1">See what&apos;s new</p>
          <h2 className="text-lg uppercase text-white font-normal" style={{ letterSpacing: "10px" }}>
            Contestants ({sorted.length})
          </h2>
        </div>

        {sorted.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((contestant, index) => {
              const pct = maxVotes > 0 ? (contestant.voteCount / maxVotes) * 100 : 0;
              const rankIcon = index === 0 ? <Crown className="h-4 w-4 text-yellow-400" /> : index === 1 ? <Award className="h-4 w-4 text-gray-300" /> : index === 2 ? <Award className="h-4 w-4 text-orange-400" /> : null;

              return (
                <div
                  key={contestant.id}
                  className="group cursor-pointer transition-all duration-500 hover:shadow-[0_5px_80px_0_rgba(0,0,0,0.2)]"
                  data-testid={`card-contestant-${contestant.id}`}
                >
                  <div className="relative overflow-hidden h-52">
                    <img
                      src={contestant.talentProfile.imageUrls?.[0] || getImage("talent_profile_fallback", "/images/template/a1.jpg")}
                      alt={contestant.talentProfile.displayName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    {rankIcon && (
                      <div className="absolute top-3 left-3 w-8 h-8 bg-black/70 flex items-center justify-center">
                        {rankIcon}
                      </div>
                    )}
                  </div>
                  <div className="bg-black group-hover:bg-[#f5f9fa] text-center py-6 px-4 transition-all duration-500">
                    <h4 className="text-white group-hover:text-black uppercase font-bold text-base mb-2 transition-colors duration-500" data-testid={`text-contestant-name-${contestant.id}`}>
                      {contestant.talentProfile.displayName}
                    </h4>
                    <div className="mb-3">
                      <span className="text-white/60 group-hover:text-black/60 text-sm transition-colors duration-500" data-testid={`text-votes-${contestant.id}`}>
                        {contestant.voteCount} votes
                      </span>
                      {contestant.talentProfile.category && (
                        <>
                          <span className="text-white/30 group-hover:text-black/30 mx-2 transition-colors duration-500">|</span>
                          <span className="text-white/60 group-hover:text-black/60 text-sm transition-colors duration-500">
                            {contestant.talentProfile.category}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="relative h-1.5 bg-white/10 group-hover:bg-black/10 mb-4 transition-colors duration-500">
                      <div
                        className="absolute inset-y-0 left-0 bg-[#FF5A09] transition-all duration-1000"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <Link
                        href={`/talent/${contestant.talentProfileId}`}
                        className="text-[11px] text-white group-hover:text-black uppercase border-b border-white group-hover:border-black pb-1 transition-colors duration-500"
                        style={{ letterSpacing: "6px" }}
                        data-testid={`link-profile-${contestant.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Profile
                      </Link>
                      {isVotingOpen && (
                        <>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              voteMutation.mutate(contestant.id);
                            }}
                            disabled={voteMutation.isPending}
                            className="inline-block bg-black group-hover:bg-[#111] text-white font-bold text-sm capitalize px-6 leading-[40px] border border-black transition-all duration-500 hover:bg-white hover:text-black cursor-pointer disabled:opacity-50"
                            data-testid={`button-vote-${contestant.id}`}
                          >
                            <Heart className="inline h-3.5 w-3.5 mr-1.5" />
                            {voteMutation.isPending ? "Voting..." : "Vote"}
                          </button>
                          <Link
                            href={`/checkout/${competition.id}/${contestant.id}`}
                            className="inline-block bg-[#FF5A09] text-white font-bold text-sm capitalize px-6 leading-[40px] border border-[#FF5A09] transition-all duration-500 hover:bg-transparent hover:text-[#FF5A09] cursor-pointer"
                            style={{ letterSpacing: "2px" }}
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`button-buy-votes-${contestant.id}`}
                          >
                            <ShoppingCart className="inline h-3.5 w-3.5 mr-1.5" />
                            Buy Votes
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Users className="h-12 w-12 text-white/10 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">No contestants yet</h3>
            <p className="text-sm text-white/30 mb-6">Be the first to apply!</p>
            {!user && (
              <a href="/login">
                <span
                  className="inline-block bg-black text-white font-bold text-base capitalize px-8 leading-[47px] min-w-[212px] border border-white transition-all duration-500 hover:bg-white hover:text-black cursor-pointer"
                  data-testid="button-apply-login"
                >
                  Log in to Apply <ChevronRight className="inline h-4 w-4 ml-1" /><ChevronRight className="inline h-4 w-4 -ml-2" />
                </span>
              </a>
            )}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
