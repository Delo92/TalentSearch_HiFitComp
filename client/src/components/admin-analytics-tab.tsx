import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3, Trophy, Users, Vote, TrendingUp, Copy, Check, Share2,
  Trash2, Search, Globe, MapPin, DollarSign, RefreshCw, Link2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAuthToken } from "@/hooks/use-auth";

interface AnalyticsOverview {
  totalVotes: number;
  totalOnline: number;
  totalInPerson: number;
  totalRevenue: number;
  totalCompetitions: number;
  activeCompetitions: number;
  totalContestants: number;
  competitionStats: {
    id: number;
    title: string;
    category: string;
    status: string;
    totalVotes: number;
    onlineVotes: number;
    inPersonVotes: number;
    contestantCount: number;
    revenue: number;
  }[];
  topContestants: {
    id: number;
    name: string;
    competitionTitle: string;
    totalVotes: number;
    onlineVotes: number;
    inPersonVotes: number;
  }[];
}

interface ReferralCode {
  code: string;
  ownerId: string;
  ownerType: "talent" | "host" | "admin";
  ownerName: string;
  talentProfileId?: number | null;
  createdAt: string;
}

interface ReferralStats {
  code: string;
  ownerId: string;
  ownerType: "talent" | "host" | "admin";
  ownerName: string;
  totalVotesDriven: number;
  uniqueVoters: number;
}

interface ReferralData {
  stats: ReferralStats[];
  codes: ReferralCode[];
}

export default function AdminAnalyticsTab() {
  const { toast } = useToast();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [refSearch, setRefSearch] = useState("");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsOverview>({
    queryKey: ["/api/analytics/overview"],
    staleTime: 30000,
  });

  const { data: referralData, isLoading: referralLoading } = useQuery<ReferralData>({
    queryKey: ["/api/referral/stats"],
    staleTime: 30000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (code: string) => {
      await apiRequest("DELETE", `/api/referral/${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] });
      toast({ title: "Referral code deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete code", variant: "destructive" });
    },
  });

  const generateForAdminMutation = useMutation({
    mutationFn: async () => {
      const token = await getAuthToken();
      const res = await fetch("/api/referral/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] });
      toast({ title: "Referral code generated!" });
    },
  });

  const handleCopyLink = (code: string) => {
    const url = `${window.location.origin}?ref=${code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedCode(code);
      toast({ title: "Link copied!", description: `Referral link with code ${code} copied to clipboard.` });
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleShareLink = async (code: string, ownerName: string) => {
    const url = `${window.location.origin}?ref=${code}`;
    const text = `Vote on HiFitComp! Use referral code ${code} from ${ownerName}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "HiFitComp", text, url });
      } catch {}
    } else {
      handleCopyLink(code);
    }
  };

  const stats = referralData?.stats || [];
  const codes = referralData?.codes || [];
  const mergedReferrals = codes.map(c => {
    const s = stats.find(st => st.code === c.code);
    return {
      ...c,
      totalVotesDriven: s?.totalVotesDriven || 0,
      uniqueVoters: s?.uniqueVoters || 0,
    };
  }).sort((a, b) => b.totalVotesDriven - a.totalVotesDriven);

  const filteredReferrals = mergedReferrals.filter(r =>
    r.ownerName.toLowerCase().includes(refSearch.toLowerCase()) ||
    r.code.toLowerCase().includes(refSearch.toLowerCase())
  );

  const totalReferralVotes = mergedReferrals.reduce((sum, r) => sum + r.totalVotesDriven, 0);
  const totalUniqueVoters = mergedReferrals.reduce((sum, r) => sum + r.uniqueVoters, 0);

  return (
    <Tabs defaultValue="voting">
      <TabsList className="bg-white/5 border border-white/5 mb-6">
        <TabsTrigger value="voting" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white" data-testid="analytics-tab-voting">
          <BarChart3 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Voting Analytics</span>
        </TabsTrigger>
        <TabsTrigger value="referrals" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white" data-testid="analytics-tab-referrals">
          <Link2 className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Referral System</span>
        </TabsTrigger>
      </TabsList>

      {/* ── Voting Analytics Sub-Tab ──────────────────── */}
      <TabsContent value="voting">
        {analyticsLoading ? (
          <div className="text-center py-20 text-white/40">Loading analytics...</div>
        ) : analytics ? (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Vote} label="Total Votes" value={analytics.totalVotes.toLocaleString()} color="text-orange-400" />
              <StatCard icon={Globe} label="Online Votes" value={analytics.totalOnline.toLocaleString()} color="text-blue-400" />
              <StatCard icon={MapPin} label="In-Person Votes" value={analytics.totalInPerson.toLocaleString()} color="text-green-400" />
              <StatCard icon={DollarSign} label="Revenue" value={`$${analytics.totalRevenue.toFixed(2)}`} color="text-emerald-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatCard icon={Trophy} label="Total Competitions" value={String(analytics.totalCompetitions)} color="text-amber-400" />
              <StatCard icon={TrendingUp} label="Active/Voting" value={String(analytics.activeCompetitions)} color="text-orange-400" />
              <StatCard icon={Users} label="Approved Contestants" value={String(analytics.totalContestants)} color="text-purple-400" />
            </div>

            {analytics.totalVotes > 0 && (
              <div className="rounded-md bg-white/5 border border-white/5 p-5">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Vote Source Breakdown</h3>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 bg-white/10 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                      style={{ width: `${(analytics.totalOnline / analytics.totalVotes * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/60 w-24 text-right">
                    Online {Math.round(analytics.totalOnline / analytics.totalVotes * 100)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-white/10 rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                      style={{ width: `${(analytics.totalInPerson / analytics.totalVotes * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/60 w-24 text-right">
                    In-Person {Math.round(analytics.totalInPerson / analytics.totalVotes * 100)}%
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-md bg-white/5 border border-white/5 p-5">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Competition Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">Competition</th>
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">Category</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">Votes</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">Online</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">In-Person</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">Contestants</th>
                      <th className="text-right text-white/50 pb-3 font-medium">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.competitionStats.map(comp => (
                      <tr key={comp.id} className="border-b border-white/5" data-testid={`analytics-comp-${comp.id}`}>
                        <td className="py-3 pr-4 text-white font-medium">{comp.title}</td>
                        <td className="py-3 pr-4">
                          <Badge className="bg-orange-500/20 text-orange-300 border-0 text-[10px]">{comp.category}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-right text-orange-400 font-bold">{comp.totalVotes.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-blue-300">{comp.onlineVotes.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-green-300">{comp.inPersonVotes.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-white/60">{comp.contestantCount}</td>
                        <td className="py-3 text-right text-emerald-400">${comp.revenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-md bg-white/5 border border-white/5 p-5">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Top Contestants</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">#</th>
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">Contestant</th>
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">Competition</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">Total</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">Online</th>
                      <th className="text-right text-white/50 pb-3 font-medium">In-Person</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topContestants.map((c, i) => (
                      <tr key={c.id} className="border-b border-white/5" data-testid={`analytics-contestant-${c.id}`}>
                        <td className="py-3 pr-4 text-white/40 font-mono">{i + 1}</td>
                        <td className="py-3 pr-4 text-white font-medium">{c.name}</td>
                        <td className="py-3 pr-4 text-white/60">{c.competitionTitle}</td>
                        <td className="py-3 pr-4 text-right text-orange-400 font-bold">{c.totalVotes.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-blue-300">{c.onlineVotes.toLocaleString()}</td>
                        <td className="py-3 text-right text-green-300">{c.inPersonVotes.toLocaleString()}</td>
                      </tr>
                    ))}
                    {analytics.topContestants.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-white/30">No contestant data yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-white/40">Failed to load analytics</div>
        )}
      </TabsContent>

      {/* ── Referral System Sub-Tab ──────────────────── */}
      <TabsContent value="referrals">
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Link2} label="Total Referral Codes" value={String(mergedReferrals.length)} color="text-orange-400" />
            <StatCard icon={Vote} label="Votes via Referrals" value={totalReferralVotes.toLocaleString()} color="text-blue-400" />
            <StatCard icon={Users} label="Unique Voters Referred" value={totalUniqueVoters.toLocaleString()} color="text-green-400" />
            <StatCard icon={TrendingUp} label="Top Referrer Votes" value={mergedReferrals.length > 0 ? mergedReferrals[0].totalVotesDriven.toLocaleString() : "0"} color="text-purple-400" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <Input
                placeholder="Search by name or code..."
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                data-testid="input-referral-search"
              />
            </div>
            <Button
              variant="outline"
              className="border-orange-500/50 text-orange-400"
              onClick={() => generateForAdminMutation.mutate()}
              disabled={generateForAdminMutation.isPending}
              data-testid="button-generate-admin-referral"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${generateForAdminMutation.isPending ? "animate-spin" : ""}`} />
              Generate My Code
            </Button>
            <Button
              variant="ghost"
              className="text-white/50"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/referral/stats"] })}
              data-testid="button-refresh-referrals"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {referralLoading ? (
            <div className="text-center py-20 text-white/40">Loading referral data...</div>
          ) : (
            <div className="rounded-md bg-white/5 border border-white/5 p-5">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Referral Leaderboard</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">#</th>
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">Name</th>
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">Type</th>
                      <th className="text-left text-white/50 pb-3 pr-4 font-medium">Code</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">Votes Driven</th>
                      <th className="text-right text-white/50 pb-3 pr-4 font-medium">Unique Voters</th>
                      <th className="text-right text-white/50 pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReferrals.map((r, i) => (
                      <tr key={r.code} className="border-b border-white/5" data-testid={`referral-row-${r.code}`}>
                        <td className="py-3 pr-4 text-white/40 font-mono">{i + 1}</td>
                        <td className="py-3 pr-4 text-white font-medium">{r.ownerName}</td>
                        <td className="py-3 pr-4">
                          <Badge className={`border-0 text-[10px] ${
                            r.ownerType === "admin" ? "bg-red-500/20 text-red-300" :
                            r.ownerType === "host" ? "bg-blue-500/20 text-blue-300" :
                            "bg-orange-500/20 text-orange-300"
                          }`}>
                            {r.ownerType}
                          </Badge>
                        </td>
                        <td className="py-3 pr-4">
                          <code className="bg-white/10 px-2 py-0.5 rounded text-orange-300 text-xs font-mono">{r.code}</code>
                        </td>
                        <td className="py-3 pr-4 text-right text-orange-400 font-bold">{r.totalVotesDriven.toLocaleString()}</td>
                        <td className="py-3 pr-4 text-right text-white/60">{r.uniqueVoters.toLocaleString()}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-white/40"
                              onClick={() => handleCopyLink(r.code)}
                              data-testid={`button-copy-ref-${r.code}`}
                            >
                              {copiedCode === r.code ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-white/40"
                              onClick={() => handleShareLink(r.code, r.ownerName)}
                              data-testid={`button-share-ref-${r.code}`}
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-red-400/60"
                              onClick={() => deleteMutation.mutate(r.code)}
                              data-testid={`button-delete-ref-${r.code}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredReferrals.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-white/30">No referral codes yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <Icon className={`h-5 w-5 ${color} mb-2`} />
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}
