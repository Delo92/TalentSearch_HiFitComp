import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Trophy, BarChart3, Users, Plus, Check, X as XIcon, LogOut, Vote, Flame, Image, Upload, RotateCcw } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Competition, SiteLivery } from "@shared/schema";
import { useState, useRef } from "react";
import { useAuth, getAuthToken } from "@/hooks/use-auth";

interface AdminStats {
  totalCompetitions: number;
  totalTalentProfiles: number;
  totalContestants: number;
  totalVotes: number;
  pendingApplications: number;
}

interface ContestantAdmin {
  id: number;
  competitionId: number;
  talentProfileId: number;
  applicationStatus: string;
  appliedAt: string;
  competitionTitle: string;
  talentProfile: {
    id: number;
    displayName: string;
    bio: string | null;
    category: string | null;
    imageUrls: string[] | null;
  };
}

export default function AdminDashboard({ user }: { user: any }) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [compCategory, setCompCategory] = useState("");
  const [compStatus, setCompStatus] = useState("active");
  const [maxVotes, setMaxVotes] = useState("10");
  const [voteCost, setVoteCost] = useState("0");

  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });
  const { data: competitions } = useQuery<Competition[]>({ queryKey: ["/api/competitions"] });
  const { data: allContestants } = useQuery<ContestantAdmin[]>({ queryKey: ["/api/admin/contestants"] });
  const { data: liveryItems } = useQuery<SiteLivery[]>({ queryKey: ["/api/livery"] });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/competitions", {
        title,
        description,
        category: compCategory,
        status: compStatus,
        maxVotesPerDay: parseInt(maxVotes) || 10,
        voteCost: parseInt(voteCost) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setCompCategory("");
      toast({ title: "Competition created!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await apiRequest("PATCH", `/api/admin/contestants/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contestants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Status updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const updateCompMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      await apiRequest("PATCH", `/api/competitions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: "Competition updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const uploadLiveryMutation = useMutation({
    mutationFn: async ({ imageKey, file }: { imageKey: string; file: File }) => {
      const formData = new FormData();
      formData.append("image", file);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/livery/${imageKey}`, {
        method: "PUT",
        body: formData,
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livery"] });
      toast({ title: "Image updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const resetLiveryMutation = useMutation({
    mutationFn: async (imageKey: string) => {
      await apiRequest("DELETE", `/api/admin/livery/${imageKey}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livery"] });
      toast({ title: "Reset to default!" });
    },
    onError: (err: Error) => {
      toast({ title: "Reset failed", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleFileSelect = (imageKey: string, file: File) => {
    uploadLiveryMutation.mutate({ imageKey, file });
  };

  const pending = allContestants?.filter((c) => c.applicationStatus === "pending") || [];

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
            <Badge className="bg-orange-500/20 text-orange-400 border-0">Admin</Badge>
            <Avatar className="h-8 w-8 ring-2 ring-white/10">
              <AvatarImage src={user.profileImageUrl || ""} />
              <AvatarFallback className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-400 text-xs font-bold">
                {(user.displayName || user.email || "A").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button size="icon" variant="ghost" className="text-white/40" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold" data-testid="text-admin-title">Admin Dashboard</h1>
            <p className="text-white/40 mt-1">Manage competitions, applications, and analytics.</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white" data-testid="button-create-competition">
                <Plus className="h-4 w-4 mr-2" /> New Competition
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl">Create Competition</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-white/60">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Competition title"
                    className="bg-white/5 border-white/10 text-white" data-testid="input-comp-title" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/60">Category</Label>
                  <Input value={compCategory} onChange={(e) => setCompCategory(e.target.value)} placeholder="e.g., Music, Modeling"
                    className="bg-white/5 border-white/10 text-white" data-testid="input-comp-category" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/60">Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the competition..."
                    className="bg-white/5 border-white/10 text-white resize-none min-h-[80px]" data-testid="input-comp-description" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Status</Label>
                    <Select value={compStatus} onValueChange={setCompStatus}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-comp-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="voting">Voting</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Max Votes/Day</Label>
                    <Input type="number" value={maxVotes} onChange={(e) => setMaxVotes(e.target.value)}
                      className="bg-white/5 border-white/10 text-white" data-testid="input-max-votes" />
                  </div>
                </div>
                <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !title.trim() || !compCategory.trim()}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white" data-testid="button-submit-competition">
                  {createMutation.isPending ? "Creating..." : "Create Competition"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Competitions", value: stats.totalCompetitions, icon: Trophy },
              { label: "Talent Profiles", value: stats.totalTalentProfiles, icon: Users },
              { label: "Contestants", value: stats.totalContestants, icon: Flame },
              { label: "Total Votes", value: stats.totalVotes, icon: Vote },
              { label: "Pending", value: stats.pendingApplications, icon: BarChart3 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-md bg-white/5 border border-white/5 p-4" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
                <stat.icon className="h-5 w-5 text-orange-400/60 mb-2" />
                <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">{stat.value}</p>
                <p className="text-xs text-white/30 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="competitions">
          <TabsList className="mb-6 bg-white/5 border border-white/5">
            <TabsTrigger value="competitions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
              Competitions
            </TabsTrigger>
            <TabsTrigger value="applications" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white">
              Applications {pending.length > 0 && <Badge className="ml-2 bg-orange-500 text-white border-0">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="livery" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white" data-testid="tab-livery">
              <Image className="h-4 w-4 mr-1" /> Livery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="competitions">
            <div className="space-y-3">
              {competitions?.map((comp) => (
                <div key={comp.id} className="rounded-md bg-white/5 border border-white/5 p-5" data-testid={`admin-comp-${comp.id}`}>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg">{comp.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs text-white/30">{comp.category}</span>
                        <Badge className={`border-0 ${comp.status === "active" || comp.status === "voting" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"}`}>
                          {comp.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={comp.status} onValueChange={(val) => updateCompMutation.mutate({ id: comp.id, data: { status: val } })}>
                        <SelectTrigger className="w-32 bg-white/5 border-white/10 text-white text-sm" data-testid={`select-status-${comp.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="voting">Voting</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="applications">
            {allContestants && allContestants.length > 0 ? (
              <div className="space-y-3">
                {allContestants.map((contestant) => (
                  <div key={contestant.id} className="rounded-md bg-white/5 border border-white/5 p-4" data-testid={`admin-contestant-${contestant.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contestant.talentProfile.imageUrls?.[0] || ""} />
                          <AvatarFallback className="bg-orange-500/20 text-orange-400 text-sm font-bold">
                            {contestant.talentProfile.displayName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{contestant.talentProfile.displayName}</h4>
                          <p className="text-xs text-white/30">{contestant.competitionTitle} | {contestant.talentProfile.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`border-0 ${contestant.applicationStatus === "approved" ? "bg-green-500/20 text-green-400" : contestant.applicationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {contestant.applicationStatus}
                        </Badge>
                        {contestant.applicationStatus === "pending" && (
                          <>
                            <Button size="icon" onClick={() => updateStatusMutation.mutate({ id: contestant.id, status: "approved" })}
                              className="bg-green-500/20 text-green-400 border-0" data-testid={`button-approve-${contestant.id}`}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" onClick={() => updateStatusMutation.mutate({ id: contestant.id, status: "rejected" })}
                              className="bg-red-500/20 text-red-400 border-0" data-testid={`button-reject-${contestant.id}`}>
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                <Users className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">No applications yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="livery">
            <div className="mb-4">
              <p className="text-white/40 text-sm">Upload replacement images for any template slot. Click "Upload" to replace or "Reset" to restore the original.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveryItems?.map((item) => {
                const displayUrl = item.imageUrl || item.defaultUrl;
                const isCustom = !!item.imageUrl;
                return (
                  <div key={item.imageKey} className="rounded-md bg-white/5 border border-white/5 overflow-visible" data-testid={`livery-item-${item.imageKey}`}>
                    <div className="relative aspect-video bg-black/50">
                      <img
                        src={displayUrl}
                        alt={item.label}
                        className="w-full h-full object-cover"
                        data-testid={`livery-img-${item.imageKey}`}
                      />
                      {isCustom && (
                        <Badge className="absolute top-2 right-2 bg-orange-500 text-white border-0 text-xs">Custom</Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm mb-0.5" data-testid={`livery-label-${item.imageKey}`}>{item.label}</h4>
                      <p className="text-xs text-white/30 mb-3 font-mono">{item.imageKey}</p>
                      <div className="flex items-center gap-2">
                        <input
                          ref={(el) => { fileInputRefs.current[item.imageKey] = el; }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileSelect(item.imageKey, file);
                            e.target.value = "";
                          }}
                          data-testid={`input-livery-upload-${item.imageKey}`}
                        />
                        <Button
                          size="sm"
                          onClick={() => fileInputRefs.current[item.imageKey]?.click()}
                          disabled={uploadLiveryMutation.isPending}
                          className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white text-xs"
                          data-testid={`button-upload-${item.imageKey}`}
                        >
                          <Upload className="h-3 w-3 mr-1" /> Upload
                        </Button>
                        {isCustom && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resetLiveryMutation.mutate(item.imageKey)}
                            disabled={resetLiveryMutation.isPending}
                            className="text-white/40 text-xs"
                            data-testid={`button-reset-${item.imageKey}`}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" /> Reset
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {(!liveryItems || liveryItems.length === 0) && (
              <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                <Image className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">No livery items configured yet. Restart the app to seed defaults.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
