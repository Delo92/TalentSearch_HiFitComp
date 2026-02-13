import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Calendar, Users, ArrowRight, Search, Flame } from "lucide-react";
import { Link } from "wouter";
import type { Competition } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";

export default function Competitions() {
  const { user } = useAuth();
  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
  });
  const [filter, setFilter] = useState("all");

  const filtered = competitions?.filter((c) => {
    if (filter === "all") return c.status !== "draft";
    return c.status === filter;
  }) || [];

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

      <section className="relative h-48 md:h-64 overflow-hidden">
        <img src="/images/template/breadcumb2.jpg" alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
        <div className="absolute inset-0 flex items-center justify-center text-center">
          <div>
            <span className="text-sm text-orange-400 tracking-widest uppercase font-medium">Explore</span>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mt-2" data-testid="text-page-title">Competitions</h1>
            <p className="mt-2 text-white/40 text-lg">Browse active competitions and vote for your favorites.</p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {["all", "active", "voting", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${filter === f ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"}`}
              data-testid={`filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-md bg-white/5 overflow-hidden">
                <Skeleton className="h-48 bg-white/10" />
                <div className="p-5">
                  <Skeleton className="h-5 w-3/4 mb-3 bg-white/10" />
                  <Skeleton className="h-4 w-full mb-2 bg-white/10" />
                  <Skeleton className="h-4 w-2/3 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((comp) => (
              <CompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Search className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No competitions found</h3>
            <p className="text-white/40 text-sm">Try a different filter or check back soon.</p>
          </div>
        )}
      </div>

      <footer className="border-t border-white/5 bg-black py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Trophy className="h-3 w-3 text-white" />
            </div>
            <span className="font-serif font-bold">StarVote</span>
          </div>
          <p className="text-sm text-white/20">&copy; {new Date().getFullYear()} StarVote</p>
        </div>
      </footer>
    </div>
  );
}

function CompetitionCard({ competition }: { competition: Competition }) {
  const statusConfig: Record<string, { bg: string; text: string }> = {
    active: { bg: "bg-green-500/20", text: "text-green-400" },
    voting: { bg: "bg-orange-500/20", text: "text-orange-400" },
    completed: { bg: "bg-white/10", text: "text-white/60" },
    draft: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  };
  const status = statusConfig[competition.status] || statusConfig.draft;

  return (
    <Link href={`/competition/${competition.id}`}>
      <div className="group relative rounded-md overflow-hidden cursor-pointer bg-white/5 border border-white/5 hover:border-orange-500/30 transition-all duration-500" data-testid={`card-competition-${competition.id}`}>
        <div className="relative h-52 overflow-hidden">
          <img
            src={competition.coverImage || "/images/template/bg-1.jpg"}
            alt={competition.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/5 transition-colors duration-500" />
          <Badge className={`absolute top-3 right-3 ${status.bg} ${status.text} border-0`} data-testid={`badge-status-${competition.id}`}>
            <Flame className="h-3 w-3 mr-1" />
            {competition.status}
          </Badge>
        </div>
        <div className="p-5">
          <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-orange-400 transition-colors" data-testid={`text-title-${competition.id}`}>
            {competition.title}
          </h3>
          <p className="text-sm text-white/40 line-clamp-2 mb-4">{competition.description}</p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-white/30">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {competition.endDate ? new Date(competition.endDate).toLocaleDateString() : "Open"}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {competition.category}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-sm text-orange-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            View & Vote <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
