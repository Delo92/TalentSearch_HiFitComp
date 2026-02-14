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
import { Trophy, BarChart3, Users, Plus, Check, X as XIcon, LogOut, Vote, Calendar, Award, Mail, ChevronDown, ChevronUp, Eye, ExternalLink, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteDialog } from "@/components/invite-dialog";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";

interface HostStats {
  totalCompetitions: number;
  totalContestants: number;
  totalVotes: number;
  pendingApplications: number;
}

interface HostCompetition {
  id: number;
  title: string;
  description: string | null;
  category: string;
  coverImage: string | null;
  status: string;
  voteCost: number;
  maxVotesPerDay: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  createdBy: string | null;
}

interface ContestantItem {
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

interface CompReportResponse {
  competition: HostCompetition;
  leaderboard: { rank: number; contestantId: number; displayName: string; voteCount: number; votePercentage: number }[];
  totalVotes: number;
  totalRevenue: number;
  totalContestants: number;
  totalPurchases: number;
}

function InlineHostCompDetail({ compId }: { compId: number }) {
  const { data: contestants = [], isLoading } = useQuery<ContestantItem[]>({
    queryKey: ["/api/host/competitions", compId, "contestants"],
  });

  if (isLoading) {
    return (
      <div className="p-4 text-center text-white/30 text-sm">Loading contestants...</div>
    );
  }

  return (
    <div className="border-t border-white/5 p-4 space-y-3" data-testid={`inline-detail-${compId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <span className="text-xs text-white/40 uppercase tracking-wider">Contestants ({contestants.length})</span>
        <Link href={`/competitions/${compId}`} className="text-xs text-orange-400 flex items-center gap-1" data-testid={`link-view-app-${compId}`}>
          <Eye className="h-3 w-3" /> View in App
        </Link>
      </div>
      {contestants.length === 0 ? (
        <p className="text-sm text-white/30">No contestants have applied yet.</p>
      ) : (
        <div className="space-y-2">
          {contestants.map(c => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-md bg-white/[0.03] p-2" data-testid={`inline-contestant-${c.id}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.talentProfile?.imageUrls?.[0] || ""} alt={c.talentProfile?.displayName || ""} />
                <AvatarFallback className="bg-white/10 text-white text-xs">
                  {(c.talentProfile?.displayName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" data-testid={`inline-contestant-name-${c.id}`}>{c.talentProfile?.displayName || "Unknown"}</p>
                <p className="text-xs text-white/40">{c.talentProfile?.category || "No category"}</p>
              </div>
              <Badge className={`border-0 text-xs ${c.applicationStatus === "approved" ? "bg-green-500/20 text-green-400" : c.applicationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                {c.applicationStatus}
              </Badge>
              <Link href={"/talent/" + c.talentProfileId} className="text-xs text-orange-400 flex items-center gap-1" data-testid={`link-profile-${c.id}`}>
                <ExternalLink className="h-3 w-3" /> Profile
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HostDashboard({ user }: { user: any }) {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);
  const [expandedCompId, setExpandedCompId] = useState<number | null>(null);
  const [compSearch, setCompSearch] = useState("");
  const [compCategoryFilter, setCompCategoryFilter] = useState("all");
  const [compPage, setCompPage] = useState(1);
  const COMPS_PER_PAGE = 10;

  const [newComp, setNewComp] = useState({
    title: "",
    description: "",
    category: "Music",
    status: "draft",
    voteCost: 0,
    maxVotesPerDay: 10,
    startDate: "",
    endDate: "",
    votingStartDate: "",
    votingEndDate: "",
    expectedContestants: "",
  });

  const { data: stats } = useQuery<HostStats>({
    queryKey: ["/api/host/stats"],
  });

  const { data: competitions = [] } = useQuery<HostCompetition[]>({
    queryKey: ["/api/host/competitions"],
  });

  const hostCategories = useMemo(() => {
    const cats = [...new Set(competitions.map(c => c.category).filter(Boolean))];
    return cats.sort();
  }, [competitions]);

  const filteredComps = useMemo(() => {
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

  const { data: selectedContestants = [] } = useQuery<ContestantItem[]>({
    queryKey: ["/api/host/competitions", selectedCompId, "contestants"],
    enabled: !!selectedCompId,
  });

  const { data: selectedReport } = useQuery<CompReportResponse>({
    queryKey: ["/api/host/competitions", selectedCompId, "report"],
    enabled: !!selectedCompId && activeTab === "analytics",
  });

  const createCompMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...newComp,
        startDate: newComp.startDate || null,
        endDate: newComp.endDate || null,
        votingStartDate: newComp.votingStartDate || null,
        votingEndDate: newComp.votingEndDate || null,
        expectedContestants: newComp.expectedContestants ? parseInt(newComp.expectedContestants) : null,
      };
      const res = await apiRequest("POST", "/api/competitions", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/host/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/host/stats"] });
      setCreateDialogOpen(false);
      setNewComp({ title: "", description: "", category: "Music", status: "draft", voteCost: 0, maxVotesPerDay: 10, startDate: "", endDate: "", votingStartDate: "", votingEndDate: "", expectedContestants: "" });
      toast({ title: "Event created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create event", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/host/competitions/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/host/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/host/stats"] });
      toast({ title: "Status updated" });
    },
  });

  const approveContestantMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/host/contestants/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/host/competitions", selectedCompId, "contestants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/host/stats"] });
      toast({ title: "Application updated" });
    },
  });

  const deleteCompMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/host/competitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/host/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/host/stats"] });
      setSelectedCompId(null);
      toast({ title: "Event deleted" });
    },
  });

  return (
    <div className="min-h-screen bg-black text-white" data-testid="host-dashboard">
      <nav className="sticky top-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home">
            <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="font-serif text-xl font-bold">HiFitComp</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/40">{user?.displayName || user?.email}</span>
            <Badge className="bg-purple-500/20 text-purple-300 border-0">Host</Badge>
            <Button variant="ghost" size="icon" onClick={() => logout()} data-testid="button-logout">
              <LogOut className="h-4 w-4 text-white/60" />
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-2xl font-bold" data-testid="host-dashboard-title">Host Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Manage your competitions and contestants</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white" data-testid="button-create-event">
                <Plus className="h-4 w-4 mr-2" /> New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#111] border-white/10 text-white max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-serif">Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label className="text-white/60 text-xs">Title</Label>
                  <Input value={newComp.title} onChange={(e) => setNewComp(p => ({ ...p, title: e.target.value }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-comp-title" />
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Description</Label>
                  <Textarea value={newComp.description} onChange={(e) => setNewComp(p => ({ ...p, description: e.target.value }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-comp-description" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs">Category</Label>
                    <Select value={newComp.category} onValueChange={(v) => setNewComp(p => ({ ...p, category: v }))}>
                      <SelectTrigger className="bg-white/[0.08] border-white/20 text-white" data-testid="select-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#222] border-white/20 text-white">
                        {["Music", "Dance", "Modeling", "Bodybuilding", "Talent", "Other"].map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Status</Label>
                    <Select value={newComp.status} onValueChange={(v) => setNewComp(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="bg-white/[0.08] border-white/20 text-white" data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#222] border-white/20 text-white">
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="voting">Voting</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs">Max Votes/Day</Label>
                    <Input type="number" value={newComp.maxVotesPerDay} onChange={(e) => setNewComp(p => ({ ...p, maxVotesPerDay: parseInt(e.target.value) || 0 }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-max-votes" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Vote Cost ($)</Label>
                    <Input type="number" step="0.01" value={newComp.voteCost} onChange={(e) => setNewComp(p => ({ ...p, voteCost: parseFloat(e.target.value) || 0 }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-vote-cost" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs">Start Date</Label>
                    <Input type="date" value={newComp.startDate} onChange={(e) => setNewComp(p => ({ ...p, startDate: e.target.value }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-start-date" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">End Date</Label>
                    <Input type="date" value={newComp.endDate} onChange={(e) => setNewComp(p => ({ ...p, endDate: e.target.value }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-end-date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/60 text-xs">Voting Start Date</Label>
                    <Input type="date" value={newComp.votingStartDate} onChange={(e) => setNewComp(p => ({ ...p, votingStartDate: e.target.value }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-voting-start-date" />
                  </div>
                  <div>
                    <Label className="text-white/60 text-xs">Voting End Date</Label>
                    <Input type="date" value={newComp.votingEndDate} onChange={(e) => setNewComp(p => ({ ...p, votingEndDate: e.target.value }))} className="bg-white/[0.08] border-white/20 text-white" data-testid="input-voting-end-date" />
                  </div>
                </div>
                <div>
                  <Label className="text-white/60 text-xs">Expected Contestants</Label>
                  <Input type="number" value={newComp.expectedContestants} onChange={(e) => setNewComp(p => ({ ...p, expectedContestants: e.target.value }))} placeholder="e.g., 20" className="bg-white/[0.08] border-white/20 text-white" data-testid="input-expected-contestants" />
                </div>
                <Button onClick={() => createCompMutation.mutate()} disabled={createCompMutation.isPending || !newComp.title} className="w-full bg-gradient-to-r from-orange-500 to-amber-500 border-0 text-white" data-testid="button-submit-event">
                  {createCompMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="stat-competitions">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-orange-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">My Events</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalCompetitions ?? 0}</p>
          </div>
          <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="stat-contestants">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Contestants</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalContestants ?? 0}</p>
          </div>
          <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="stat-votes">
            <div className="flex items-center gap-2 mb-1">
              <Vote className="h-4 w-4 text-green-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Total Votes</span>
            </div>
            <p className="text-2xl font-bold">{stats?.totalVotes ?? 0}</p>
          </div>
          <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="stat-pending">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-yellow-400" />
              <span className="text-xs text-white/40 uppercase tracking-wider">Pending</span>
            </div>
            <p className="text-2xl font-bold">{stats?.pendingApplications ?? 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <InviteDialog senderLevel={3} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 mb-6">
            <TabsTrigger value="overview" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300" data-testid="tab-overview">
              <Trophy className="h-4 w-4 mr-2" /> Events
            </TabsTrigger>
            <TabsTrigger value="contestants" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300" data-testid="tab-contestants">
              <Users className="h-4 w-4 mr-2" /> Contestants
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {competitions.length === 0 ? (
              <div className="text-center py-16 text-white/30" data-testid="empty-events">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">No events yet</p>
                <p className="text-sm">Create your first competition to get started.</p>
              </div>
            ) : (
              <>
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <Input
                    placeholder="Search events..."
                    value={compSearch}
                    onChange={(e) => { setCompSearch(e.target.value); setCompPage(1); }}
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    data-testid="input-event-search"
                  />
                </div>
                <Select value={compCategoryFilter} onValueChange={(val) => { setCompCategoryFilter(val); setCompPage(1); }}>
                  <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white text-sm" data-testid="select-event-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="all">All Categories</SelectItem>
                    {hostCategories.map(cat => (
                      <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-xs text-white/30" data-testid="text-event-count">{filteredComps.length} result{filteredComps.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paginatedComps.map(comp => (
                  <div key={comp.id} className="rounded-md bg-white/5 border border-white/5 overflow-hidden" data-testid={`event-card-${comp.id}`}>
                    <div
                      className="relative h-[200px] bg-gradient-to-b from-orange-900/40 to-black"
                      style={comp.coverImage ? { backgroundImage: `url(${comp.coverImage})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                      {!comp.coverImage && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                          <Trophy className="h-16 w-16 text-white" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="font-serif font-bold text-lg text-white truncate" data-testid={`event-title-${comp.id}`}>{comp.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge className="border-0 text-xs bg-white/10 text-white/80">{comp.category}</Badge>
                          <Badge className={`border-0 text-xs ${comp.status === "active" || comp.status === "voting" ? "bg-green-500/20 text-green-400" : comp.status === "completed" ? "bg-white/10 text-white/60" : "bg-yellow-500/20 text-yellow-400"}`} data-testid={`event-status-${comp.id}`}>
                            {comp.status}
                          </Badge>
                          {comp.startDate && (
                            <span className="text-xs text-white/40 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />{new Date(comp.startDate).toLocaleDateString()}
                              {comp.endDate && <span> - {new Date(comp.endDate).toLocaleDateString()}</span>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="p-3 flex flex-wrap items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-white/60"
                        onClick={() => setExpandedCompId(expandedCompId === comp.id ? null : comp.id)}
                        data-testid={`button-expand-${comp.id}`}
                      >
                        {expandedCompId === comp.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                        View Details
                      </Button>
                      <div className="flex items-center gap-2">
                        <Select value={comp.status} onValueChange={(v) => updateStatusMutation.mutate({ id: comp.id, status: v })}>
                          <SelectTrigger className="bg-white/[0.08] border-white/20 text-white text-xs w-28" data-testid={`select-status-${comp.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#222] border-white/20 text-white">
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="voting">Voting</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedCompId(comp.id); setActiveTab("contestants"); }} data-testid={`button-view-contestants-${comp.id}`}>
                          <Users className="h-4 w-4 text-white/60" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setSelectedCompId(comp.id); setActiveTab("analytics"); }} data-testid={`button-view-analytics-${comp.id}`}>
                          <BarChart3 className="h-4 w-4 text-white/60" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Delete this event?")) deleteCompMutation.mutate(comp.id); }} data-testid={`button-delete-${comp.id}`}>
                          <XIcon className="h-4 w-4 text-red-400/60" />
                        </Button>
                      </div>
                    </div>
                    {expandedCompId === comp.id && <InlineHostCompDetail compId={comp.id} />}
                  </div>
                ))}
              </div>
              {filteredComps.length === 0 && (
                <div className="text-center py-12 text-white/30 text-sm" data-testid="text-no-events">
                  No events found matching your search.
                </div>
              )}
              {totalCompPages > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 mt-6" data-testid="event-pagination">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={compPage <= 1}
                    onClick={() => setCompPage(p => p - 1)}
                    className="text-white/60"
                    data-testid="button-event-prev"
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
                      data-testid={`button-event-page-${page}`}
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
                    data-testid="button-event-next"
                  >
                    Next
                  </Button>
                </div>
              )}
              </>
            )}
          </TabsContent>

          <TabsContent value="contestants">
            <div className="mb-4">
              <Label className="text-white/60 text-xs mb-2 block">Select Event</Label>
              <Select value={selectedCompId?.toString() ?? ""} onValueChange={(v) => setSelectedCompId(parseInt(v))}>
                <SelectTrigger className="bg-white/[0.08] border-white/20 text-white w-full max-w-sm" data-testid="select-event-contestants">
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-white/20 text-white">
                  {competitions.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedCompId ? (
              <div className="text-center py-12 text-white/30" data-testid="no-event-selected">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Select an event to view contestants</p>
              </div>
            ) : selectedContestants.length === 0 ? (
              <div className="text-center py-12 text-white/30" data-testid="no-contestants">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No contestants have applied yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedContestants.map(c => (
                  <div key={c.id} className="rounded-md bg-white/5 border border-white/5 p-4 flex flex-wrap items-center justify-between gap-4" data-testid={`contestant-card-${c.id}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium" data-testid={`contestant-name-${c.id}`}>{c.talentProfile?.displayName || "Unknown"}</p>
                      <p className="text-xs text-white/40">{c.talentProfile?.category || "No category"}</p>
                      {c.appliedAt && <p className="text-xs text-white/30 mt-1">Applied {new Date(c.appliedAt).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`border-0 ${c.applicationStatus === "approved" ? "bg-green-500/20 text-green-400" : c.applicationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`} data-testid={`contestant-status-${c.id}`}>
                        {c.applicationStatus}
                      </Badge>
                      {c.applicationStatus === "pending" && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => approveContestantMutation.mutate({ id: c.id, status: "approved" })} data-testid={`button-approve-${c.id}`}>
                            <Check className="h-4 w-4 text-green-400" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => approveContestantMutation.mutate({ id: c.id, status: "rejected" })} data-testid={`button-reject-${c.id}`}>
                            <XIcon className="h-4 w-4 text-red-400" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics">
            <div className="mb-4">
              <Label className="text-white/60 text-xs mb-2 block">Select Event</Label>
              <Select value={selectedCompId?.toString() ?? ""} onValueChange={(v) => setSelectedCompId(parseInt(v))}>
                <SelectTrigger className="bg-white/[0.08] border-white/20 text-white w-full max-w-sm" data-testid="select-event-analytics">
                  <SelectValue placeholder="Choose an event..." />
                </SelectTrigger>
                <SelectContent className="bg-[#222] border-white/20 text-white">
                  {competitions.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!selectedCompId || !selectedReport ? (
              <div className="text-center py-12 text-white/30" data-testid="no-analytics">
                <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Select an event to view analytics</p>
              </div>
            ) : (
              <div className="space-y-6" data-testid="analytics-content">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-md bg-white/5 border border-white/5 p-4">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Votes</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid="analytics-votes">{selectedReport.totalVotes}</p>
                  </div>
                  <div className="rounded-md bg-white/5 border border-white/5 p-4">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Contestants</p>
                    <p className="text-2xl font-bold" data-testid="analytics-contestants">{selectedReport.totalContestants}</p>
                  </div>
                  <div className="rounded-md bg-white/5 border border-white/5 p-4">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Revenue</p>
                    <p className="text-2xl font-bold text-green-400" data-testid="analytics-revenue">${(selectedReport.totalRevenue / 100).toFixed(2)}</p>
                  </div>
                  <div className="rounded-md bg-white/5 border border-white/5 p-4">
                    <p className="text-xs text-white/40 uppercase tracking-wider mb-1">Purchases</p>
                    <p className="text-2xl font-bold" data-testid="analytics-purchases">{selectedReport.totalPurchases}</p>
                  </div>
                </div>

                <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="leaderboard">
                  <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-4">Leaderboard</h3>
                  {selectedReport.leaderboard.length === 0 ? (
                    <p className="text-white/30 text-sm text-center py-6">No votes cast yet</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedReport.leaderboard.map((entry) => (
                        <div key={entry.contestantId} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 p-3" data-testid={`leaderboard-entry-${entry.contestantId}`}>
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${entry.rank === 1 ? "bg-orange-500/30 text-orange-300" : entry.rank === 2 ? "bg-white/10 text-white/80" : entry.rank === 3 ? "bg-amber-800/30 text-amber-400" : "bg-white/5 text-white/40"}`}>
                              {entry.rank}
                            </span>
                            <span className="font-medium">{entry.displayName}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-white/60">{entry.voteCount} votes</span>
                            <div className="w-20 h-2 rounded-full bg-white/10 overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500" style={{ width: `${entry.votePercentage}%` }} />
                            </div>
                            <span className="text-xs text-white/40 w-10 text-right">{entry.votePercentage}%</span>
                          </div>
                        </div>
                      ))}
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
