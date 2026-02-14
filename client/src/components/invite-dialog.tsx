import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { UserPlus, Mail, Copy, Check, Trash2, Clock, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Invitation {
  id: string;
  token: string;
  invitedBy: string;
  invitedByEmail: string;
  invitedByName: string;
  invitedEmail: string;
  invitedName: string;
  targetLevel: number;
  message: string | null;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Viewer",
  2: "Talent",
  3: "Host",
};

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-white/10 text-white/50",
  2: "bg-blue-500/20 text-blue-400",
  3: "bg-purple-500/20 text-purple-300",
};

function getInvitableLevels(senderLevel: number): number[] {
  const levels: number[] = [];
  for (let i = 1; i < senderLevel; i++) {
    levels.push(i);
  }
  return levels;
}

export function InviteDialog({ senderLevel }: { senderLevel: number }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [targetLevel, setTargetLevel] = useState("");
  const [message, setMessage] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const invitableLevels = getInvitableLevels(senderLevel);

  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ["/api/invitations/sent"],
    enabled: open,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; targetLevel: number; message?: string }) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return res.json();
    },
    onSuccess: (data: Invitation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/sent"] });
      setEmail("");
      setName("");
      setTargetLevel("");
      setMessage("");
      toast({ title: "Invitation sent!" });
      const link = `${window.location.origin}/register?invite=${data.token}`;
      navigator.clipboard.writeText(link).then(() => {
        setCopiedToken(data.token);
        setTimeout(() => setCopiedToken(null), 3000);
        toast({ title: "Invite link copied to clipboard!" });
      }).catch(() => {});
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/invitations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invitations/sent"] });
      toast({ title: "Invitation deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name || !targetLevel) return;
    inviteMutation.mutate({
      email,
      name,
      targetLevel: parseInt(targetLevel),
      message: message || undefined,
    });
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/register?invite=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 3000);
      toast({ title: "Invite link copied!" });
    });
  };

  if (invitableLevels.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-white/10 text-white" data-testid="button-invite-user">
          <Mail className="h-4 w-4 mr-1.5" /> Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-lg" data-testid="invite-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Invite User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60">Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-invite-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-invite-email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60">Role</Label>
            <Select value={targetLevel} onValueChange={setTargetLevel}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-invite-level">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {invitableLevels.map((l) => (
                  <SelectItem key={l} value={String(l)}>
                    Level {l} - {LEVEL_LABELS[l]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/60">Message (optional)</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message..."
              className="bg-white/5 border-white/10 text-white resize-none"
              rows={2}
              data-testid="input-invite-message"
            />
          </div>

          <Button
            type="submit"
            disabled={!email || !name || !targetLevel || inviteMutation.isPending}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white"
            data-testid="button-send-invite"
          >
            {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
          </Button>
        </form>

        {invitations && invitations.length > 0 && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <h4 className="text-xs uppercase tracking-widest text-orange-400 font-bold mb-3">Sent Invitations</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {invitations.map((inv) => (
                <div key={inv.id} className="rounded-md bg-white/5 border border-white/5 p-3 flex items-center gap-3" data-testid={`invite-row-${inv.id}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.invitedName}</p>
                    <p className="text-xs text-white/40 truncate">{inv.invitedEmail}</p>
                  </div>
                  <Badge className={`border-0 text-xs shrink-0 ${LEVEL_COLORS[inv.targetLevel] || "bg-white/10 text-white/50"}`}>
                    {LEVEL_LABELS[inv.targetLevel] || `Level ${inv.targetLevel}`}
                  </Badge>
                  {inv.status === "pending" ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white/40"
                        onClick={() => copyLink(inv.token)}
                        data-testid={`button-copy-invite-${inv.id}`}
                      >
                        {copiedToken === inv.token ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-400/60"
                        onClick={() => deleteMutation.mutate(inv.id)}
                        data-testid={`button-delete-invite-${inv.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : inv.status === "accepted" ? (
                    <Badge className="bg-green-500/20 text-green-400 border-0 text-xs shrink-0">
                      <UserCheck className="h-3 w-3 mr-1" /> Accepted
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-xs shrink-0">
                      <Clock className="h-3 w-3 mr-1" /> {inv.status}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CreateUserDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [level, setLevel] = useState("");
  const [stageName, setStageName] = useState("");

  const createMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; displayName: string; level: number; stageName?: string }) => {
      const res = await apiRequest("POST", "/api/admin/users/create", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setLevel("");
      setStageName("");
      setOpen(false);
      toast({ title: "User created successfully!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message.replace(/^\d+:\s*/, ""), variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName || !level) return;
    createMutation.mutate({
      email,
      password,
      displayName,
      level: parseInt(level),
      stageName: stageName || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-orange-500 to-amber-500 text-white" data-testid="button-create-user">
          <UserPlus className="h-4 w-4 mr-1.5" /> Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-lg" data-testid="create-user-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Create User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60">Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Full name"
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-create-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-create-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/60">Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-create-password"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/60">Role</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid="select-create-level">
                  <SelectValue placeholder="Select role..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="1">Level 1 - Viewer</SelectItem>
                  <SelectItem value="2">Level 2 - Talent</SelectItem>
                  <SelectItem value="3">Level 3 - Host</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(level === "2" || level === "3") && (
            <div className="space-y-1.5">
              <Label className="text-white/60">Stage Name (optional)</Label>
              <Input
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="Stage or display name"
                className="bg-white/5 border-white/10 text-white"
                data-testid="input-create-stagename"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={!email || !password || !displayName || !level || createMutation.isPending}
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white"
            data-testid="button-submit-create-user"
          >
            {createMutation.isPending ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
