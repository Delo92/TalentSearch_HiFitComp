import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, Search, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import type { Competition } from "@shared/schema";
import { useState } from "react";
import SiteNavbar from "@/components/site-navbar";
import SiteFooter from "@/components/site-footer";
import { useLivery } from "@/hooks/use-livery";

export default function Competitions() {
  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
  });
  const [filter, setFilter] = useState("all");
  const { getImage, getMedia } = useLivery();

  const filtered = competitions?.filter((c) => {
    if (filter === "all") return c.status !== "draft";
    return c.status === filter;
  }) || [];

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNavbar />

      <section className="relative h-[270px] md:h-[340px] overflow-hidden">
        {getMedia("competitions_header", "/images/template/breadcumb2.jpg").type === "video" ? (
          <video src={getMedia("competitions_header", "/images/template/breadcumb2.jpg").url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${getImage("competitions_header", "/images/template/breadcumb2.jpg")}')` }} />
        )}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white text-center pt-10 pb-6 px-8 z-10 w-[calc(100%-60px)] max-w-[552px]">
          <p className="text-[#5f5f5f] text-base leading-relaxed mb-1">See what&apos;s new</p>
          <h2
            className="text-[30px] uppercase text-black font-normal leading-none"
            style={{ letterSpacing: "10px" }}
            data-testid="text-page-title"
          >
            Competitions
          </h2>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-center gap-2 mb-10">
          {["all", "active", "voting", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`inline-block px-3 py-1.5 text-[15px] border-2 transition-all duration-300 ${filter === f ? "border-black bg-transparent text-white" : "border-transparent bg-[#f4f4f4]/10 text-white/50 hover:border-white/30"}`}
              data-testid={`filter-${f}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i}>
                <Skeleton className="h-52 bg-white/5" />
                <div className="bg-black p-6">
                  <Skeleton className="h-5 w-3/4 mb-3 bg-white/10" />
                  <Skeleton className="h-4 w-full mb-2 bg-white/10" />
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

      <SiteFooter />
    </div>
  );
}

function CompetitionCard({ competition }: { competition: Competition }) {
  const { getImage } = useLivery();
  return (
    <div
      className="group transition-all duration-500 hover:shadow-[0_5px_80px_0_rgba(0,0,0,0.2)]"
      data-testid={`card-competition-${competition.id}`}
    >
      <Link href={`/competition/${competition.id}`}>
        <div className="cursor-pointer">
          <div className="overflow-hidden">
            <img
              src={competition.coverImage || getImage("competition_card_fallback", "/images/template/e1.jpg")}
              alt={competition.title}
              className="w-full h-52 object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
          <div className="bg-black group-hover:bg-[#f5f9fa] text-center py-6 px-4 transition-all duration-500">
            <h4
              className="text-white group-hover:text-black uppercase font-bold text-base mb-3 transition-colors duration-500"
              data-testid={`text-title-${competition.id}`}
            >
              {competition.title}
            </h4>
            <div className="mb-4">
              <span className="text-white/60 group-hover:text-black/60 text-[15px] transition-colors duration-500 inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {competition.endDate ? new Date(competition.endDate).toLocaleDateString() : "Open"}
              </span>
              <span className="text-white/40 group-hover:text-black/40 mx-3 transition-colors duration-500">|</span>
              <span className="text-white/60 group-hover:text-black/60 text-[15px] transition-colors duration-500 inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {competition.category}
              </span>
            </div>
            <span
              className="text-[11px] text-white group-hover:text-black uppercase border-b border-white group-hover:border-black pb-1 transition-colors duration-500"
              style={{ letterSpacing: "10px" }}
            >
              See Event
            </span>
          </div>
        </div>
      </Link>
      <div className="bg-black group-hover:bg-[#f5f9fa] border-t border-white/5 group-hover:border-black/10 px-4 pb-6 pt-4 flex flex-wrap items-center justify-center gap-3 transition-all duration-500">
        <Link
          href={`/join?competition=${competition.id}`}
          className="inline-block bg-[#FF5A09] text-white font-bold text-xs uppercase px-5 leading-[36px] border border-[#FF5A09] transition-all duration-500 hover:bg-transparent hover:text-[#FF5A09] cursor-pointer"
          style={{ letterSpacing: "2px" }}
          data-testid={`button-join-${competition.id}`}
        >
          Join Competition
        </Link>
        <Link
          href={`/host?competition=${competition.id}`}
          className="inline-block bg-transparent text-white group-hover:text-black font-bold text-xs uppercase px-5 leading-[36px] border border-white/30 group-hover:border-black/30 transition-all duration-500 hover:bg-white hover:text-black hover:border-white cursor-pointer"
          style={{ letterSpacing: "2px" }}
          data-testid={`button-host-${competition.id}`}
        >
          Host My Own Event
        </Link>
      </div>
    </div>
  );
}
