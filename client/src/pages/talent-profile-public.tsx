import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, MapPin, ArrowLeft, Image as ImageIcon, Video } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="flex items-center gap-6 mb-8">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold">Profile not found</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold tracking-tight">StarVote</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/competitions" className="inline-flex items-center gap-1 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>

        <div className="flex flex-col md:flex-row items-start gap-6 mb-8">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.imageUrls?.[0] || ""} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
              {profile.displayName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-profile-name">{profile.displayName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {profile.category && <Badge data-testid="badge-category">{profile.category}</Badge>}
              {profile.location && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {profile.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {profile.bio && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <h2 className="font-semibold mb-2">About</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap" data-testid="text-bio">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {profile.imageUrls && profile.imageUrls.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Photos
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {profile.imageUrls.map((url, i) => (
                <div key={i} className="aspect-square rounded-md overflow-hidden bg-muted">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.videoUrls && profile.videoUrls.length > 0 && (
          <div className="mb-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" /> Videos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {profile.videoUrls.map((url, i) => (
                <div key={i} className="aspect-video rounded-md overflow-hidden bg-muted">
                  <iframe src={url} className="w-full h-full" allowFullScreen title={`Video ${i + 1}`} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
