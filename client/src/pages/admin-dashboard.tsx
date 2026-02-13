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
import { Trophy, BarChart3, Users, Plus, Check, X as XIcon, LogOut, Vote, Flame, Image, Upload, RotateCcw, UserPlus, Megaphone, Settings, DollarSign, Eye, Search, ExternalLink, Music, Video, Calendar, Award, UserCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

interface JoinHostSettings {
  mode: "request" | "purchase";
  price: number;
  pageTitle: string;
  pageDescription: string;
  requiredFields: string[];
  isActive: boolean;
}

interface JoinSubmission {
  id: string;
  competitionId: number | null;
  fullName: string;
  email: string;
  phone: string | null;
  bio: string | null;
  category: string | null;
  status: "pending" | "approved" | "rejected";
  transactionId: string | null;
  amountPaid: number;
  createdAt: string;
}

interface HostSubmission {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  organization: string | null;
  eventName: string;
  eventDescription: string | null;
  eventCategory: string | null;
  eventDate: string | null;
  status: "pending" | "approved" | "rejected";
  transactionId: string | null;
  amountPaid: number;
  createdAt: string;
}

interface CompDetailContestant {
  id: number;
  talentProfileId: number;
  applicationStatus: string;
  appliedAt: string | null;
  displayName: string;
  stageName: string | null;
  category: string | null;
  imageUrls: string[] | null;
  bio: string | null;
  voteCount: number;
}

interface CompDetailHost {
  id: string;
  fullName: string;
  email: string;
  organization: string | null;
  eventName: string;
  status: string;
  amountPaid: number;
}

interface CompDetailResponse {
  competition: Competition;
  totalVotes: number;
  hosts: CompDetailHost[];
  contestants: CompDetailContestant[];
}

interface TalentUser {
  id: number;
  userId: string;
  displayName: string;
  stageName: string | null;
  bio: string | null;
  category: string | null;
  imageUrls: string[] | null;
  role: string;
}

interface VotingStat {
  competitionId: number;
  competitionTitle: string;
  competitionStatus: string;
  applicationStatus: string;
  voteCount: number;
  totalVotes: number;
  votePercentage: number;
  rank: number | null;
  totalContestants: number;
}

interface DriveImage {
  id: string;
  name: string;
  imageUrl: string;
  thumbnailUrl: string;
}

interface VimeoVideo {
  uri: string;
  name: string;
  link: string;
  embedUrl: string;
  duration: number;
  thumbnail: string | null;
  competitionFolder: string | null;
}

interface UserDetailResponse {
  profile: TalentUser & { email: string | null; level: number; socialLinks: string | null };
  activeStats: VotingStat[];
  pastStats: VotingStat[];
  upcomingEvents: VotingStat[];
  driveImages: DriveImage[];
  vimeoVideos: VimeoVideo[];
}

function CompetitionDetailModal({ compId }: { compId: number }) {
  const { data, isLoading } = useQuery<CompDetailResponse>({
    queryKey: ["/api/admin/competitions", compId, "detail"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="comp-detail-loading">
        <div className="text-white/40 text-sm">Loading competition details...</div>
      </div>
    );
  }

  if (!data) return <div className="text-white/40 text-sm py-8 text-center">Failed to load details.</div>;

  const { competition, totalVotes, hosts, contestants } = data;

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1" data-testid="comp-detail-content">
      <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="comp-detail-info">
        <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Competition Info</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-white/40">Title</p>
            <p className="font-medium" data-testid="comp-detail-title">{competition.title}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Category</p>
            <p className="font-medium" data-testid="comp-detail-category">{competition.category}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Status</p>
            <Badge className={`border-0 ${competition.status === "active" || competition.status === "voting" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"}`} data-testid="comp-detail-status">
              {competition.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-white/40">Total Votes</p>
            <p className="font-bold text-lg bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid="comp-detail-votes">{totalVotes}</p>
          </div>
        </div>
      </div>

      {hosts.length > 0 && (
        <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="comp-detail-hosts">
          <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Host(s)</h3>
          <div className="space-y-2">
            {hosts.map((host) => (
              <div key={host.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 p-3" data-testid={`comp-host-${host.id}`}>
                <div>
                  <p className="font-medium text-sm">{host.fullName}</p>
                  <p className="text-xs text-white/30">{host.email} {host.organization && `| ${host.organization}`}</p>
                </div>
                <Badge className={`border-0 ${host.status === "approved" ? "bg-green-500/20 text-green-400" : host.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {host.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div data-testid="comp-detail-contestants">
        <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Contestants ({contestants.length})</h3>
        {contestants.length > 0 ? (
          <div className="space-y-2">
            {contestants.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 border border-white/5 p-3" data-testid={`comp-contestant-${c.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.imageUrls?.[0] || ""} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-bold">
                      {c.displayName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm" data-testid={`contestant-name-${c.id}`}>{c.displayName}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {c.stageName && <span className="text-xs text-white/40" data-testid={`contestant-stage-${c.id}`}>{c.stageName}</span>}
                      {c.category && <span className="text-xs text-white/30">{c.category}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid={`contestant-votes-${c.id}`}>{c.voteCount}</p>
                    <p className="text-[10px] text-white/30">votes</p>
                  </div>
                  <Badge className={`border-0 text-xs ${c.applicationStatus === "approved" ? "bg-green-500/20 text-green-400" : c.applicationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`} data-testid={`contestant-status-${c.id}`}>
                    {c.applicationStatus}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-white/5 border border-white/5 p-4 text-center">
            <p className="text-sm text-white/30">No contestants in this competition.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TalentDetailModal({ profileId, competitions }: { profileId: number; competitions: Competition[] | undefined }) {
  const { toast } = useToast();
  const [assignCompId, setAssignCompId] = useState("");

  const { data, isLoading } = useQuery<UserDetailResponse>({
    queryKey: ["/api/admin/users", profileId, "detail"],
  });

  const assignMutation = useMutation({
    mutationFn: async ({ pId, competitionId }: { pId: number; competitionId: number }) => {
      await apiRequest("POST", `/api/admin/users/${pId}/assign`, { competitionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", profileId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/contestants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setAssignCompId("");
      toast({ title: "Talent assigned to competition!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" data-testid="user-detail-loading">
        <div className="text-white/40 text-sm">Loading talent details...</div>
      </div>
    );
  }

  if (!data) return <div className="text-white/40 text-sm py-8 text-center">Failed to load details.</div>;

  const { profile, activeStats, pastStats, upcomingEvents, driveImages, vimeoVideos } = data;

  let socialLinksObj: Record<string, string> = {};
  if (profile.socialLinks) {
    try { socialLinksObj = typeof profile.socialLinks === "string" ? JSON.parse(profile.socialLinks) : profile.socialLinks; } catch {}
  }

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1" data-testid="user-detail-content">
      <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="user-detail-header">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-orange-500/30">
            <AvatarImage src={profile.imageUrls?.[0] || ""} />
            <AvatarFallback className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 text-orange-400 text-lg font-bold">
              {profile.displayName?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg" data-testid="user-detail-name">{profile.displayName}</h3>
            {profile.stageName && <p className="text-sm text-white/50" data-testid="user-detail-stage">{profile.stageName}</p>}
            {profile.email && <p className="text-xs text-white/30 mt-1" data-testid="user-detail-email">{profile.email}</p>}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {profile.category && <Badge className="bg-orange-500/20 text-orange-400 border-0" data-testid="user-detail-category">{profile.category}</Badge>}
              <Badge className="bg-white/10 text-white/60 border-0" data-testid="user-detail-level">Level {profile.level}</Badge>
            </div>
            {profile.bio && <p className="text-xs text-white/40 mt-2 line-clamp-3" data-testid="user-detail-bio">{profile.bio}</p>}
            {Object.keys(socialLinksObj).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(socialLinksObj).map(([platform, url]) => (
                  <a key={platform} href={url as string} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-400 flex items-center gap-1" data-testid={`social-link-${platform}`}>
                    <ExternalLink className="h-3 w-3" /> {platform}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(driveImages.length > 0 || vimeoVideos.length > 0) && (
        <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="user-detail-media">
          <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Media</h3>
          {driveImages.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Image className="h-3 w-3" /> Photos ({driveImages.length})</p>
              <div className="grid grid-cols-4 gap-2">
                {driveImages.slice(0, 8).map((img) => (
                  <a key={img.id} href={img.imageUrl} target="_blank" rel="noopener noreferrer" className="block" data-testid={`drive-img-${img.id}`}>
                    <img src={img.thumbnailUrl} alt={img.name} className="w-full aspect-square object-cover rounded-md" />
                  </a>
                ))}
              </div>
              {driveImages.length > 8 && <p className="text-xs text-white/20 mt-1">+{driveImages.length - 8} more</p>}
            </div>
          )}
          {vimeoVideos.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-2 flex items-center gap-1"><Video className="h-3 w-3" /> Videos ({vimeoVideos.length})</p>
              <div className="space-y-2">
                {vimeoVideos.slice(0, 4).map((vid) => (
                  <a key={vid.uri} href={vid.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md bg-white/5 p-2" data-testid={`vimeo-vid-${vid.uri}`}>
                    {vid.thumbnail && <img src={vid.thumbnail} alt={vid.name} className="w-16 h-10 object-cover rounded" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{vid.name}</p>
                      {vid.competitionFolder && <p className="text-xs text-white/30">{vid.competitionFolder}</p>}
                    </div>
                    <ExternalLink className="h-3 w-3 text-white/30 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {(activeStats.length > 0 || pastStats.length > 0) && (
        <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="user-detail-voting">
          <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Voting Stats</h3>
          {activeStats.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-white/40 mb-2 font-semibold">Active Competitions</p>
              <div className="space-y-2">
                {activeStats.map((s) => (
                  <div key={s.competitionId} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 p-3" data-testid={`active-stat-${s.competitionId}`}>
                    <div>
                      <p className="text-sm font-medium">{s.competitionTitle}</p>
                      <p className="text-xs text-white/30">{s.applicationStatus}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-sm font-bold text-orange-400">{s.voteCount}</p>
                        <p className="text-[10px] text-white/30">votes</p>
                      </div>
                      {s.rank && (
                        <div>
                          <p className="text-sm font-bold">#{s.rank}</p>
                          <p className="text-[10px] text-white/30">of {s.totalContestants}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold">{s.votePercentage}%</p>
                        <p className="text-[10px] text-white/30">share</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pastStats.length > 0 && (
            <div>
              <p className="text-xs text-white/40 mb-2 font-semibold">Past Competitions</p>
              <div className="space-y-2">
                {pastStats.map((s) => (
                  <div key={s.competitionId} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 p-3" data-testid={`past-stat-${s.competitionId}`}>
                    <div>
                      <p className="text-sm font-medium">{s.competitionTitle}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-sm font-bold text-white/60">{s.voteCount}</p>
                        <p className="text-[10px] text-white/30">votes</p>
                      </div>
                      {s.rank && (
                        <div>
                          <p className="text-sm font-bold text-white/60">#{s.rank}</p>
                          <p className="text-[10px] text-white/30">of {s.totalContestants}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-bold text-white/60">{s.votePercentage}%</p>
                        <p className="text-[10px] text-white/30">share</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {upcomingEvents.length > 0 && (
        <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="user-detail-upcoming">
          <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Upcoming Events</h3>
          <div className="space-y-2">
            {upcomingEvents.map((e) => (
              <div key={e.competitionId} className="flex items-center gap-3 rounded-md bg-white/5 p-3" data-testid={`upcoming-event-${e.competitionId}`}>
                <Calendar className="h-4 w-4 text-orange-400/60 shrink-0" />
                <p className="text-sm font-medium">{e.competitionTitle}</p>
                <Badge className="bg-white/10 text-white/60 border-0 ml-auto">{e.competitionStatus}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="user-detail-assign">
        <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Assign to Competition</h3>
        <div className="flex items-center gap-3">
          <Select value={assignCompId} onValueChange={setAssignCompId}>
            <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white" data-testid="select-assign-competition">
              <SelectValue placeholder="Select competition..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              {competitions?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={() => assignCompId && assignMutation.mutate({ pId: profileId, competitionId: parseInt(assignCompId) })}
            disabled={!assignCompId || assignMutation.isPending}
            className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white"
            data-testid="button-assign-competition"
          >
            <UserCheck className="h-4 w-4 mr-1" /> {assignMutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </div>
      </div>
    </div>
  );
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
  const [compDetailId, setCompDetailId] = useState<number | null>(null);
  const [userDetailId, setUserDetailId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });
  const { data: competitions } = useQuery<Competition[]>({ queryKey: ["/api/competitions"] });
  const { data: allContestants } = useQuery<ContestantAdmin[]>({ queryKey: ["/api/admin/contestants"] });
  const { data: liveryItems } = useQuery<SiteLivery[]>({ queryKey: ["/api/livery"] });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: joinSettings } = useQuery<JoinHostSettings>({ queryKey: ["/api/join/settings"] });
  const { data: joinSubmissions } = useQuery<JoinSubmission[]>({ queryKey: ["/api/admin/join/submissions"] });
  const { data: hostSettings } = useQuery<JoinHostSettings>({ queryKey: ["/api/host/settings"] });
  const { data: hostSubmissions } = useQuery<HostSubmission[]>({ queryKey: ["/api/admin/host/submissions"] });

  const { data: talentUsers, isLoading: usersLoading } = useQuery<TalentUser[]>({ queryKey: ["/api/admin/users"] });

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

  const updateLiveryTextMutation = useMutation({
    mutationFn: async ({ imageKey, textContent }: { imageKey: string; textContent: string }) => {
      await apiRequest("PUT", `/api/admin/livery/${imageKey}/text`, { textContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/livery"] });
      toast({ title: "Text updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const updateJoinSettingsMutation = useMutation({
    mutationFn: async (data: Partial<JoinHostSettings>) => {
      await apiRequest("PUT", "/api/admin/join/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/join/settings"] });
      toast({ title: "Join settings updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const updateJoinSubmissionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/admin/join/submissions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/join/submissions"] });
      toast({ title: "Submission updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const updateHostSettingsMutation = useMutation({
    mutationFn: async (data: Partial<JoinHostSettings>) => {
      await apiRequest("PUT", "/api/admin/host/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/host/settings"] });
      toast({ title: "Host settings updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const updateHostSubmissionMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/admin/host/submissions/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/host/submissions"] });
      toast({ title: "Submission updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleFileSelect = (imageKey: string, file: File) => {
    uploadLiveryMutation.mutate({ imageKey, file });
  };

  const pending = allContestants?.filter((c) => c.applicationStatus === "pending") || [];

  const filteredUsers = talentUsers?.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.stageName?.toLowerCase().includes(q) ||
      u.category?.toLowerCase().includes(q)
    );
  });

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
            <TabsTrigger value="join" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white" data-testid="tab-join">
              <UserPlus className="h-4 w-4 mr-1" /> Join
            </TabsTrigger>
            <TabsTrigger value="host" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white" data-testid="tab-host">
              <Megaphone className="h-4 w-4 mr-1" /> Host
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white" data-testid="tab-users">
              <Users className="h-4 w-4 mr-1" /> Users
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCompDetailId(comp.id)}
                        className="text-orange-400"
                        data-testid={`button-view-detail-${comp.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" /> View Details
                      </Button>
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
              <p className="text-white/40 text-sm">Upload replacement images or short videos (15 seconds max) for any template slot. Click "Upload" to replace or "Reset" to restore the original.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveryItems?.filter((item: any) => item.itemType !== "text").map((item: any) => {
                const displayUrl = item.imageUrl || item.defaultUrl;
                const isCustom = !!item.imageUrl;
                const isVideo = item.mediaType === "video";
                return (
                  <div key={item.imageKey} className="rounded-md bg-white/5 border border-white/5 overflow-visible" data-testid={`livery-item-${item.imageKey}`}>
                    <div className="relative aspect-video bg-black/50">
                      {isVideo ? (
                        <video
                          src={displayUrl}
                          className="w-full h-full object-cover"
                          muted
                          loop
                          autoPlay
                          playsInline
                          data-testid={`livery-video-${item.imageKey}`}
                        />
                      ) : (
                        <img
                          src={displayUrl}
                          alt={item.label}
                          className="w-full h-full object-cover"
                          data-testid={`livery-img-${item.imageKey}`}
                        />
                      )}
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {isVideo && (
                          <Badge className="bg-blue-500 text-white border-0 text-xs">Video</Badge>
                        )}
                        {isCustom && (
                          <Badge className="bg-orange-500 text-white border-0 text-xs">Custom</Badge>
                        )}
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-medium text-sm mb-0.5" data-testid={`livery-label-${item.imageKey}`}>{item.label}</h4>
                      <p className="text-xs text-white/30 mb-3 font-mono">{item.imageKey}</p>
                      <div className="flex items-center gap-2">
                        <input
                          ref={(el) => { fileInputRefs.current[item.imageKey] = el; }}
                          type="file"
                          accept="image/*,video/mp4,video/webm,video/quicktime"
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
            {liveryItems?.filter((item: any) => item.itemType === "text").map((item: any) => {
              const currentText = item.textContent || item.defaultText || "";
              const isCustomText = !!item.textContent;
              return (
                <div key={item.imageKey} className="mt-6 rounded-md bg-white/5 border border-white/5 p-4" data-testid={`livery-item-${item.imageKey}`}>
                  <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                    <div>
                      <h4 className="font-medium text-sm" data-testid={`livery-label-${item.imageKey}`}>{item.label}</h4>
                      <p className="text-xs text-white/30 font-mono">{item.imageKey}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isCustomText && (
                        <Badge className="bg-orange-500 text-white border-0 text-xs">Custom</Badge>
                      )}
                    </div>
                  </div>
                  <Textarea
                    key={`${item.imageKey}-${currentText}`}
                    defaultValue={currentText}
                    rows={4}
                    className="bg-black/30 border-white/10 text-white text-sm mb-3"
                    data-testid={`textarea-livery-${item.imageKey}`}
                    onBlur={(e) => {
                      const newText = e.target.value.trim();
                      if (newText !== currentText) {
                        updateLiveryTextMutation.mutate({ imageKey: item.imageKey, textContent: newText });
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        const textarea = document.querySelector(`[data-testid="textarea-livery-${item.imageKey}"]`) as HTMLTextAreaElement;
                        if (textarea) {
                          updateLiveryTextMutation.mutate({ imageKey: item.imageKey, textContent: textarea.value.trim() });
                        }
                      }}
                      disabled={updateLiveryTextMutation.isPending}
                      className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white text-xs"
                      data-testid={`button-save-text-${item.imageKey}`}
                    >
                      Save Text
                    </Button>
                    {isCustomText && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          updateLiveryTextMutation.mutate({ imageKey: item.imageKey, textContent: "" });
                          const textarea = document.querySelector(`[data-testid="textarea-livery-${item.imageKey}"]`) as HTMLTextAreaElement;
                          if (textarea) textarea.value = item.defaultText || "";
                        }}
                        disabled={updateLiveryTextMutation.isPending}
                        className="text-white/40 text-xs"
                        data-testid={`button-reset-text-${item.imageKey}`}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" /> Reset to Default
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {(!liveryItems || liveryItems.length === 0) && (
              <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                <Image className="h-8 w-8 text-white/10 mx-auto mb-2" />
                <p className="text-sm text-white/30">No livery items configured yet. Restart the app to seed defaults.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="join">
            <div className="space-y-6">
              {joinSettings && (
                <div className="rounded-md bg-white/5 border border-white/5 p-5" data-testid="join-settings-panel">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-orange-400" />
                      <h3 className="font-bold text-lg">Join Settings</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40">Active</span>
                      <Switch
                        checked={joinSettings.isActive}
                        onCheckedChange={(val) => updateJoinSettingsMutation.mutate({ isActive: val })}
                        data-testid="switch-join-active"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Mode</Label>
                      <Select value={joinSettings.mode} onValueChange={(val) => updateJoinSettingsMutation.mutate({ mode: val as "request" | "purchase" })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-join-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          <SelectItem value="request">Free Application</SelectItem>
                          <SelectItem value="purchase">Paid Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {joinSettings.mode === "purchase" && (
                      <div className="space-y-1.5">
                        <Label className="text-white/60">Price (cents)</Label>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-white/30" />
                          <Input
                            type="number"
                            defaultValue={joinSettings.price}
                            onBlur={(e) => updateJoinSettingsMutation.mutate({ price: parseInt(e.target.value) || 0 })}
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-join-price"
                          />
                        </div>
                        <p className="text-xs text-white/30">${((joinSettings.price || 0) / 100).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Page Title</Label>
                      <Input
                        defaultValue={joinSettings.pageTitle}
                        onBlur={(e) => updateJoinSettingsMutation.mutate({ pageTitle: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                        data-testid="input-join-title"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Page Description</Label>
                      <Textarea
                        defaultValue={joinSettings.pageDescription}
                        onBlur={(e) => updateJoinSettingsMutation.mutate({ pageDescription: e.target.value })}
                        className="bg-white/5 border-white/10 text-white resize-none min-h-[80px]"
                        data-testid="input-join-description"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Required Fields</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {["fullName", "email", "phone", "address", "city", "state", "zip", "bio", "category", "socialLinks"].map((field) => {
                          const active = joinSettings.requiredFields?.includes(field);
                          return (
                            <button
                              key={field}
                              onClick={() => {
                                const current = joinSettings.requiredFields || [];
                                const updated = active ? current.filter((f) => f !== field) : [...current, field];
                                updateJoinSettingsMutation.mutate({ requiredFields: updated });
                              }}
                              className={`text-xs px-3 py-1.5 border transition-colors ${active ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
                              data-testid={`toggle-join-field-${field}`}
                            >
                              {field}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-white/20 mt-1">Click to toggle required fields on the join form.</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg mb-3">Join Submissions ({joinSubmissions?.length || 0})</h3>
                {joinSubmissions && joinSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {joinSubmissions.map((sub) => (
                      <div key={sub.id} className="rounded-md bg-white/5 border border-white/5 p-4" data-testid={`join-sub-${sub.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h4 className="font-medium">{sub.fullName}</h4>
                            <p className="text-xs text-white/30">{sub.email} {sub.category && `| ${sub.category}`}</p>
                            {sub.bio && <p className="text-xs text-white/40 mt-1 line-clamp-2">{sub.bio}</p>}
                            {sub.amountPaid > 0 && (
                              <p className="text-xs text-green-400 mt-1">Paid ${(sub.amountPaid / 100).toFixed(2)} {sub.transactionId && `(${sub.transactionId})`}</p>
                            )}
                            <p className="text-xs text-white/20 mt-1">{new Date(sub.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`border-0 ${sub.status === "approved" ? "bg-green-500/20 text-green-400" : sub.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                              {sub.status}
                            </Badge>
                            {sub.status === "pending" && (
                              <>
                                <Button size="icon" onClick={() => updateJoinSubmissionMutation.mutate({ id: sub.id, status: "approved" })}
                                  className="bg-green-500/20 text-green-400 border-0" data-testid={`button-approve-join-${sub.id}`}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" onClick={() => updateJoinSubmissionMutation.mutate({ id: sub.id, status: "rejected" })}
                                  className="bg-red-500/20 text-red-400 border-0" data-testid={`button-reject-join-${sub.id}`}>
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
                    <UserPlus className="h-8 w-8 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-white/30">No join submissions yet.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="host">
            <div className="space-y-6">
              {hostSettings && (
                <div className="rounded-md bg-white/5 border border-white/5 p-5" data-testid="host-settings-panel">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-orange-400" />
                      <h3 className="font-bold text-lg">Host Settings</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-white/40">Active</span>
                      <Switch
                        checked={hostSettings.isActive}
                        onCheckedChange={(val) => updateHostSettingsMutation.mutate({ isActive: val })}
                        data-testid="switch-host-active"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Mode</Label>
                      <Select value={hostSettings.mode} onValueChange={(val) => updateHostSettingsMutation.mutate({ mode: val as "request" | "purchase" })}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-host-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10">
                          <SelectItem value="request">Free Application</SelectItem>
                          <SelectItem value="purchase">Paid Entry</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {hostSettings.mode === "purchase" && (
                      <div className="space-y-1.5">
                        <Label className="text-white/60">Price (cents)</Label>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-white/30" />
                          <Input
                            type="number"
                            defaultValue={hostSettings.price}
                            onBlur={(e) => updateHostSettingsMutation.mutate({ price: parseInt(e.target.value) || 0 })}
                            className="bg-white/5 border-white/10 text-white"
                            data-testid="input-host-price"
                          />
                        </div>
                        <p className="text-xs text-white/30">${((hostSettings.price || 0) / 100).toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Page Title</Label>
                      <Input
                        defaultValue={hostSettings.pageTitle}
                        onBlur={(e) => updateHostSettingsMutation.mutate({ pageTitle: e.target.value })}
                        className="bg-white/5 border-white/10 text-white"
                        data-testid="input-host-title"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Page Description</Label>
                      <Textarea
                        defaultValue={hostSettings.pageDescription}
                        onBlur={(e) => updateHostSettingsMutation.mutate({ pageDescription: e.target.value })}
                        className="bg-white/5 border-white/10 text-white resize-none min-h-[80px]"
                        data-testid="input-host-description"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-white/60">Required Fields</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {["fullName", "email", "phone", "organization", "address", "city", "state", "zip", "eventName", "eventDescription", "eventCategory", "eventDate", "socialLinks"].map((field) => {
                          const active = hostSettings.requiredFields?.includes(field);
                          return (
                            <button
                              key={field}
                              onClick={() => {
                                const current = hostSettings.requiredFields || [];
                                const updated = active ? current.filter((f) => f !== field) : [...current, field];
                                updateHostSettingsMutation.mutate({ requiredFields: updated });
                              }}
                              className={`text-xs px-3 py-1.5 border transition-colors ${active ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
                              data-testid={`toggle-host-field-${field}`}
                            >
                              {field}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-xs text-white/20 mt-1">Click to toggle required fields on the host form.</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-bold text-lg mb-3">Host Submissions ({hostSubmissions?.length || 0})</h3>
                {hostSubmissions && hostSubmissions.length > 0 ? (
                  <div className="space-y-3">
                    {hostSubmissions.map((sub) => (
                      <div key={sub.id} className="rounded-md bg-white/5 border border-white/5 p-4" data-testid={`host-sub-${sub.id}`}>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h4 className="font-medium">{sub.eventName}</h4>
                            <p className="text-xs text-white/30">{sub.fullName} | {sub.email}</p>
                            {sub.organization && <p className="text-xs text-white/40">{sub.organization}</p>}
                            {sub.eventCategory && <p className="text-xs text-white/40 mt-1">Category: {sub.eventCategory}</p>}
                            {sub.eventDate && <p className="text-xs text-white/40">Date: {sub.eventDate}</p>}
                            {sub.eventDescription && <p className="text-xs text-white/40 mt-1 line-clamp-2">{sub.eventDescription}</p>}
                            {sub.amountPaid > 0 && (
                              <p className="text-xs text-green-400 mt-1">Paid ${(sub.amountPaid / 100).toFixed(2)} {sub.transactionId && `(${sub.transactionId})`}</p>
                            )}
                            <p className="text-xs text-white/20 mt-1">{new Date(sub.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`border-0 ${sub.status === "approved" ? "bg-green-500/20 text-green-400" : sub.status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                              {sub.status}
                            </Badge>
                            {sub.status === "pending" && (
                              <>
                                <Button size="icon" onClick={() => updateHostSubmissionMutation.mutate({ id: sub.id, status: "approved" })}
                                  className="bg-green-500/20 text-green-400 border-0" data-testid={`button-approve-host-${sub.id}`}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" onClick={() => updateHostSubmissionMutation.mutate({ id: sub.id, status: "rejected" })}
                                  className="bg-red-500/20 text-red-400 border-0" data-testid={`button-reject-host-${sub.id}`}>
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
                    <Megaphone className="h-8 w-8 text-white/10 mx-auto mb-2" />
                    <p className="text-sm text-white/30">No host submissions yet.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-4" data-testid="users-tab-content">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, stage name, or category..."
                  className="bg-white/5 border-white/10 text-white pl-10"
                  data-testid="input-user-search"
                />
              </div>

              {usersLoading ? (
                <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                  <p className="text-sm text-white/30">Loading users...</p>
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <div className="space-y-2">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-md bg-white/5 border border-white/5 p-4 cursor-pointer transition-colors hover:bg-white/[0.08]"
                      onClick={() => setUserDetailId(u.id)}
                      data-testid={`user-row-${u.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.imageUrls?.[0] || ""} />
                          <AvatarFallback className="bg-orange-500/20 text-orange-400 text-sm font-bold">
                            {u.displayName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium" data-testid={`user-name-${u.id}`}>{u.displayName}</h4>
                          <div className="flex flex-wrap items-center gap-2">
                            {u.stageName && <span className="text-xs text-white/40">{u.stageName}</span>}
                            {u.category && <Badge className="bg-orange-500/10 text-orange-400/80 border-0 text-xs">{u.category}</Badge>}
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-white/20 shrink-0" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md bg-white/5 border border-white/5 p-6 text-center">
                  <Users className="h-8 w-8 text-white/10 mx-auto mb-2" />
                  <p className="text-sm text-white/30">{userSearch ? "No users match your search." : "No talent profiles found."}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={compDetailId !== null} onOpenChange={(open) => { if (!open) setCompDetailId(null); }}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-2xl" data-testid="comp-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Competition Details</DialogTitle>
          </DialogHeader>
          {compDetailId !== null && <CompetitionDetailModal compId={compDetailId} />}
        </DialogContent>
      </Dialog>

      <Dialog open={userDetailId !== null} onOpenChange={(open) => { if (!open) setUserDetailId(null); }}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-2xl" data-testid="user-detail-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Talent Profile</DialogTitle>
          </DialogHeader>
          {userDetailId !== null && <TalentDetailModal profileId={userDetailId} competitions={competitions} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
