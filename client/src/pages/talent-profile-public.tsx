import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, MapPin, Tag, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { TalentProfile } from "@shared/schema";

export default function TalentProfilePublic() {
  const [, params] = useRoute("/talent/:id");
  const id = params?.id;

  const { data: profile, isLoading } = useQuery<TalentProfile>({
    queryKey: ["/api/talent-profiles", id],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <Skeleton className="h-40 w-40 rounded-full mx-auto mb-6 bg-white/5" />
          <Skeleton className="h-8 w-1/3 mx-auto mb-4 bg-white/10" />
          <Skeleton className="h-4 w-1/2 mx-auto bg-white/10" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Profile not found</h3>
          <Link href="/competitions">
            <Button variant="ghost" className="mt-4 text-orange-400">Back to Competitions</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mainImage = profile.imageUrls?.[0] || "/images/template/a1.jpg";

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
        </div>
      </nav>

      <div className="relative h-64 md:h-80 overflow-hidden">
        <img src={mainImage} alt="" className="w-full h-full object-cover blur-sm scale-110" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
        <div className="text-center mb-10">
          <div className="inline-block rounded-full ring-4 ring-black overflow-hidden h-32 w-32 md:h-40 md:w-40 mb-4">
            <img src={mainImage} alt={profile.displayName} className="w-full h-full object-cover" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold" data-testid="text-profile-name">{profile.displayName}</h1>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-sm text-white/40">
            {profile.category && (
              <span className="flex items-center gap-1.5" data-testid="text-category">
                <Tag className="h-4 w-4 text-orange-400/50" /> {profile.category}
              </span>
            )}
            {profile.location && (
              <span className="flex items-center gap-1.5" data-testid="text-location">
                <MapPin className="h-4 w-4 text-orange-400/50" /> {profile.location}
              </span>
            )}
          </div>
        </div>

        {profile.bio && (
          <div className="mb-10 p-6 rounded-md bg-white/5 border border-white/5">
            <p className="text-white/50 leading-relaxed text-lg" data-testid="text-bio">{profile.bio}</p>
          </div>
        )}

        {profile.imageUrls && profile.imageUrls.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-orange-400" /> Gallery
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {profile.imageUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-white/5">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pb-10">
          <Link href="/competitions">
            <Button variant="ghost" className="text-orange-400">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Competitions
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
