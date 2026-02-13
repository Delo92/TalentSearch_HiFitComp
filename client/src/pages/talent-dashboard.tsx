import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Trophy, User, Image as ImageIcon, Video, Save, Plus, LogOut, X } from "lucide-react";
import { Link } from "wouter";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User as AuthUser } from "@shared/models/auth";
import type { TalentProfile, Competition } from "@shared/schema";
import { useState } from "react";

interface Props {
  user: AuthUser;
  profile: TalentProfile | null;
}

export default function TalentDashboard({ user, profile }: Props) {
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.displayName || user.firstName || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [category, setCategory] = useState(profile?.category || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [imageUrls, setImageUrls] = useState<string[]>(profile?.imageUrls || []);
  const [videoUrls, setVideoUrls] = useState<string[]>(profile?.videoUrls || []);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

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
      setApplyDialogOpen(false);
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
  const appliedIds = new Set(myContests?.map((c) => c.competitionId) || []);

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-serif text-xl font-bold tracking-tight">StarVote</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.profileImageUrl || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                  {(user.firstName || user.email || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{user.firstName || user.email}</span>
            </div>
            <a href="/api/logout">
              <Button size="icon" variant="ghost" data-testid="button-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold" data-testid="text-dashboard-title">Talent Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and competitions.</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" data-testid="tab-profile">
              <User className="h-4 w-4 mr-1.5" /> Profile
            </TabsTrigger>
            <TabsTrigger value="competitions" data-testid="tab-competitions">
              <Trophy className="h-4 w-4 mr-1.5" /> Competitions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your stage name"
                      data-testid="input-display-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., Music, Modeling, Bodybuilding"
                      data-testid="input-category"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, State"
                    data-testid="input-location"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself and your talent..."
                    className="min-h-[120px] resize-none"
                    data-testid="input-bio"
                  />
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-primary" /> Photos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {imageUrls.map((url, i) => (
                      <div key={i} className="relative group w-20 h-20 rounded-md overflow-hidden bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                          className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 invisible group-hover:visible"
                          data-testid={`button-remove-image-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      data-testid="input-new-image-url"
                      onKeyDown={(e) => e.key === "Enter" && addImage()}
                    />
                    <Button size="icon" variant="outline" onClick={addImage} data-testid="button-add-image">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-primary" /> Videos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {videoUrls.map((url, i) => (
                      <Badge key={i} variant="secondary" className="gap-1">
                        Video {i + 1}
                        <button
                          onClick={() => setVideoUrls(videoUrls.filter((_, idx) => idx !== i))}
                          data-testid={`button-remove-video-${i}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      placeholder="Paste video embed URL..."
                      data-testid="input-new-video-url"
                      onKeyDown={(e) => e.key === "Enter" && addVideo()}
                    />
                    <Button size="icon" variant="outline" onClick={addVideo} data-testid="button-add-video">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => saveProfileMutation.mutate()}
                  disabled={saveProfileMutation.isPending || !displayName.trim()}
                  data-testid="button-save-profile"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="competitions">
            {!profile ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <User className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">Create Your Profile First</h3>
                  <p className="text-sm text-muted-foreground">You need a talent profile before applying to competitions.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {myContests && myContests.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">My Applications</h3>
                    <div className="space-y-2">
                      {myContests.map((contest: any) => (
                        <Card key={contest.id} data-testid={`card-my-contest-${contest.id}`}>
                          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="font-medium">{contest.competitionTitle || "Competition"}</h4>
                              <p className="text-xs text-muted-foreground">Applied {new Date(contest.appliedAt).toLocaleDateString()}</p>
                            </div>
                            <Badge
                              className={
                                contest.applicationStatus === "approved"
                                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                  : contest.applicationStatus === "rejected"
                                  ? "bg-destructive/10 text-destructive"
                                  : ""
                              }
                              data-testid={`badge-app-status-${contest.id}`}
                            >
                              {contest.applicationStatus}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold">Available Competitions</h3>
                  </div>
                  {activeCompetitions.length > 0 ? (
                    <div className="space-y-2">
                      {activeCompetitions.map((comp) => (
                        <Card key={comp.id} data-testid={`card-available-comp-${comp.id}`}>
                          <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h4 className="font-medium">{comp.title}</h4>
                              <p className="text-xs text-muted-foreground">{comp.category}</p>
                            </div>
                            {appliedIds.has(comp.id) ? (
                              <Badge>Applied</Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => applyMutation.mutate(comp.id)}
                                disabled={applyMutation.isPending}
                                data-testid={`button-apply-${comp.id}`}
                              >
                                Apply
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-6 text-center">
                        <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No active competitions right now.</p>
                      </CardContent>
                    </Card>
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
