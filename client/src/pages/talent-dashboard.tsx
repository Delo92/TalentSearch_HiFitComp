import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Trophy, User, Image as ImageIcon, Video, Save, Upload, LogOut, X, Trash2, Loader2, FolderOpen } from "lucide-react";
import { InviteDialog } from "@/components/invite-dialog";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAuthToken } from "@/hooks/use-auth";
import type { TalentProfile, Competition } from "@shared/schema";
import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import * as tus from "tus-js-client";

interface Props {
  user: any;
  profile: TalentProfile | null;
}

export default function TalentDashboard({ user, profile }: Props) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState(profile?.displayName || user.displayName || "");
  const [email, setEmail] = useState(profile?.email || user.email || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [category, setCategory] = useState(profile?.category || "");
  const [location, setLocation] = useState(profile?.location || "");
  const [selectedCompId, setSelectedCompId] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: competitions } = useQuery<Competition[]>({
    queryKey: ["/api/competitions"],
  });

  const { data: myContests } = useQuery<any[]>({
    queryKey: ["/api/contestants/me"],
    enabled: !!profile,
  });

  const { data: driveImages, isLoading: imagesLoading } = useQuery<any[]>({
    queryKey: ["/api/drive/images", selectedCompId],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`/api/drive/images?competitionId=${selectedCompId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load images");
      return res.json();
    },
    enabled: !!profile && !!selectedCompId,
  });

  const { data: vimeoVideos, isLoading: videosLoading } = useQuery<any[]>({
    queryKey: ["/api/vimeo/videos", selectedCompId],
    queryFn: async () => {
      const token = getAuthToken();
      const res = await fetch(`/api/vimeo/videos?competitionId=${selectedCompId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load videos");
      return res.json();
    },
    enabled: !!profile && !!selectedCompId,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      const data = { displayName, email, bio, category, location };
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

  const deleteImageMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await apiRequest("DELETE", `/api/drive/images/${fileId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/drive/images", selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ["/api/talent-profiles/me"] });
      toast({ title: "Deleted", description: "Image removed from Google Drive." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (videoUri: string) => {
      const videoId = videoUri.split("/").pop();
      await apiRequest("DELETE", `/api/vimeo/videos/${videoId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vimeo/videos", selectedCompId] });
      toast({ title: "Deleted", description: "Video removed from Vimeo." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompId) return;

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("competitionId", selectedCompId);

      const token = getAuthToken();
      const res = await fetch("/api/drive/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/drive/images", selectedCompId] });
      queryClient.invalidateQueries({ queryKey: ["/api/talent-profiles/me"] });
      toast({ title: "Uploaded!", description: "Your photo has been saved to Google Drive." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [selectedCompId, toast]);

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCompId) return;

    setVideoUploading(true);
    setVideoUploadProgress(0);
    try {
      const token = getAuthToken();
      const ticketRes = await fetch("/api/vimeo/upload-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          competitionId: selectedCompId,
        }),
      });

      if (!ticketRes.ok) {
        const err = await ticketRes.json();
        throw new Error(err.message || "Failed to get upload ticket");
      }

      const ticket = await ticketRes.json();

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          uploadUrl: ticket.uploadLink,
          onError: (error) => {
            reject(new Error(error.message || "Video upload failed"));
          },
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setVideoUploadProgress(pct);
          },
          onSuccess: () => {
            resolve();
          },
        });
        upload.start();
      });

      if (ticket.completeUri) {
        try {
          await fetch(`https://api.vimeo.com${ticket.completeUri}`, {
            method: "DELETE",
          });
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ["/api/vimeo/videos", selectedCompId] });
      toast({ title: "Uploaded!", description: "Your video has been saved to Vimeo." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setVideoUploading(false);
      setVideoUploadProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }, [selectedCompId, toast]);

  const activeCompetitions = competitions?.filter(
    (c) => c.status === "active" || c.status === "voting"
  ) || [];
  const appliedIds = new Set(myContests?.map((c: any) => c.competitionId) || []);
  const appliedContests = myContests?.filter((c: any) => c.applicationStatus === "approved" || c.applicationStatus === "pending") || [];

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
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold" data-testid="text-dashboard-title">Talent Dashboard</h1>
            <p className="text-white/40 mt-1">Manage your profile, media, and competition applications.</p>
          </div>
          <InviteDialog senderLevel={2} />
        </div>

        <Tabs defaultValue="profile">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-6">
            <TabsList className="inline-flex w-max sm:w-auto bg-white/5 border border-white/5">
              <TabsTrigger value="profile" data-testid="tab-profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
                <User className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="media" data-testid="tab-media" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
                <FolderOpen className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Media</span>
              </TabsTrigger>
              <TabsTrigger value="competitions" data-testid="tab-competitions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
                <Trophy className="h-4 w-4 mr-1.5" /> <span className="hidden sm:inline">Competitions</span>
              </TabsTrigger>
            </TabsList>
          </div>

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
                  <Label htmlFor="email" className="text-white/60">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com" data-testid="input-email"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/20" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <Button onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending || !displayName.trim()}
                data-testid="button-save-profile" className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white">
                <Save className="h-4 w-4 mr-2" />
                {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="media">
            {!profile ? (
              <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                <User className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Create Your Profile First</h3>
                <p className="text-sm text-white/40">You need a talent profile before uploading media.</p>
              </div>
            ) : appliedContests.length === 0 ? (
              <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                <Trophy className="h-10 w-10 text-white/20 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No Competitions Yet</h3>
                <p className="text-sm text-white/40">Apply to a competition in the Competitions tab first, then come back here to upload your photos and videos.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-md bg-white/5 border border-white/5 p-4">
                  <Label className="text-white/60 mb-2 block">Select Competition</Label>
                  <Select value={selectedCompId} onValueChange={setSelectedCompId}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-competition">
                      <SelectValue placeholder="Choose a competition to manage media..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10">
                      {appliedContests.map((c: any) => (
                        <SelectItem key={c.competitionId} value={String(c.competitionId)} className="text-white">
                          {c.competitionTitle || `Competition #${c.competitionId}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCompId && (
                  <>
                    <div className="rounded-md bg-white/5 border border-white/5 p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Label className="flex items-center gap-2 text-white/80 text-base font-semibold">
                          <ImageIcon className="h-5 w-5 text-orange-400" /> Photos
                        </Label>
                        <div>
                          <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            data-testid="input-image-file"
                          />
                          <Button
                            onClick={() => imageInputRef.current?.click()}
                            disabled={imageUploading}
                            data-testid="button-upload-image"
                            className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white"
                          >
                            {imageUploading ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                            ) : (
                              <><Upload className="h-4 w-4 mr-2" /> Upload Photo</>
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-white/30">Photos are uploaded to Google Drive in your competition folder.</p>

                      {imagesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                        </div>
                      ) : driveImages && driveImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {driveImages.map((img: any) => (
                            <div key={img.id} className="relative group rounded-md overflow-visible bg-white/5 aspect-square">
                              <img
                                src={`/api/drive/proxy/${img.id}`}
                                alt={img.name || "Photo"}
                                className="w-full h-full object-cover rounded-md"
                                loading="lazy"
                              />
                              <button
                                onClick={() => deleteImageMutation.mutate(img.id)}
                                className="absolute top-1 right-1 bg-red-600/90 text-white rounded-full p-1 invisible group-hover:visible transition-all"
                                data-testid={`button-delete-image-${img.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <ImageIcon className="h-8 w-8 text-white/10 mx-auto mb-2" />
                          <p className="text-sm text-white/30">No photos uploaded yet for this competition.</p>
                        </div>
                      )}
                    </div>

                    <div className="rounded-md bg-white/5 border border-white/5 p-6 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Label className="flex items-center gap-2 text-white/80 text-base font-semibold">
                          <Video className="h-5 w-5 text-orange-400" /> Videos
                        </Label>
                        <div>
                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={handleVideoUpload}
                            data-testid="input-video-file"
                          />
                          <Button
                            onClick={() => videoInputRef.current?.click()}
                            disabled={videoUploading}
                            data-testid="button-upload-video"
                            className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white"
                          >
                            {videoUploading ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                            ) : (
                              <><Upload className="h-4 w-4 mr-2" /> Upload Video</>
                            )}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-white/30">Videos are uploaded to Vimeo in your competition folder.</p>

                      {videoUploading && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-white/60">Uploading video...</span>
                            <span className="text-orange-400 font-medium">{videoUploadProgress}%</span>
                          </div>
                          <Progress value={videoUploadProgress} className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-orange-500 [&>div]:to-amber-500" />
                        </div>
                      )}

                      {videosLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                        </div>
                      ) : vimeoVideos && vimeoVideos.length > 0 ? (
                        <div className="space-y-3">
                          {vimeoVideos.map((vid: any) => (
                            <div key={vid.uri} className="rounded-md bg-white/5 border border-white/10 p-3 flex flex-wrap items-center gap-3" data-testid={`card-video-${vid.uri}`}>
                              {vid.thumbnail && (
                                <img src={vid.thumbnail} alt={vid.name} className="w-24 h-16 sm:w-32 sm:h-20 object-cover rounded-md flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">{vid.name}</h4>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {vid.duration > 0 && (
                                    <span className="text-xs text-white/30">{Math.floor(vid.duration / 60)}:{String(vid.duration % 60).padStart(2, "0")}</span>
                                  )}
                                  <Badge className={`border-0 text-xs ${vid.status === "available" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                                    {vid.status === "available" ? "Ready" : vid.status === "uploading" ? "Uploading" : "Processing"}
                                  </Badge>
                                </div>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-red-400 flex-shrink-0"
                                onClick={() => deleteVideoMutation.mutate(vid.uri)}
                                disabled={deleteVideoMutation.isPending}
                                data-testid={`button-delete-video-${vid.uri}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Video className="h-8 w-8 text-white/10 mx-auto mb-2" />
                          <p className="text-sm text-white/30">No videos uploaded yet for this competition.</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
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
