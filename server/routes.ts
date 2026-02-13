import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes } from "./replit_integrations/auth";
import { insertCompetitionSchema, insertTalentProfileSchema, insertVoteSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "client/public/uploads/livery");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const liveryUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  app.get("/api/competitions", async (_req, res) => {
    const comps = await storage.getCompetitions();
    res.json(comps);
  });

  app.get("/api/competitions/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

    const comp = await storage.getCompetition(id);
    if (!comp) return res.status(404).json({ message: "Competition not found" });

    const contestantsData = await storage.getContestantsByCompetition(id);
    const totalVotes = await storage.getTotalVotesByCompetition(id);

    res.json({
      ...comp,
      contestants: contestantsData,
      totalVotes,
    });
  });

  const createCompetitionSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().default(""),
    category: z.string().min(1, "Category is required"),
    status: z.enum(["draft", "active", "voting", "completed"]).optional().default("active"),
    voteCost: z.number().int().min(0).optional().default(0),
    maxVotesPerDay: z.number().int().min(1).optional().default(10),
    coverImage: z.string().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
  });

  app.post("/api/competitions", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const parsed = createCompetitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
    }

    const comp = await storage.createCompetition({
      ...parsed.data,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    });
    res.status(201).json(comp);
  });

  app.patch("/api/competitions/:id", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

    const updated = await storage.updateCompetition(id, req.body);
    if (!updated) return res.status(404).json({ message: "Competition not found" });
    res.json(updated);
  });

  app.delete("/api/competitions/:id", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });
    await storage.deleteCompetition(id);
    res.json({ message: "Deleted" });
  });

  const voteBodySchema = z.object({
    contestantId: z.number().int().positive("contestantId is required"),
  });

  app.post("/api/competitions/:id/vote", async (req, res) => {
    const compId = parseInt(req.params.id);
    if (isNaN(compId)) return res.status(400).json({ message: "Invalid competition ID" });

    const parsed = voteBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "contestantId required" });
    }

    const { contestantId } = parsed.data;

    const comp = await storage.getCompetition(compId);
    if (!comp) return res.status(404).json({ message: "Competition not found" });

    if (comp.status !== "voting" && comp.status !== "active") {
      return res.status(400).json({ message: "Voting is not open for this competition" });
    }

    const voterIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

    const votesToday = await storage.getVotesTodayByIp(compId, voterIp);
    if (votesToday >= comp.maxVotesPerDay) {
      return res.status(429).json({ message: `Daily vote limit reached (${comp.maxVotesPerDay} per day)` });
    }

    const vote = await storage.castVote({
      contestantId,
      competitionId: compId,
      voterIp,
    });
    res.status(201).json(vote);
  });

  app.post("/api/competitions/:id/apply", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile) return res.status(400).json({ message: "Create a talent profile first" });

    const compId = parseInt(req.params.id);
    if (isNaN(compId)) return res.status(400).json({ message: "Invalid competition ID" });

    const comp = await storage.getCompetition(compId);
    if (!comp) return res.status(404).json({ message: "Competition not found" });

    const existing = await storage.getContestant(compId, profile.id);
    if (existing) return res.status(400).json({ message: "Already applied to this competition" });

    const contestant = await storage.createContestant({
      competitionId: compId,
      talentProfileId: profile.id,
      applicationStatus: "pending",
    });
    res.status(201).json(contestant);
  });

  app.get("/api/talent-profiles/me", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    res.json(profile || null);
  });

  const createProfileSchema = z.object({
    displayName: z.string().min(1, "Display name is required"),
    bio: z.string().optional().default(""),
    category: z.string().optional().default(""),
    location: z.string().optional().default(""),
    imageUrls: z.array(z.string()).optional().default([]),
    videoUrls: z.array(z.string()).optional().default([]),
    socialLinks: z.string().optional().nullable(),
  });

  app.post("/api/talent-profiles", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const existing = await storage.getTalentProfileByUserId(userId);
    if (existing) return res.status(400).json({ message: "Profile already exists" });

    const parsed = createProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
    }

    const profile = await storage.createTalentProfile({
      ...parsed.data,
      userId,
      role: "talent",
    });
    res.status(201).json(profile);
  });

  app.patch("/api/talent-profiles/me", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { role, userId: _, ...safeData } = req.body;
    const updated = await storage.updateTalentProfile(userId, safeData);
    if (!updated) return res.status(404).json({ message: "Profile not found" });
    res.json(updated);
  });

  app.get("/api/talent-profiles/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid profile ID" });
    const profile = await storage.getTalentProfile(id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  });

  app.get("/api/contestants/me", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile) return res.json([]);

    const myContests = await storage.getContestantsByTalent(profile.id);
    res.json(myContests);
  });

  app.post("/api/admin/setup", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const admins = await storage.getAdminProfiles();
    if (admins.length > 0) {
      return res.status(403).json({ message: "Admin already exists. Contact existing admin for access." });
    }

    let profile = await storage.getTalentProfileByUserId(userId);
    if (profile) {
      profile = await storage.updateTalentProfile(userId, { role: "admin" }) || profile;
    } else {
      const userName = req.user?.claims?.first_name || req.user?.claims?.email || "Admin";
      profile = await storage.createTalentProfile({
        userId,
        displayName: userName,
        bio: "Platform administrator",
        category: null,
        location: null,
        imageUrls: [],
        videoUrls: [],
        socialLinks: null,
        role: "admin",
      });
    }
    res.json(profile);
  });

  app.get("/api/admin/contestants", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const allContestants = await storage.getAllContestants();
    res.json(allContestants);
  });

  app.patch("/api/admin/contestants/:id/status", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid contestant ID" });

    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await storage.updateContestantStatus(id, status);
    if (!updated) return res.status(404).json({ message: "Contestant not found" });
    res.json(updated);
  });

  app.get("/api/livery", async (_req, res) => {
    const items = await storage.getAllLivery();
    res.json(items);
  });

  app.put("/api/admin/livery/:imageKey", isAuthenticated, liveryUpload.single("image"), async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { imageKey } = req.params;
    const existing = await storage.getLiveryByKey(imageKey);
    if (!existing) return res.status(404).json({ message: "Livery item not found" });

    let imageUrl: string | null = null;

    if (req.file) {
      imageUrl = `/uploads/livery/${req.file.filename}`;
    } else if (req.body.imageUrl !== undefined) {
      imageUrl = req.body.imageUrl || null;
    }

    const updated = await storage.updateLiveryImage(imageKey, imageUrl);
    res.json(updated);
  });

  app.delete("/api/admin/livery/:imageKey", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const { imageKey } = req.params;
    const updated = await storage.updateLiveryImage(imageKey, null);
    if (!updated) return res.status(404).json({ message: "Livery item not found" });
    res.json(updated);
  });

  app.get("/api/admin/stats", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await storage.getTalentProfileByUserId(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    const comps = await storage.getCompetitions();
    const profiles = await storage.getAllTalentProfiles();
    const allContestants = await storage.getAllContestants();

    let totalVotes = 0;
    for (const comp of comps) {
      totalVotes += await storage.getTotalVotesByCompetition(comp.id);
    }

    res.json({
      totalCompetitions: comps.length,
      totalTalentProfiles: profiles.length,
      totalContestants: allContestants.length,
      totalVotes,
      pendingApplications: allContestants.filter((c) => c.applicationStatus === "pending").length,
    });
  });

  return httpServer;
}
