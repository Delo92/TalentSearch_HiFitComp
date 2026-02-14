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
import { Trophy, BarChart3, Users, Plus, Check, X as XIcon, LogOut, Vote, Flame, Image, Upload, RotateCcw, UserPlus, Megaphone, Settings, DollarSign, Eye, Search, ExternalLink, Music, Video, Calendar, Award, UserCheck, Mail, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { InviteDialog, CreateUserDialog } from "@/components/invite-dialog";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Competition, SiteLivery } from "@shared/schema";
import { useState, useRef, useMemo } from "react";
import { useAuth, getAuthToken } from "@/hooks/use-auth";

type CompetitionWithCreator = Competition & { createdBy?: string | null; coverVideo?: string | null };

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

interface HostProfile {
  id: number;
  userId: string;
  displayName: string;
  stageName: string | null;
  bio: string | null;
  category: string | null;
  imageUrls: string[];
  role: string;
  competitionCount: number;
  activeCompetitions: number;
}

interface HostCompetitionDetail {
  id: number;
  title: string;
  category: string;
  status: string;
  coverImage: string | null;
  startDate: string | null;
  endDate: string | null;
  contestants: {
    id: number;
    talentProfileId: number;
    applicationStatus: string;
    displayName: string;
    stageName: string | null;
    category: string | null;
    imageUrls: string[];
    voteCount: number;
  }[];
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

interface CalendarReportResponse {
  competition: Competition;
  totalVotes: number;
  totalContestants: number;
  totalRevenue: number;
  totalPurchasedVotes: number;
  totalPurchases: number;
  leaderboard: {
    rank: number;
    contestantId: number;
    talentProfileId: number;
    displayName: string;
    stageName: string | null;
    voteCount: number;
    votePercentage: number;
  }[];
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

  const levelMutation = useMutation({
    mutationFn: async ({ userId, level }: { userId: string; level: number }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/level`, { level });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", profileId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User level updated" });
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
              <Badge className={`border-0 ${profile.level === 4 ? "bg-red-500/20 text-red-400" : profile.level === 3 ? "bg-purple-500/20 text-purple-300" : profile.level === 2 ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/60"}`} data-testid="user-detail-level">
                {profile.level === 4 ? "Admin" : profile.level === 3 ? "Host" : profile.level === 2 ? "Talent" : "Viewer"} (Level {profile.level})
              </Badge>
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

      <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="user-detail-level-mgmt">
        <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Change User Level</h3>
        <div className="flex items-center gap-3">
          <Select
            value={String(profile.level)}
            onValueChange={(v) => {
              const newLevel = parseInt(v);
              if (newLevel !== profile.level) {
                levelMutation.mutate({ userId: profile.userId, level: newLevel });
              }
            }}
          >
            <SelectTrigger className="flex-1 bg-white/5 border-white/10 text-white" data-testid="select-user-level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10">
              <SelectItem value="1">Level 1 - Viewer</SelectItem>
              <SelectItem value="2">Level 2 - Talent</SelectItem>
              <SelectItem value="3">Level 3 - Host</SelectItem>
              <SelectItem value="4">Level 4 - Admin</SelectItem>
            </SelectContent>
          </Select>
          {levelMutation.isPending && <span className="text-xs text-white/40">Updating...</span>}
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

function InlineCompDetail({ compId }: { compId: number }) {
  const { data, isLoading } = useQuery<CompDetailResponse>({
    queryKey: ["/api/admin/competitions", compId, "detail"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" data-testid={`inline-detail-loading-${compId}`}>
        <div className="text-white/40 text-sm">Loading details...</div>
      </div>
    );
  }

  if (!data) return <div className="text-white/40 text-sm py-4 text-center">Failed to load details.</div>;

  const { totalVotes, hosts, contestants } = data;

  return (
    <div className="space-y-4 p-4 pt-0" data-testid={`inline-detail-${compId}`}>
      <div className="rounded-md bg-white/5 border border-white/5 p-3">
        <p className="text-xs text-white/40">Total Votes</p>
        <p className="font-bold text-lg bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid={`inline-votes-${compId}`}>{totalVotes}</p>
      </div>

      {hosts.length > 0 && (
        <div data-testid={`inline-hosts-${compId}`}>
          <h4 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-2">Host(s)</h4>
          <div className="space-y-2">
            {hosts.map((host) => (
              <div key={host.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 p-3" data-testid={`inline-host-${host.id}`}>
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

      <div data-testid={`inline-contestants-${compId}`}>
        <h4 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-2">Contestants ({contestants.length})</h4>
        {contestants.length > 0 ? (
          <div className="space-y-2">
            {contestants.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 border border-white/5 p-3" data-testid={`inline-contestant-${c.id}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={c.imageUrls?.[0] || ""} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-bold">
                      {c.displayName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm" data-testid={`inline-cname-${c.id}`}>{c.displayName}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {c.stageName && <span className="text-xs text-white/40">{c.stageName}</span>}
                      {c.category && <span className="text-xs text-white/30">{c.category}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid={`inline-cvotes-${c.id}`}>{c.voteCount}</p>
                    <p className="text-[10px] text-white/30">votes</p>
                  </div>
                  <Badge className={`border-0 text-xs ${c.applicationStatus === "approved" ? "bg-green-500/20 text-green-400" : c.applicationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`} data-testid={`inline-cstatus-${c.id}`}>
                    {c.applicationStatus}
                  </Badge>
                  <Link href={"/talent/" + c.talentProfileId}>
                    <Button variant="ghost" size="sm" className="text-orange-400" data-testid={`link-view-profile-${c.id}`}>
                      <ExternalLink className="h-3 w-3 mr-1" /> Profile
                    </Button>
                  </Link>
                  <Link href={"/competitions/" + compId}>
                    <Button variant="ghost" size="sm" className="text-white/40" data-testid={`link-view-comp-${c.id}`}>
                      <Eye className="h-3 w-3 mr-1" /> Entry
                    </Button>
                  </Link>
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

function ExpandedHostComps({ hostUid, hostName }: { hostUid: string; hostName: string }) {
  const { data, isLoading } = useQuery<HostCompetitionDetail[]>({
    queryKey: ["/api/admin/hosts", hostUid, "competitions"],
  });

  if (isLoading) return <div className="flex items-center justify-center py-6"><span className="text-white/40 text-sm">Loading competitions...</span></div>;
  if (!data || data.length === 0) return <div className="text-center py-4 text-white/30 text-sm">No competitions assigned to {hostName}.</div>;

  return (
    <div className="space-y-4 p-4 pt-0" data-testid={`host-comps-${hostUid}`}>
      {data.map(comp => (
        <div key={comp.id} className="rounded-md bg-white/5 border border-white/5 p-4" data-testid={`host-comp-${comp.id}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h4 className="font-bold text-sm">{comp.title}</h4>
              <span className="text-xs text-white/40">{comp.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`border-0 ${comp.status === "active" || comp.status === "voting" ? "bg-green-500/20 text-green-400" : comp.status === "completed" ? "bg-white/10 text-white/60" : "bg-yellow-500/20 text-yellow-400"}`}>
                {comp.status}
              </Badge>
              <Link href={`/competitions/${comp.id}`}>
                <Button variant="ghost" size="icon" className="text-white/40" data-testid={`link-comp-page-${comp.id}`}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <h5 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-2">Contestants ({comp.contestants.length})</h5>
          {comp.contestants.length > 0 ? (
            <div className="space-y-2">
              {comp.contestants.map(c => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/[0.03] border border-white/5 p-3" data-testid={`host-contestant-${c.id}`}>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.imageUrls?.[0] || ""} />
                      <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-bold">
                        {c.displayName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Link href={`/talent/${c.talentProfileId}`}>
                        <span className="font-medium text-sm text-orange-400 underline underline-offset-2 cursor-pointer" data-testid={`link-talent-${c.talentProfileId}`}>
                          {c.displayName}
                        </span>
                      </Link>
                      {c.stageName && <span className="text-xs text-white/40 ml-2">{c.stageName}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 ${c.applicationStatus === "approved" ? "bg-green-500/20 text-green-400" : c.applicationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                      {c.applicationStatus}
                    </Badge>
                    <span className="text-xs text-white/40">{c.voteCount} votes</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/30">No contestants yet.</p>
          )}
        </div>
      ))}
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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [votingStartDate, setVotingStartDate] = useState("");
  const [votingEndDate, setVotingEndDate] = useState("");
  const [expectedContestants, setExpectedContestants] = useState("");
  const [compDetailId, setCompDetailId] = useState<number | null>(null);
  const [expandedCompId, setExpandedCompId] = useState<number | null>(null);
  const [userDetailId, setUserDetailId] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [usersView, setUsersView] = useState<"users" | "applications">("users");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarSelectedComp, setCalendarSelectedComp] = useState<number | null>(null);
  const [compSearch, setCompSearch] = useState("");
  const [compCategoryFilter, setCompCategoryFilter] = useState("all");
  const [compPage, setCompPage] = useState(1);
  const COMPS_PER_PAGE = 10;
  const [hostSearch, setHostSearch] = useState("");
  const [hostPage, setHostPage] = useState(1);
  const [expandedHostId, setExpandedHostId] = useState<string | null>(null);
  const [hostSettingsOpen, setHostSettingsOpen] = useState(false);
  const [assignHostDialogOpen, setAssignHostDialogOpen] = useState(false);
  const [assignHostUid, setAssignHostUid] = useState<string | null>(null);
  const [assignCompId, setAssignCompId] = useState("");
  const HOSTS_PER_PAGE = 10;

  const { data: stats } = useQuery<AdminStats>({ queryKey: ["/api/admin/stats"] });
  const { data: competitions } = useQuery<CompetitionWithCreator[]>({ queryKey: ["/api/competitions"] });

  const compCategories = useMemo(() => {
    if (!competitions) return [];
    const cats = Array.from(new Set(competitions.map(c => c.category).filter(Boolean)));
    return cats.sort();
  }, [competitions]);

  const filteredComps = useMemo(() => {
    if (!competitions) return [];
    let filtered = competitions;
    if (compSearch.trim()) {
      const q = compSearch.toLowerCase();
      filtered = filtered.filter(c => c.title.toLowerCase().includes(q) || (c.category && c.category.toLowerCase().includes(q)));
    }
    if (compCategoryFilter !== "all") {
      filtered = filtered.filter(c => c.category === compCategoryFilter);
    }
    return filtered;
  }, [competitions, compSearch, compCategoryFilter]);

  const totalCompPages = Math.max(1, Math.ceil(filteredComps.length / COMPS_PER_PAGE));
  const paginatedComps = useMemo(() => {
    const start = (compPage - 1) * COMPS_PER_PAGE;
    return filteredComps.slice(start, start + COMPS_PER_PAGE);
  }, [filteredComps, compPage]);

  const { data: allContestants } = useQuery<ContestantAdmin[]>({ queryKey: ["/api/admin/contestants"] });
  const { data: liveryItems } = useQuery<SiteLivery[]>({ queryKey: ["/api/livery"] });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: joinSettings } = useQuery<JoinHostSettings>({ queryKey: ["/api/join/settings"] });
  const { data: joinSubmissions } = useQuery<JoinSubmission[]>({ queryKey: ["/api/admin/join/submissions"] });
  const { data: hostSettings } = useQuery<JoinHostSettings>({ queryKey: ["/api/host/settings"] });
  const { data: hostSubmissions } = useQuery<HostSubmission[]>({ queryKey: ["/api/admin/host/submissions"] });
  const { data: hostUsers } = useQuery<HostProfile[]>({ queryKey: ["/api/admin/hosts"] });

  const filteredHosts = useMemo(() => {
    if (!hostUsers) return [];
    let filtered = hostUsers;
    if (hostSearch.trim()) {
      const q = hostSearch.toLowerCase();
      filtered = filtered.filter(h => h.displayName.toLowerCase().includes(q) || (h.stageName && h.stageName.toLowerCase().includes(q)));
    }
    return filtered;
  }, [hostUsers, hostSearch]);

  const totalHostPages = Math.max(1, Math.ceil(filteredHosts.length / HOSTS_PER_PAGE));
  const paginatedHosts = useMemo(() => {
    const start = (hostPage - 1) * HOSTS_PER_PAGE;
    return filteredHosts.slice(start, start + HOSTS_PER_PAGE);
  }, [filteredHosts, hostPage]);
  const { data: talentUsers, isLoading: usersLoading } = useQuery<TalentUser[]>({ queryKey: ["/api/admin/users"] });

  const { data: calendarReport, isLoading: calendarReportLoading } = useQuery<CalendarReportResponse>({
    queryKey: ["/api/admin/competitions", calendarSelectedComp, "report"],
    enabled: calendarSelectedComp !== null,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/competitions", {
        title,
        description,
        category: compCategory,
        status: compStatus,
        maxVotesPerDay: parseInt(maxVotes) || 10,
        voteCost: parseInt(voteCost) || 0,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        votingStartDate: votingStartDate ? new Date(votingStartDate).toISOString() : null,
        votingEndDate: votingEndDate ? new Date(votingEndDate).toISOString() : null,
        expectedContestants: expectedContestants ? parseInt(expectedContestants) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setCompCategory("");
      setStartDate("");
      setEndDate("");
      setVotingStartDate("");
      setVotingEndDate("");
      setExpectedContestants("");
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

  const coverInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const uploadCoverMutation = useMutation({
    mutationFn: async ({ compId, file }: { compId: number; file: File }) => {
      const formData = new FormData();
      formData.append("cover", file);
      const token = getAuthToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/admin/competitions/${compId}/cover`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: "Cover updated!" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const removeCoverMutation = useMutation({
    mutationFn: async ({ compId, type }: { compId: number; type: "image" | "video" }) => {
      await apiRequest("DELETE", `/api/admin/competitions/${compId}/cover?type=${type}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      toast({ title: "Cover removed!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
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

  const assignHostMutation = useMutation({
    mutationFn: async ({ compId, hostUid }: { compId: number; hostUid: string }) => {
      await apiRequest("PATCH", `/api/admin/competitions/${compId}/assign-host`, { hostUid });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hosts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      if (assignHostUid) {
        queryClient.invalidateQueries({ queryKey: ["/api/admin/hosts", assignHostUid, "competitions"] });
      }
      setAssignCompId("");
      toast({ title: "Competition assigned! You can assign another or close this dialog." });
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
            <DialogContent className="bg-zinc-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
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
                    <Label className="text-white/60">Expected Contestants</Label>
                    <Input type="number" value={expectedContestants} onChange={(e) => setExpectedContestants(e.target.value)} placeholder="e.g., 20"
                      className="bg-white/5 border-white/10 text-white" data-testid="input-expected-contestants" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Max Votes/Day</Label>
                    <Input type="number" value={maxVotes} onChange={(e) => setMaxVotes(e.target.value)}
                      className="bg-white/5 border-white/10 text-white" data-testid="input-max-votes" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Vote Cost ($)</Label>
                    <Input type="number" step="0.01" value={voteCost} onChange={(e) => setVoteCost(e.target.value)} placeholder="0"
                      className="bg-white/5 border-white/10 text-white" data-testid="input-vote-cost" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Start Date & Time</Label>
                    <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white" data-testid="input-start-date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60">End Date & Time</Label>
                    <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white" data-testid="input-end-date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Voting Start</Label>
                    <Input type="datetime-local" value={votingStartDate} onChange={(e) => setVotingStartDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white" data-testid="input-voting-start-date" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-white/60">Voting End</Label>
                    <Input type="datetime-local" value={votingEndDate} onChange={(e) => setVotingEndDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white" data-testid="input-voting-end-date" />
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
              <Users className="h-4 w-4 mr-1" /> Users {pending.length > 0 && <Badge className="ml-1 bg-orange-500 text-white border-0 text-[10px] px-1.5 py-0">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white" data-testid="tab-calendar">
              <Calendar className="h-4 w-4 mr-1" /> Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="competitions">
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <Input
                  placeholder="Search competitions..."
                  value={compSearch}
                  onChange={(e) => { setCompSearch(e.target.value); setCompPage(1); }}
                  className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  data-testid="input-comp-search"
                />
              </div>
              <Select value={compCategoryFilter} onValueChange={(val) => { setCompCategoryFilter(val); setCompPage(1); }}>
                <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white text-sm" data-testid="select-comp-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all">All Categories</SelectItem>
                  {compCategories.map(cat => (
                    <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-white/30" data-testid="text-comp-count">{filteredComps.length} result{filteredComps.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedComps.map((comp) => (
                <div key={comp.id} className="rounded-md bg-white/5 border border-white/5 overflow-visible" data-testid={`admin-comp-${comp.id}`}>
                  <div
                    className="group relative h-[200px] rounded-t-md flex flex-col justify-end"
                    style={comp.coverImage && !comp.coverVideo ? { backgroundImage: `url(${comp.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {comp.coverVideo && (
                      <video
                        src={comp.coverVideo}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover rounded-t-md"
                      />
                    )}
                    {!comp.coverImage && !comp.coverVideo && (
                      <div className="absolute inset-0 rounded-t-md bg-gradient-to-b from-orange-900/40 to-black flex items-center justify-center">
                        <Trophy className="h-16 w-16 text-white/10" />
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-t-md bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="file"
                        accept="image/*,video/mp4,video/webm,video/quicktime"
                        className="hidden"
                        ref={(el) => { coverInputRefs.current[comp.id] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadCoverMutation.mutate({ compId: comp.id, file });
                          e.target.value = "";
                        }}
                        data-testid={`input-cover-upload-${comp.id}`}
                      />
                      <Button
                        size="icon"
                        onClick={() => coverInputRefs.current[comp.id]?.click()}
                        disabled={uploadCoverMutation.isPending}
                        className="bg-black/60 border-0 text-white/80"
                        data-testid={`button-upload-cover-${comp.id}`}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                      {(comp.coverImage || comp.coverVideo) && (
                        <Button
                          size="icon"
                          onClick={() => removeCoverMutation.mutate({ compId: comp.id, type: comp.coverVideo ? "video" : "image" })}
                          disabled={removeCoverMutation.isPending}
                          className="bg-black/60 border-0 text-red-400"
                          data-testid={`button-remove-cover-${comp.id}`}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="relative z-10 p-4">
                      <h3 className="font-bold text-lg text-white drop-shadow-md">{comp.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs text-white/60">{comp.category}</span>
                        <Badge className={`border-0 ${comp.status === "active" || comp.status === "voting" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/60"}`}>
                          {comp.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedCompId(expandedCompId === comp.id ? null : comp.id)}
                      className="text-orange-400"
                      data-testid={`button-view-detail-${comp.id}`}
                    >
                      {expandedCompId === comp.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                      {expandedCompId === comp.id ? "Hide Details" : "View Details"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCompDetailId(comp.id)}
                      className="text-white/40"
                      data-testid={`button-full-detail-${comp.id}`}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Full Details
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
                  {expandedCompId === comp.id && <InlineCompDetail compId={comp.id} />}
                </div>
              ))}
            </div>
            {filteredComps.length === 0 && (
              <div className="text-center py-12 text-white/30 text-sm" data-testid="text-no-comps">
                No competitions found matching your search.
              </div>
            )}
            {totalCompPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-6" data-testid="comp-pagination">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={compPage <= 1}
                  onClick={() => setCompPage(p => p - 1)}
                  className="text-white/60"
                  data-testid="button-comp-prev"
                >
                  Previous
                </Button>
                {Array.from({ length: totalCompPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={page === compPage ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setCompPage(page)}
                    className={page === compPage ? "bg-orange-500 text-white" : "text-white/40"}
                    data-testid={`button-comp-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={compPage >= totalCompPages}
                  onClick={() => setCompPage(p => p + 1)}
                  className="text-white/60"
                  data-testid="button-comp-next"
                >
                  Next
                </Button>
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
                <div className="rounded-md bg-white/5 border border-white/5" data-testid="host-settings-panel">
                  <button
                    onClick={() => setHostSettingsOpen(!hostSettingsOpen)}
                    className="w-full flex items-center justify-between gap-4 p-5"
                    data-testid="button-toggle-host-settings"
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-orange-400" />
                      <h3 className="font-bold text-lg">Host Page Settings</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`border-0 ${hostSettings.isActive ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>
                        {hostSettings.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {hostSettingsOpen ? <ChevronUp className="h-5 w-5 text-white/40" /> : <ChevronDown className="h-5 w-5 text-white/40" />}
                    </div>
                  </button>
                  {hostSettingsOpen && (
                    <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-white/60">Enable Host Page</span>
                        <Switch
                          checked={hostSettings.isActive}
                          onCheckedChange={(val) => updateHostSettingsMutation.mutate({ isActive: val })}
                          data-testid="switch-host-active"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                              <Input type="number" defaultValue={hostSettings.price}
                                onBlur={(e) => updateHostSettingsMutation.mutate({ price: parseInt(e.target.value) || 0 })}
                                className="bg-white/5 border-white/10 text-white" data-testid="input-host-price" />
                            </div>
                            <p className="text-xs text-white/30">${((hostSettings.price || 0) / 100).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/60">Page Title</Label>
                        <Input defaultValue={hostSettings.pageTitle}
                          onBlur={(e) => updateHostSettingsMutation.mutate({ pageTitle: e.target.value })}
                          className="bg-white/5 border-white/10 text-white" data-testid="input-host-title" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/60">Page Description</Label>
                        <Textarea defaultValue={hostSettings.pageDescription}
                          onBlur={(e) => updateHostSettingsMutation.mutate({ pageDescription: e.target.value })}
                          className="bg-white/5 border-white/10 text-white resize-none min-h-[80px]" data-testid="input-host-description" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/60">Required Fields</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {["fullName", "email", "phone", "organization", "address", "city", "state", "zip", "eventName", "eventDescription", "eventCategory", "eventDate", "socialLinks"].map((field) => {
                            const active = hostSettings.requiredFields?.includes(field);
                            return (
                              <button key={field} onClick={() => {
                                const current = hostSettings.requiredFields || [];
                                const updated = active ? current.filter((f) => f !== field) : [...current, field];
                                updateHostSettingsMutation.mutate({ requiredFields: updated });
                              }}
                                className={`text-xs px-3 py-1.5 border transition-colors ${active ? "bg-orange-500/20 border-orange-500/50 text-orange-400" : "bg-white/5 border-white/10 text-white/40 hover:text-white/60"}`}
                                data-testid={`toggle-host-field-${field}`}>{field}</button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-white/20 mt-1">Click to toggle required fields on the host form.</p>
                      </div>
                      {hostSubmissions && hostSubmissions.length > 0 && (
                        <div className="border-t border-white/5 pt-4">
                          <h4 className="font-bold text-sm mb-3">Host Submissions ({hostSubmissions.length})</h4>
                          <div className="space-y-3">
                            {hostSubmissions.map((sub) => (
                              <div key={sub.id} className="rounded-md bg-white/[0.03] border border-white/5 p-4" data-testid={`host-sub-${sub.id}`}>
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
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                    <Input
                      placeholder="Search hosts..."
                      value={hostSearch}
                      onChange={(e) => { setHostSearch(e.target.value); setHostPage(1); }}
                      className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      data-testid="input-host-search"
                    />
                  </div>
                  <span className="text-xs text-white/30" data-testid="text-host-count">{filteredHosts.length} host{filteredHosts.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paginatedHosts.map((host) => (
                    <div key={host.userId} className="rounded-md bg-white/5 border border-white/5 overflow-visible" data-testid={`host-card-${host.userId}`}>
                      <div className="relative h-[200px] rounded-t-md flex flex-col justify-end bg-gradient-to-b from-purple-900/40 to-black">
                        <div className="absolute inset-0 rounded-t-md flex items-center justify-center">
                          <Users className="h-16 w-16 text-white/10" />
                        </div>
                        <div className="absolute inset-0 rounded-t-md bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        <div className="relative z-10 p-4">
                          <h3 className="font-bold text-lg text-white drop-shadow-md">{host.displayName}</h3>
                          {host.stageName && <p className="text-xs text-white/50">{host.stageName}</p>}
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <Badge className="border-0 bg-purple-500/20 text-purple-300">Host</Badge>
                            <span className="text-xs text-white/60">{host.competitionCount} competition{host.competitionCount !== 1 ? "s" : ""}</span>
                            {host.activeCompetitions > 0 && (
                              <span className="text-xs text-green-400">{host.activeCompetitions} active</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedHostId(expandedHostId === host.userId ? null : host.userId)}
                          className="text-orange-400"
                          data-testid={`button-expand-host-${host.userId}`}
                        >
                          {expandedHostId === host.userId ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                          {expandedHostId === host.userId ? "Hide Competitions" : "View Competitions"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setAssignHostUid(host.userId); setAssignHostDialogOpen(true); }}
                          className="text-white/40"
                          data-testid={`button-assign-comp-${host.userId}`}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Assign Competition
                        </Button>
                      </div>
                      {expandedHostId === host.userId && <ExpandedHostComps hostUid={host.userId} hostName={host.displayName} />}
                    </div>
                  ))}
                </div>
                {filteredHosts.length === 0 && (
                  <div className="text-center py-12 text-white/30 text-sm" data-testid="text-no-hosts">
                    {hostUsers && hostUsers.length === 0 ? "No host users yet. Promote users to Host level from the Users tab." : "No hosts found matching your search."}
                  </div>
                )}
                {totalHostPages > 1 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-6" data-testid="host-pagination">
                    <Button variant="ghost" size="sm" disabled={hostPage <= 1} onClick={() => setHostPage(p => p - 1)}
                      className="text-white/60" data-testid="button-host-prev">Previous</Button>
                    {Array.from({ length: totalHostPages }, (_, i) => i + 1).map(page => (
                      <Button key={page} variant={page === hostPage ? "default" : "ghost"} size="sm" onClick={() => setHostPage(page)}
                        className={page === hostPage ? "bg-orange-500 border-0 text-white" : "text-white/40"}
                        data-testid={`button-host-page-${page}`}>{page}</Button>
                    ))}
                    <Button variant="ghost" size="sm" disabled={hostPage >= totalHostPages} onClick={() => setHostPage(p => p + 1)}
                      className="text-white/60" data-testid="button-host-next">Next</Button>
                  </div>
                )}
              </div>
            </div>

            <Dialog open={assignHostDialogOpen} onOpenChange={setAssignHostDialogOpen}>
              <DialogContent className="bg-zinc-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle className="font-serif text-xl">Assign Competitions to Host</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <p className="text-sm text-white/60">
                    Assigning to: <span className="text-white font-medium">{hostUsers?.find(h => h.userId === assignHostUid)?.displayName || "Unknown"}</span>
                  </p>
                  {(() => {
                    const alreadyAssigned = competitions?.filter(c => c.createdBy === assignHostUid) || [];
                    const available = competitions?.filter(c => c.createdBy !== assignHostUid) || [];
                    return (
                      <>
                        {alreadyAssigned.length > 0 && (
                          <div className="space-y-1.5">
                            <Label className="text-white/40 text-xs uppercase tracking-wider">Currently Assigned ({alreadyAssigned.length})</Label>
                            <div className="space-y-1">
                              {alreadyAssigned.map(c => (
                                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/5 p-2">
                                  <span className="text-sm">{c.title}</span>
                                  <Badge className={`border-0 text-xs ${c.status === "active" || c.status === "voting" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/40"}`}>{c.status}</Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-1.5">
                          <Label className="text-white/60">Add Another Competition</Label>
                          <Select value={assignCompId} onValueChange={setAssignCompId}>
                            <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-assign-comp">
                              <SelectValue placeholder="Choose a competition..." />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                              {available.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>{c.title} ({c.status})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {available.length === 0 && (
                            <p className="text-xs text-white/30">All competitions are already assigned to this host.</p>
                          )}
                        </div>
                        <Button
                          onClick={() => assignHostUid && assignCompId && assignHostMutation.mutate({ compId: parseInt(assignCompId), hostUid: assignHostUid })}
                          disabled={!assignCompId || assignHostMutation.isPending}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white"
                          data-testid="button-confirm-assign"
                        >
                          {assignHostMutation.isPending ? "Assigning..." : "Assign Competition"}
                        </Button>
                      </>
                    );
                  })()}
                  <Button variant="ghost" onClick={() => setAssignHostDialogOpen(false)} className="w-full text-white/40" data-testid="button-close-assign">
                    Done
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="users">
            <div className="space-y-4" data-testid="users-tab-content">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={usersView === "users" ? "default" : "ghost"}
                    onClick={() => setUsersView("users")}
                    className={usersView === "users" ? "bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white" : "text-white/50"}
                    data-testid="button-view-users"
                  >
                    <Users className="h-4 w-4 mr-1" /> Users
                  </Button>
                  <Button
                    size="sm"
                    variant={usersView === "applications" ? "default" : "ghost"}
                    onClick={() => setUsersView("applications")}
                    className={usersView === "applications" ? "bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white" : "text-white/50"}
                    data-testid="button-view-applications"
                  >
                    <UserCheck className="h-4 w-4 mr-1" /> Applications
                    {pending.length > 0 && <Badge className="ml-1.5 bg-orange-500 text-white border-0 text-[10px] px-1.5 py-0">{pending.length}</Badge>}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <CreateUserDialog />
                  <InviteDialog senderLevel={4} />
                </div>
              </div>

              {usersView === "users" ? (
                <>
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
                                <Badge className={`border-0 text-xs ${u.role === "admin" ? "bg-red-500/20 text-red-400" : u.role === "host" ? "bg-purple-500/20 text-purple-300" : u.role === "talent" ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/50"}`}>
                                  {u.role === "admin" ? "Admin" : u.role === "host" ? "Host" : u.role === "talent" ? "Talent" : "Viewer"}
                                </Badge>
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
                </>
              ) : (
                <>
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
                      <UserCheck className="h-8 w-8 text-white/10 mx-auto mb-2" />
                      <p className="text-sm text-white/30">No applications yet.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar">
            {(() => {
              const year = calendarMonth.getFullYear();
              const month = calendarMonth.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const monthName = calendarMonth.toLocaleString("default", { month: "long", year: "numeric" });

              const calendarComps = (competitions || []).filter((c) => {
                if (!c.startDate && !c.endDate) return false;
                const start = c.startDate ? new Date(c.startDate) : null;
                const end = c.endDate ? new Date(c.endDate) : null;
                if (start && start.getFullYear() === year && start.getMonth() === month) return true;
                if (end && end.getFullYear() === year && end.getMonth() === month) return true;
                if (start && end && start <= new Date(year, month + 1, 0) && end >= new Date(year, month, 1)) return true;
                return false;
              });

              const getCompsForDay = (day: number) => {
                const date = new Date(year, month, day);
                return calendarComps.filter((c) => {
                  const start = c.startDate ? new Date(c.startDate) : null;
                  const end = c.endDate ? new Date(c.endDate) : null;
                  if (start && end) return date >= new Date(start.getFullYear(), start.getMonth(), start.getDate()) && date <= new Date(end.getFullYear(), end.getMonth(), end.getDate());
                  if (start) return date.getDate() === start.getDate() && date.getMonth() === start.getMonth() && date.getFullYear() === start.getFullYear();
                  if (end) return date.getDate() === end.getDate() && date.getMonth() === end.getMonth() && date.getFullYear() === end.getFullYear();
                  return false;
                });
              };

              const statusColor = (s: string) => s === "active" ? "bg-green-500" : s === "upcoming" ? "bg-blue-500" : s === "voting" ? "bg-orange-500" : "bg-zinc-500";
              const days = [];
              for (let i = 0; i < firstDay; i++) days.push(null);
              for (let d = 1; d <= daysInMonth; d++) days.push(d);

              return (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} data-testid="button-calendar-prev">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <h3 className="text-lg font-serif tracking-wider uppercase text-white min-w-[200px] text-center">{monthName}</h3>
                      <Button size="icon" variant="ghost" onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} data-testid="button-calendar-next">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button variant="ghost" onClick={() => setCalendarMonth(new Date())} className="text-xs text-white/50" data-testid="button-calendar-today">Today</Button>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Active</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Upcoming</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Voting</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" /> Other</span>
                  </div>

                  <div className="grid grid-cols-7 gap-px bg-white/5 rounded-md overflow-hidden">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                      <div key={d} className="bg-zinc-900 p-2 text-center text-xs font-semibold text-white/40 uppercase tracking-wider">{d}</div>
                    ))}
                    {days.map((day, i) => {
                      const comps = day ? getCompsForDay(day) : [];
                      const isToday = day && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                      return (
                        <div key={i} className={`bg-zinc-900/80 min-h-[90px] p-1.5 ${!day ? "bg-zinc-950/50" : ""} ${isToday ? "ring-1 ring-inset ring-orange-500/50" : ""}`}>
                          {day && (
                            <>
                              <span className={`text-xs ${isToday ? "text-orange-400 font-bold" : "text-white/40"}`}>{day}</span>
                              <div className="mt-1 space-y-0.5">
                                {comps.slice(0, 3).map((c) => (
                                  <button
                                    key={c.id}
                                    onClick={() => setCalendarSelectedComp(calendarSelectedComp === c.id ? null : c.id)}
                                    className={`w-full text-left text-[10px] leading-tight px-1 py-0.5 rounded truncate ${calendarSelectedComp === c.id ? "bg-orange-500/30 text-orange-300" : "hover:bg-white/10 text-white/60"}`}
                                    data-testid={`calendar-comp-${c.id}`}
                                  >
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${statusColor(c.status)}`} />
                                    {c.title}
                                  </button>
                                ))}
                                {comps.length > 3 && <span className="text-[9px] text-white/30 px-1">+{comps.length - 3} more</span>}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {calendarSelectedComp !== null && (
                    <div className="rounded-md bg-white/5 border border-white/10 p-4 space-y-4">
                      {calendarReportLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent" />
                        </div>
                      ) : calendarReport ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-lg font-serif text-white">{calendarReport.competition.title}</h4>
                              <p className="text-xs text-white/40 mt-0.5">
                                {calendarReport.competition.startDate && new Date(calendarReport.competition.startDate).toLocaleDateString()}
                                {calendarReport.competition.endDate && ` - ${new Date(calendarReport.competition.endDate).toLocaleDateString()}`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`border-0 ${calendarReport.competition.status === "active" ? "bg-green-500/20 text-green-400" : calendarReport.competition.status === "upcoming" ? "bg-blue-500/20 text-blue-400" : calendarReport.competition.status === "voting" ? "bg-orange-500/20 text-orange-400" : "bg-zinc-500/20 text-zinc-400"}`}>
                                {calendarReport.competition.status}
                              </Badge>
                              <Button size="icon" variant="ghost" onClick={() => setCalendarSelectedComp(null)} data-testid="button-close-calendar-detail">
                                <XIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white/5 rounded-md p-3 text-center">
                              <p className="text-2xl font-bold text-orange-400">{calendarReport.totalContestants}</p>
                              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Contestants</p>
                            </div>
                            <div className="bg-white/5 rounded-md p-3 text-center">
                              <p className="text-2xl font-bold text-orange-400">{calendarReport.totalVotes}</p>
                              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Total Votes</p>
                            </div>
                            <div className="bg-white/5 rounded-md p-3 text-center">
                              <p className="text-2xl font-bold text-orange-400">${(calendarReport.totalRevenue / 100).toFixed(2)}</p>
                              <p className="text-[10px] text-white/40 uppercase tracking-wider mt-1">Revenue</p>
                            </div>
                          </div>

                          {calendarReport.leaderboard.length > 0 && (
                            <div>
                              <h5 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Leaderboard</h5>
                              <div className="space-y-1">
                                {calendarReport.leaderboard.map((entry) => (
                                  <div key={entry.contestantId} className="flex items-center justify-between bg-white/5 rounded px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-bold ${entry.rank <= 3 ? "text-orange-400" : "text-white/30"}`}>#{entry.rank}</span>
                                      <span className="text-sm text-white/80">{entry.stageName || entry.displayName}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-white/50">{entry.voteCount} votes</span>
                                      <span className="text-orange-400 font-medium">{entry.votePercentage}%</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-white/30 text-center py-4">No report data available.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
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
            <DialogTitle className="font-serif text-xl">User Profile</DialogTitle>
          </DialogHeader>
          {userDetailId !== null && <TalentDetailModal profileId={userDetailId} competitions={competitions} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
