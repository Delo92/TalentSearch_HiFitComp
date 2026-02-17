import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getAuthToken } from "@/hooks/use-auth";
import { Eye, ExternalLink, Mail, MapPin, Download } from "lucide-react";

interface CompDetailResponse {
  competition: {
    id: number;
    title: string;
    category: string;
    status: string;
  };
  totalVotes: number;
  hosts: {
    id: number;
    fullName: string;
    email: string;
    organization?: string;
    status: string;
  }[];
  contestants: {
    id: number;
    talentProfileId: number;
    applicationStatus: string;
    displayName: string;
    stageName?: string;
    category?: string;
    imageUrls?: string[];
    email?: string;
    location?: string;
    voteCount: number;
  }[];
}

export function CompetitionDetailModal({ compId }: { compId: number }) {
  const { data, isLoading } = useQuery<CompDetailResponse>({
    queryKey: ["/api/competitions", compId, "detail"],
  });

  const { data: breakdown } = useQuery<{ online: number; inPerson: number; total: number; onlineVoteWeight: number; inPersonOnly: boolean }>({
    queryKey: ["/api/competitions", compId, "vote-breakdown"],
  });

  const toggleInPersonMutation = useMutation({
    mutationFn: async (value: boolean) => {
      await apiRequest("PATCH", `/api/competitions/${compId}`, { inPersonOnly: value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", compId, "vote-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions", compId, "detail"] });
      queryClient.invalidateQueries({ queryKey: ["/api/host/competitions"] });
    },
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
              {competition.status === "voting" ? "Active" : competition.status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-white/40">Total Votes</p>
            <p className="font-bold text-lg bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent" data-testid="comp-detail-votes">{totalVotes}</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-white/5">
          <Button
            variant="outline"
            size="sm"
            className="border-orange-500/30 text-orange-400"
            onClick={async () => {
              try {
                const token = getAuthToken();
                const res = await fetch(`/api/competitions/${compId}/qrcode`, {
                  headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!res.ok) throw new Error("Failed to download QR code");
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `qr-${competition.title.toLowerCase().replace(/\s+/g, "-")}.png`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                console.error("QR download error:", err);
              }
            }}
            data-testid="comp-detail-qr-download"
          >
            <Download className="h-4 w-4 mr-2" /> Download QR Code
          </Button>
        </div>
      </div>

      <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="comp-detail-vote-breakdown">
        <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Vote Breakdown</h3>
        {breakdown && (breakdown.online > 0 || breakdown.inPerson > 0) ? (
          <div>
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                <span className="text-white/60">Online: <span className="text-white font-medium">{breakdown.online}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                <span className="text-white/60">In-Person: <span className="text-white font-medium">{breakdown.inPerson}</span></span>
              </div>
              {breakdown.onlineVoteWeight < 100 && (
                <span className="text-white/30 text-[10px]">Online weight: {breakdown.onlineVoteWeight}%</span>
              )}
            </div>
            {breakdown.total > 0 && (
              <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden flex">
                <div className="bg-blue-400 h-full" style={{ width: `${(breakdown.online / breakdown.total) * 100}%` }} />
                <div className="bg-orange-400 h-full" style={{ width: `${(breakdown.inPerson / breakdown.total) * 100}%` }} />
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/30">No votes recorded yet.</p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-md bg-white/[0.04] border border-white/10 px-3 py-2.5">
        <div>
          <p className="text-xs text-white/70 font-medium">In-Person Only Event</p>
          <p className="text-[10px] text-white/30">Only QR code votes accepted when enabled</p>
        </div>
        <Switch
          checked={breakdown?.inPersonOnly || false}
          onCheckedChange={(v) => toggleInPersonMutation.mutate(v)}
          disabled={toggleInPersonMutation.isPending}
          className="data-[state=checked]:bg-orange-500"
          data-testid={`toggle-in-person-modal-${compId}`}
        />
      </div>

      <div className="rounded-md bg-white/5 border border-white/5 p-4" data-testid="comp-detail-hosts">
        <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Host(s)</h3>
        {hosts.length > 0 ? (
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
        ) : (
          <p className="text-sm text-white/30">No host assigned to this competition.</p>
        )}
      </div>

      <div data-testid="comp-detail-contestants">
        <h3 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Contestants ({contestants.length})</h3>
        {contestants.length > 0 ? (
          <div className="space-y-2">
            {contestants.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white/5 border border-white/5 p-3" data-testid={`comp-contestant-${c.id}`}>
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={c.imageUrls?.[0] || ""} />
                    <AvatarFallback className="bg-orange-500/20 text-orange-400 text-xs font-bold">
                      {c.displayName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium text-sm" data-testid={`contestant-name-${c.id}`}>{c.displayName}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {c.stageName && <span className="text-xs text-white/40" data-testid={`contestant-stage-${c.id}`}>{c.stageName}</span>}
                      {c.category && <span className="text-xs text-white/30">{c.category}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-[11px] text-orange-400/70 hover:text-orange-400 truncate" data-testid={`contestant-email-${c.id}`}>
                          <Mail className="h-3 w-3 shrink-0" /> {c.email}
                        </a>
                      )}
                      {c.location && (
                        <span className="flex items-center gap-1 text-[11px] text-white/30" data-testid={`contestant-location-${c.id}`}>
                          <MapPin className="h-3 w-3 shrink-0" /> {c.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
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
