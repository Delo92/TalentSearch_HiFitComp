import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, User, Image as ImageIcon, Video, Save, Plus, LogOut, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TalentProfile, Competition } from "@shared/schema";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  user: any;
  profile: TalentProfile | null;
}

export default function TalentDashboard({ user, profile }: Props) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.displayName || user.displayName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [category, setCategory] = useState(profile?.category || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [imageUrls, setImageUrls] = useState<string[]>(profile?.imageUrls || []);
  const [videoUrls, setVideoUrls] = useState<string[]>(profile?.videoUrls || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  const { data: competitions } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
  });

  const { data: myContests } = useQuery<any[]>({
    queryKey: ["/api/contestants/me"],
    enabled: !!profile,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const data = { displayName, bio, category, location, imageUrls, videoUrls };
      if (profile) {
        await apiRequest("PATCH", "/api/talent-profiles/me", data);
      } else {
        await apiRequest("POST", "/api/talent-profiles", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/talent-profiles/me"] });
      toast({ title: "Profile saved!", description: "Your talent profile has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (competitionId: number) => {
      await apiRequest("POST", `/api/competitions/${competitionId}/apply`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contestants/me"] });
      toast({ title: "Applied!", description: "Your application has been submitted for review." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const addImage = () => {
    if (newImageUrl.trim()) {
      setImageUrls([...imageUrls, newImageUrl.trim()]);
      setNewImageUrl("");
    }
  };

  const addVideo = () => {
    if (newVideoUrl.trim()) {
      setVideoUrls([...videoUrls, newVideoUrl.trim()]);
      setNewVideoUrl("");
    }
  };

  const activeCompetitions = competitions?.filter(
    (c) => c.status === "active" || c.status === "voting"
  ) || [];
  const appliedIds = new Set(myContests?.map((c: any) => c.competitionId) || []);

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-serif text-xl font-bold">HiFitComp</span>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-2 ring-white/10">
              <AvatarImage src={user.profileImageUrl || ""} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-400 text-xs font-bold">
                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden sm:inline text-white/70">{user.displayName || user.email}</span>
            <Button size="icon" variant="ghost" className="text-white/40" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold" data-testid="text-dashboard-title">Talent Dashboard</h1>
          <p className="text-white/40 mt-1">Manage your profile and competition applications.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6 bg-white/5 border border-white/5">
            <TabsTrigger value="profile" data-testid="tab-profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
              <User className="h-4 w-4 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="competitions" data-testid="tab-competitions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
              <Trophy className="h-4 w-4 mr-1.5" /> Competitions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="rounded-md bg-white/5 border border-white/5 p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-white/60">Display Name</Label>
                  <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your stage name" data-testid="input-display-name"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category" className="text-white/60">Category</Label>
                  <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g., Music, Modeling, Bodybuilding" data-testid="input-category"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location" className="text-white/60">Location</Label>
                <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, State" data-testid="input-location"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio" className="text-white/60">Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself and your talent..."
                  className="min-h-[120px] resize-none bg-white/5 border-white/10 text-white placeholder:text-white/20" data-testid="input-bio" />
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-white/60">
                  <ImageIcon className="h-4 w-4 text-orange-400" /> Photos
                </Label>
                <div className="flex flex-wrap gap-2">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative group w-20 h-20 rounded-md overflow-hidden bg-white/5">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 invisible group-hover:visible"
                        data-testid={`button-remove-image-${i}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Paste image URL..." data-testid="input-new-image-url"
                    onKeyDown={(e) => e.key === "Enter" && addImage()}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                  <Button size="icon" variant="outline" onClick={addImage} data-testid="button-add-image" className="border-white/10 text-white/60">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="flex items-center gap-2 text-white/60">
                  <Video className="h-4 w-4 text-orange-400" /> Videos
                </Label>
                <div className="flex flex-wrap gap-2">
                  {videoUrls.map((url, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 bg-white/10 text-white/60">
                      Video {i + 1}
                      <button onClick={() => setVideoUrls(videoUrls.filter((_, idx) => idx !== i))} data-testid={`button-remove-video-${i}`}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newVideoUrl} onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="Paste video embed URL..." data-testid="input-new-video-url"
                    onKeyDown={(e) => e.key === "Enter" && addVideo()}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                  <Button size="icon" variant="outline" onClick={addVideo} data-testid="button-add-video" className="border-white/10 text-white/60">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending || !displayName.trim()}
                data-testid="button-save-profile" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">
                <Save className="h-4 w-4 mr-2" />
                {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="competitions">
            {!profile ? (
              <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                <User className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Create Your Profile First</h3>
                <p className="text-sm text-white/40">You need a talent profile before applying to competitions.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {myContests && myContests.length > 0 && (
                  <div>
                    <h3 className="font-bold mb-3 text-lg">My Applications</h3>
                    <div className="space-y-2">
                      {myContests.map((contest: any) => (
                        <div key={contest.id} className="rounded-md bg-white/5 border border-white/5 p-4 flex flex-wrap items-center justify-between gap-3" data-testid={`card-my-contest-${contest.id}`}>
                          <div>
                            <h4 className="font-medium">{contest.competitionTitle || "Competition"}</h4>
                            <p className="text-xs text-white/30">Applied {new Date(contest.appliedAt).toLocaleDateString()}</p>
                          </div>
                          <Badge className={`border-0 ${contest.applicationStatus === "approved" ? "bg-green-500/20 text-green-400" : contest.applicationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`} data-testid={`badge-app-status-${contest.id}`}>
                            {contest.applicationStatus}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-bold mb-3 text-lg">Available Competitions</h3>
                  {activeCompetitions.length > 0 ? (
                    <div className="space-y-2">
                      {activeCompetitions.map((comp) => (
                        <div key={comp.id} className="rounded-md bg-white/5 border border-white/5 p-4 flex flex-wrap items-center justify-between gap-3" data-testid={`card-available-comp-${comp.id}`}>
                          <div>
                            <h4 className="font-medium">{comp.title}</h4>
                            <p className="text-xs text-white/30">{comp.category}</p>
                          </div>
                          {appliedIds.has(comp.id) ? (
                            <Badge className="bg-orange-500/20 text-orange-400 border-0">Applied</Badge>
                          ) : (
                            <Button onClick={() => applyMutation.mutate(comp.id)} disabled={applyMutation.isPending}
                              data-testid={`button-apply-${comp.id}`} className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">
                              Apply
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                      <Trophy className="h-8 w-8 text-white/10 mx-auto mb-2" />
                      <p className="text-sm text-white/30">No active competitions right now.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
