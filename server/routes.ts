import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { firebaseAuth, requireAdmin, requireHost, requireTalent } from "./auth-middleware";
import {
  verifyFirebaseToken,
  createFirebaseUser,
  setUserLevel,
  getFirestoreUser,
  createFirestoreUser,
  updateFirestoreUser,
  getFirebaseAuth,
  getFirestore,
} from "./firebase-admin";
import {
  firestoreCategories,
  firestoreVotePackages,
  firestoreSettings,
  firestoreViewerProfiles,
  firestoreVotePurchases,
  firestoreVotes,
  firestoreJoinSettings,
  firestoreJoinSubmissions,
  firestoreHostSettings,
  firestoreHostSubmissions,
  firestoreInvitations,
} from "./firestore-collections";
import { chargePaymentNonce, getPublicConfig } from "./authorize-net";
import {
  uploadImageToDrive,
  listTalentImages,
  listAllTalentImages,
  getFileStream,
  deleteFile,
  getDriveImageUrl,
  getDriveThumbnailUrl,
  createCompetitionDriveFolder,
  createContestantDriveFolders,
} from "./google-drive";
import {
  listTalentVideos,
  listAllTalentVideos,
  createUploadTicket,
  deleteVideo,
  getVideoThumbnail,
  createCompetitionVimeoFolder,
  createContestantVimeoFolder,
} from "./vimeo";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.resolve(process.cwd(), "client/public/uploads/livery");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const compCoversDir = path.resolve(process.cwd(), "client/public/uploads/covers");
if (!fs.existsSync(compCoversDir)) {
  fs.mkdirSync(compCoversDir, { recursive: true });
}

const compCoverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, compCoversDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedImages = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const allowedVideos = /\.(mp4|webm|mov)$/i;
    if (allowedImages.test(path.extname(file.originalname)) || allowedVideos.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});

const liveryUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedImages = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    const allowedVideos = /\.(mp4|webm|mov)$/i;
    if (allowedImages.test(path.extname(file.originalname)) || allowedVideos.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, png, gif, webp, svg) and video files (mp4, webm, mov) are allowed"));
    }
  },
});

function isVideoFile(filename: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(filename);
}

async function getVideoDuration(filePath: string): Promise<number> {
  const { execSync } = require("child_process");
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf-8", timeout: 10000 }
    );
    return parseFloat(output.trim());
  } catch {
    return -1;
  }
}

const talentImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
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

  app.get("/api/firebase-config", (_req, res) => {
    res.json({
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: "hifitcomp.firebaseapp.com",
      projectId: "hifitcomp",
      storageBucket: "hifitcomp.firebasestorage.app",
      messagingSenderId: "679824704394",
      appId: "1:679824704394:web:ace3a59115a4645175fe73",
      measurementId: "G-FPCK9DJDHD",
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName, stageName, level: requestedLevel, socialLinks, billingAddress, inviteToken } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      let level = [1, 2, 3].includes(requestedLevel) ? requestedLevel : 1;
      let invitation = null;

      if (inviteToken) {
        invitation = await firestoreInvitations.getByToken(inviteToken);
        if (invitation && invitation.status === "pending") {
          if (invitation.invitedEmail.toLowerCase().trim() !== email.toLowerCase().trim()) {
            return res.status(403).json({ message: "This invitation was sent to a different email address" });
          }
          level = invitation.targetLevel;
        }
      }

      const firebaseUser = await createFirebaseUser(email, password, displayName);
      await setUserLevel(firebaseUser.uid, level);

      await createFirestoreUser({
        uid: firebaseUser.uid,
        email,
        displayName: displayName || email.split("@")[0],
        stageName: stageName || undefined,
        level,
        socialLinks: socialLinks || undefined,
        billingAddress: billingAddress || undefined,
      });

      if (invitation && invitation.status === "pending") {
        await firestoreInvitations.markAccepted(inviteToken, firebaseUser.uid);
      }

      const roleMap: Record<number, string> = { 1: "viewer", 2: "talent", 3: "host", 4: "admin" };
      if (level >= 2) {
        await storage.createTalentProfile({
          userId: firebaseUser.uid,
          displayName: displayName || email.split("@")[0],
          stageName: stageName || null,
          bio: null,
          category: null,
          location: null,
          imageUrls: [],
          videoUrls: [],
          socialLinks: socialLinks ? JSON.stringify(socialLinks) : null,
          role: roleMap[level],
        });
      }

      res.status(201).json({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        level,
      });
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        return res.status(400).json({ message: "Email already in use" });
      }
      if (error.code === "auth/weak-password") {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/sync", firebaseAuth, async (req, res) => {
    try {
      const { uid, email } = req.firebaseUser!;

      let firestoreUser = await getFirestoreUser(uid);
      if (!firestoreUser) {
        firestoreUser = await createFirestoreUser({
          uid,
          email,
          displayName: email.split("@")[0],
          level: 1,
        });
      }

      const profile = await storage.getTalentProfileByUserId(uid);

      res.json({
        uid,
        email: firestoreUser.email,
        displayName: firestoreUser.displayName,
        stageName: firestoreUser.stageName || null,
        level: firestoreUser.level,
        profileImageUrl: firestoreUser.profileImageUrl || null,
        socialLinks: firestoreUser.socialLinks || null,
        billingAddress: firestoreUser.billingAddress || null,
        hasProfile: !!profile,
        profileRole: profile?.role || null,
      });
    } catch (error: any) {
      console.error("Auth sync error:", error);
      res.status(500).json({ message: "Auth sync failed" });
    }
  });

  app.get("/api/auth/user", firebaseAuth, async (req, res) => {
    try {
      const { uid } = req.firebaseUser!;
      const firestoreUser = await getFirestoreUser(uid);
      if (!firestoreUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const profile = await storage.getTalentProfileByUserId(uid);

      res.json({
        uid: firestoreUser.uid,
        email: firestoreUser.email,
        displayName: firestoreUser.displayName,
        stageName: firestoreUser.stageName || null,
        level: firestoreUser.level,
        profileImageUrl: firestoreUser.profileImageUrl || null,
        socialLinks: firestoreUser.socialLinks || null,
        billingAddress: firestoreUser.billingAddress || null,
        hasProfile: !!profile,
        profileRole: profile?.role || null,
      });
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.post("/api/auth/set-admin", firebaseAuth, async (req, res) => {
    try {
      const { uid } = req.firebaseUser!;

      const admins = await storage.getAdminProfiles();
      if (admins.length > 0) {
        const firestoreUser = await getFirestoreUser(uid);
        if (!firestoreUser || firestoreUser.level < 4) {
          return res.status(403).json({ message: "Admin already exists. Contact existing admin." });
        }
      }

      await setUserLevel(uid, 4);
      await updateFirestoreUser(uid, { level: 4 });

      let profile = await storage.getTalentProfileByUserId(uid);
      if (profile) {
        profile = await storage.updateTalentProfile(uid, { role: "admin" }) || profile;
      } else {
        const firestoreUser = await getFirestoreUser(uid);
        profile = await storage.createTalentProfile({
          userId: uid,
          displayName: firestoreUser?.displayName || "Admin",
          stageName: null,
          bio: "Platform administrator",
          category: null,
          location: null,
          imageUrls: [],
          videoUrls: [],
          socialLinks: null,
          role: "admin",
        });
      }

      res.json({ message: "Admin access granted", level: 4, profile });
    } catch (error: any) {
      console.error("Set admin error:", error);
      res.status(500).json({ message: "Failed to set admin" });
    }
  });


  app.get("/api/stats/total-votes", async (req, res) => {
    try {
      const total = await firestoreVotes.getTotalPlatformVotes();
      res.json({ totalVotes: total });
    } catch (error: any) {
      console.error("Total votes error:", error);
      res.status(500).json({ message: "Failed to get total votes" });
    }
  });

  app.get("/api/competitions", async (req, res) => {
    try {
      const { category, status } = req.query;
      let comps;
      if (category && status) {
        comps = await storage.getCompetitionsByCategoryAndStatus(String(category), String(status));
      } else if (category) {
        comps = await storage.getCompetitionsByCategory(String(category));
      } else if (status) {
        comps = await storage.getCompetitionsByStatus(String(status));
      } else {
        comps = await storage.getCompetitions();
      }
      res.json(comps);
    } catch (error: any) {
      console.error("Get competitions error:", error);
      res.status(500).json({ message: "Failed to get competitions" });
    }
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
    votingStartDate: z.string().optional().nullable(),
    votingEndDate: z.string().optional().nullable(),
    expectedContestants: z.number().int().min(0).optional().nullable(),
  });

  app.post("/api/competitions", firebaseAuth, requireHost, async (req, res) => {
    const parsed = createCompetitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
    }

    const comp = await storage.createCompetition({
      ...parsed.data,
      description: parsed.data.description || null,
      coverImage: parsed.data.coverImage || null,
      coverVideo: null,
      startDate: parsed.data.startDate || null,
      endDate: parsed.data.endDate || null,
      votingStartDate: parsed.data.votingStartDate || null,
      votingEndDate: parsed.data.votingEndDate || null,
      expectedContestants: parsed.data.expectedContestants ?? null,
      createdAt: new Date().toISOString(),
      createdBy: req.firebaseUser!.uid,
    });

    try {
      await Promise.all([
        createCompetitionDriveFolder(comp.title),
        createCompetitionVimeoFolder(comp.title),
      ]);
    } catch (folderErr: any) {
      console.error("Auto-create competition folders error (non-blocking):", folderErr.message);
    }

    res.status(201).json(comp);
  });

  app.patch("/api/competitions/:id", firebaseAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

    const updated = await storage.updateCompetition(id, req.body);
    if (!updated) return res.status(404).json({ message: "Competition not found" });
    res.json(updated);
  });

  app.delete("/api/competitions/:id", firebaseAuth, requireAdmin, async (req, res) => {
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

  app.post("/api/competitions/:id/apply", firebaseAuth, async (req, res) => {
    const uid = req.firebaseUser!.uid;

    const profile = await storage.getTalentProfileByUserId(uid);
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
      appliedAt: new Date().toISOString(),
    });
    res.status(201).json(contestant);
  });


  app.get("/api/talent-profiles/me", firebaseAuth, async (req, res) => {
    const uid = req.firebaseUser!.uid;
    const profile = await storage.getTalentProfileByUserId(uid);
    res.json(profile || null);
  });

  const createProfileSchema = z.object({
    displayName: z.string().min(1, "Display name is required"),
    stageName: z.string().optional().nullable(),
    bio: z.string().optional().default(""),
    category: z.string().optional().default(""),
    location: z.string().optional().default(""),
    imageUrls: z.array(z.string()).optional().default([]),
    videoUrls: z.array(z.string()).optional().default([]),
    socialLinks: z.string().optional().nullable(),
  });

  app.post("/api/talent-profiles", firebaseAuth, async (req, res) => {
    const uid = req.firebaseUser!.uid;

    const existing = await storage.getTalentProfileByUserId(uid);
    if (existing) return res.status(400).json({ message: "Profile already exists" });

    const parsed = createProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
    }

    const profile = await storage.createTalentProfile({
      ...parsed.data,
      userId: uid,
      role: "talent",
    });
    res.status(201).json(profile);
  });

  app.patch("/api/talent-profiles/me", firebaseAuth, async (req, res) => {
    const uid = req.firebaseUser!.uid;
    const { role, userId: _, ...safeData } = req.body;
    const updated = await storage.updateTalentProfile(uid, safeData);
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

  app.get("/api/contestants/me", firebaseAuth, async (req, res) => {
    const uid = req.firebaseUser!.uid;
    const profile = await storage.getTalentProfileByUserId(uid);
    if (!profile) return res.json([]);
    const myContests = await storage.getContestantsByTalent(profile.id);
    res.json(myContests);
  });


  app.get("/api/host/competitions", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const competitions = await storage.getCompetitionsByCreator(uid);
    res.json(competitions);
  });

  app.get("/api/host/stats", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const competitions = await storage.getCompetitionsByCreator(uid);
    let totalContestants = 0;
    let totalVotes = 0;
    let pendingApplications = 0;

    for (const comp of competitions) {
      const allContestants = await storage.getContestantsByCompetition(comp.id);
      totalContestants += allContestants.length;
      for (const c of allContestants) {
        totalVotes += c.voteCount;
      }
      const allContestantsRaw = await storage.getAllContestants();
      const pending = allContestantsRaw.filter(
        c => c.competitionId === comp.id && c.applicationStatus === "pending"
      );
      pendingApplications += pending.length;
    }

    res.json({
      totalCompetitions: competitions.length,
      totalContestants,
      totalVotes,
      pendingApplications,
    });
  });

  app.get("/api/host/contestants", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const competitions = await storage.getCompetitionsByCreator(uid);
    const compIds = new Set(competitions.map(c => c.id));
    const allContestants = await storage.getAllContestants();
    const hostContestants = allContestants.filter(c => compIds.has(c.competitionId));
    res.json(hostContestants);
  });

  app.get("/api/host/competitions/:id/contestants", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

    const comp = await storage.getCompetition(id);
    if (!comp || comp.createdBy !== uid) {
      return res.status(403).json({ message: "Not your competition" });
    }

    const allContestants = await storage.getAllContestants();
    const compContestants = allContestants.filter(c => c.competitionId === id);
    res.json(compContestants);
  });

  app.patch("/api/host/contestants/:id/status", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid contestant ID" });

    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const allContestants = await storage.getAllContestants();
    const contestant = allContestants.find(c => c.id === id);
    if (!contestant) return res.status(404).json({ message: "Contestant not found" });

    const comp = await storage.getCompetition(contestant.competitionId);
    if (!comp || comp.createdBy !== uid) {
      return res.status(403).json({ message: "Not your competition" });
    }

    const updated = await storage.updateContestantStatus(id, status);
    res.json(updated);
  });

  app.patch("/api/host/competitions/:id", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

    const comp = await storage.getCompetition(id);
    if (!comp || comp.createdBy !== uid) {
      return res.status(403).json({ message: "Not your competition" });
    }

    const updated = await storage.updateCompetition(id, req.body);
    if (!updated) return res.status(404).json({ message: "Competition not found" });
    res.json(updated);
  });

  app.put("/api/host/competitions/:id/cover", firebaseAuth, requireHost, compCoverUpload.single("cover"), async (req, res) => {
    try {
      const { uid } = req.firebaseUser!;
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

      const comp = await storage.getCompetition(id);
      if (!comp || comp.createdBy !== uid) {
        return res.status(403).json({ message: "Not your competition" });
      }

      if (!req.file) return res.status(400).json({ message: "No file provided" });

      const filePath = path.join(compCoversDir, req.file.filename);
      const isVideo = isVideoFile(req.file.originalname);

      if (isVideo) {
        const duration = await getVideoDuration(filePath);
        if (duration > 30) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: `Video must be 30 seconds or less. Uploaded video is ${Math.round(duration)} seconds.` });
        }
      }

      const url = `/uploads/covers/${req.file.filename}`;
      const updateData: any = {};
      if (isVideo) {
        updateData.coverVideo = url;
      } else {
        updateData.coverImage = url;
      }

      const updated = await storage.updateCompetition(id, updateData);
      if (!updated) return res.status(404).json({ message: "Competition not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Host cover upload error:", error);
      res.status(500).json({ message: "Failed to upload cover" });
    }
  });

  app.delete("/api/host/competitions/:id", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

    const comp = await storage.getCompetition(id);
    if (!comp || comp.createdBy !== uid) {
      return res.status(403).json({ message: "Not your competition" });
    }

    await storage.deleteCompetition(id);
    res.json({ message: "Deleted" });
  });

  app.get("/api/host/competitions/:id/report", firebaseAuth, requireHost, async (req, res) => {
    const { uid } = req.firebaseUser!;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

    const comp = await storage.getCompetition(id);
    if (!comp || comp.createdBy !== uid) {
      return res.status(403).json({ message: "Not your competition" });
    }

    const contestants = await storage.getContestantsByCompetition(id);
    const totalVotes = contestants.reduce((sum, c) => sum + c.voteCount, 0);
    const leaderboard = contestants
      .sort((a, b) => b.voteCount - a.voteCount)
      .map((c, i) => ({
        rank: i + 1,
        contestantId: c.id,
        displayName: c.talentProfile.displayName,
        voteCount: c.voteCount,
        votePercentage: totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0,
      }));

    const purchases = await storage.getVotePurchasesByCompetition(id);
    const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);

    res.json({
      competition: comp,
      leaderboard,
      totalVotes,
      totalRevenue,
      totalContestants: contestants.length,
      totalPurchases: purchases.length,
    });
  });

  app.get("/api/admin/contestants", firebaseAuth, requireAdmin, async (_req, res) => {
    const allContestants = await storage.getAllContestants();
    res.json(allContestants);
  });

  app.patch("/api/admin/contestants/:id/status", firebaseAuth, requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid contestant ID" });

    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updated = await storage.updateContestantStatus(id, status);
    if (!updated) return res.status(404).json({ message: "Contestant not found" });

    if (status === "approved") {
      try {
        const profile = await storage.getTalentProfile(updated.talentProfileId);
        const comp = await storage.getCompetition(updated.competitionId);
        if (profile && comp) {
          const talentName = (profile.stageName || profile.displayName).replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
          await Promise.all([
            createContestantDriveFolders(comp.title, talentName),
            createContestantVimeoFolder(comp.title, talentName),
          ]);
        }
      } catch (folderErr: any) {
        console.error("Auto-create contestant folders error (non-blocking):", folderErr.message);
      }
    }

    res.json(updated);
  });

  app.get("/api/admin/stats", firebaseAuth, requireAdmin, async (_req, res) => {
    try {
      const comps = await storage.getCompetitions();
      const profiles = await storage.getAllTalentProfiles();
      const allContestants = await storage.getAllContestants();

      let totalVotes = 0;
      const competitionStats = [];
      for (const comp of comps) {
        const compVotes = await storage.getTotalVotesByCompetition(comp.id);
        totalVotes += compVotes;
        const compContestants = allContestants.filter(c => c.competitionId === comp.id);
        competitionStats.push({
          id: comp.id,
          title: comp.title,
          category: comp.category,
          status: comp.status,
          totalVotes: compVotes,
          totalContestants: compContestants.length,
          pendingApplications: compContestants.filter(c => c.applicationStatus === "pending").length,
          approvedContestants: compContestants.filter(c => c.applicationStatus === "approved").length,
        });
      }

      const statusCounts: Record<string, number> = {};
      for (const comp of comps) {
        statusCounts[comp.status] = (statusCounts[comp.status] || 0) + 1;
      }

      const categoryCounts: Record<string, number> = {};
      for (const comp of comps) {
        categoryCounts[comp.category] = (categoryCounts[comp.category] || 0) + 1;
      }

      res.json({
        totalCompetitions: comps.length,
        totalTalentProfiles: profiles.length,
        totalContestants: allContestants.length,
        totalVotes,
        pendingApplications: allContestants.filter((c) => c.applicationStatus === "pending").length,
        competitionsByStatus: statusCounts,
        competitionsByCategory: categoryCounts,
        competitionStats,
      });
    } catch (error: any) {
      console.error("Admin stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/admin/competitions/:id/report", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

      const comp = await storage.getCompetition(id);
      if (!comp) return res.status(404).json({ message: "Competition not found" });

      const contestantsData = await storage.getContestantsByCompetition(id);
      const totalVotes = await storage.getTotalVotesByCompetition(id);
      const purchases = await storage.getVotePurchasesByCompetition(id);

      const totalRevenue = purchases.reduce((sum, p) => sum + p.amount, 0);
      const totalPurchasedVotes = purchases.reduce((sum, p) => sum + p.voteCount, 0);

      const leaderboard = contestantsData
        .sort((a, b) => b.voteCount - a.voteCount)
        .map((c, index) => ({
          rank: index + 1,
          contestantId: c.id,
          talentProfileId: c.talentProfileId,
          displayName: c.talentProfile.displayName,
          stageName: c.talentProfile.stageName,
          voteCount: c.voteCount,
          votePercentage: totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 10000) / 100 : 0,
        }));

      res.json({
        competition: comp,
        totalVotes,
        totalContestants: contestantsData.length,
        totalRevenue,
        totalPurchasedVotes,
        totalPurchases: purchases.length,
        leaderboard,
      });
    } catch (error: any) {
      console.error("Competition report error:", error);
      res.status(500).json({ message: "Failed to get competition report" });
    }
  });

  app.get("/api/competitions/:id/leaderboard", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

      const comp = await storage.getCompetition(id);
      if (!comp) return res.status(404).json({ message: "Competition not found" });

      const contestantsData = await storage.getContestantsByCompetition(id);
      const totalVotes = await storage.getTotalVotesByCompetition(id);

      const leaderboard = contestantsData
        .sort((a, b) => b.voteCount - a.voteCount)
        .map((c, index) => ({
          rank: index + 1,
          contestantId: c.id,
          talentProfileId: c.talentProfileId,
          displayName: c.talentProfile.displayName,
          stageName: c.talentProfile.stageName,
          category: c.talentProfile.category,
          voteCount: c.voteCount,
          votePercentage: totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 10000) / 100 : 0,
        }));

      res.json({ competitionId: id, totalVotes, leaderboard });
    } catch (error: any) {
      console.error("Leaderboard error:", error);
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  app.get("/api/admin/users", firebaseAuth, requireAdmin, async (_req, res) => {
    try {
      const profiles = await storage.getAllTalentProfiles();
      res.json(profiles);
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.get("/api/admin/hosts", firebaseAuth, requireAdmin, async (_req, res) => {
    try {
      const hostProfiles = await storage.getHostProfiles();
      const allComps = await storage.getCompetitions();
      const hosts = hostProfiles.map(h => {
        const hostComps = allComps.filter(c => c.createdBy === h.userId);
        return {
          ...h,
          competitionCount: hostComps.length,
          activeCompetitions: hostComps.filter(c => c.status === "active" || c.status === "voting").length,
        };
      });
      res.json(hosts);
    } catch (error: any) {
      console.error("Get hosts error:", error);
      res.status(500).json({ message: "Failed to get hosts" });
    }
  });

  app.get("/api/admin/hosts/:uid/competitions", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      const comps = await storage.getCompetitionsByCreator(uid);
      const result = [];
      for (const comp of comps) {
        const contestants = await storage.getContestantsByCompetition(comp.id);
        result.push({
          ...comp,
          contestants: contestants.map(c => ({
            id: c.id,
            talentProfileId: c.talentProfileId,
            applicationStatus: c.applicationStatus,
            displayName: c.talentProfile.displayName,
            stageName: c.talentProfile.stageName,
            category: c.talentProfile.category,
            imageUrls: c.talentProfile.imageUrls,
            voteCount: c.voteCount,
          })),
        });
      }
      res.json(result);
    } catch (error: any) {
      console.error("Get host competitions error:", error);
      res.status(500).json({ message: "Failed to get host competitions" });
    }
  });

  app.patch("/api/admin/competitions/:id/assign-host", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });
      const { hostUid } = req.body;
      if (!hostUid) return res.status(400).json({ message: "hostUid is required" });
      const updated = await storage.updateCompetition(id, { createdBy: hostUid });
      if (!updated) return res.status(404).json({ message: "Competition not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Assign host error:", error);
      res.status(500).json({ message: "Failed to assign host" });
    }
  });

  app.put("/api/admin/competitions/:id/cover", firebaseAuth, requireAdmin, compCoverUpload.single("cover"), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

      if (!req.file) return res.status(400).json({ message: "No file provided" });

      const filePath = path.join(compCoversDir, req.file.filename);
      const isVideo = isVideoFile(req.file.originalname);

      if (isVideo) {
        const duration = await getVideoDuration(filePath);
        if (duration > 30) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: `Video must be 30 seconds or less. Uploaded video is ${Math.round(duration)} seconds.` });
        }
      }

      const url = `/uploads/covers/${req.file.filename}`;
      const updateData: any = {};
      if (isVideo) {
        updateData.coverVideo = url;
      } else {
        updateData.coverImage = url;
      }

      const updated = await storage.updateCompetition(id, updateData);
      if (!updated) return res.status(404).json({ message: "Competition not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Cover upload error:", error);
      res.status(500).json({ message: "Failed to upload cover" });
    }
  });

  app.delete("/api/admin/competitions/:id/cover", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });
      const { type } = req.query;
      const updateData: any = {};
      if (type === "video") {
        updateData.coverVideo = null;
      } else {
        updateData.coverImage = null;
      }
      const updated = await storage.updateCompetition(id, updateData);
      if (!updated) return res.status(404).json({ message: "Competition not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Cover delete error:", error);
      res.status(500).json({ message: "Failed to remove cover" });
    }
  });

  app.patch("/api/admin/users/:uid/level", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      const { level } = req.body;
      if (![1, 2, 3, 4].includes(level)) {
        return res.status(400).json({ message: "Level must be 1, 2, 3, or 4" });
      }

      await setUserLevel(uid, level);
      await updateFirestoreUser(uid, { level });

      const roleMap: Record<number, string> = { 1: "viewer", 2: "talent", 3: "host", 4: "admin" };
      await storage.updateTalentProfile(uid, { role: roleMap[level] as any });

      res.json({ message: "User level updated", uid, level });
    } catch (error: any) {
      console.error("Update user level error:", error);
      res.status(500).json({ message: "Failed to update user level" });
    }
  });

  app.post("/api/admin/users/create", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { email, password, displayName, level, stageName, socialLinks } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ message: "Email, password, and display name are required" });
      }
      if (![1, 2, 3].includes(level)) {
        return res.status(400).json({ message: "Level must be 1, 2, or 3" });
      }

      const firebaseUser = await createFirebaseUser(email, password, displayName);
      await setUserLevel(firebaseUser.uid, level);

      await createFirestoreUser({
        uid: firebaseUser.uid,
        email,
        displayName,
        level,
        stageName: stageName || undefined,
        socialLinks: socialLinks || undefined,
      });

      const roleMap: Record<number, string> = { 1: "viewer", 2: "talent", 3: "host", 4: "admin" };
      await storage.createTalentProfile({
        userId: firebaseUser.uid,
        displayName,
        stageName: stageName || null,
        bio: null,
        category: null,
        location: null,
        imageUrls: [],
        videoUrls: [],
        socialLinks: socialLinks ? JSON.stringify(socialLinks) : null,
        role: roleMap[level],
      });

      res.status(201).json({
        uid: firebaseUser.uid,
        email,
        displayName,
        level,
      });
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        return res.status(400).json({ message: "Email already in use" });
      }
      console.error("Admin create user error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.post("/api/invitations", firebaseAuth, requireTalent, async (req, res) => {
    try {
      const { email, name, targetLevel, message } = req.body;
      if (!email || !name || !targetLevel) {
        return res.status(400).json({ message: "Email, name, and target level are required" });
      }

      const senderLevel = req.firebaseUser!.level;
      if (targetLevel >= senderLevel) {
        return res.status(403).json({ message: "You can only invite users to a lower level than your own" });
      }
      if (targetLevel < 1) {
        return res.status(400).json({ message: "Invalid target level" });
      }

      const senderUser = await getFirestoreUser(req.firebaseUser!.uid);
      const invitation = await firestoreInvitations.create({
        invitedBy: req.firebaseUser!.uid,
        invitedByEmail: req.firebaseUser!.email,
        invitedByName: senderUser?.displayName || req.firebaseUser!.email,
        invitedEmail: email,
        invitedName: name,
        targetLevel,
        message: message || undefined,
      });

      res.status(201).json(invitation);
    } catch (error: any) {
      console.error("Create invitation error:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.get("/api/invitations/sent", firebaseAuth, requireTalent, async (req, res) => {
    try {
      const invitations = await firestoreInvitations.getBySender(req.firebaseUser!.uid);
      res.json(invitations);
    } catch (error: any) {
      console.error("Get sent invitations error:", error);
      res.status(500).json({ message: "Failed to get invitations" });
    }
  });

  app.get("/api/invitations/all", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const invitations = await firestoreInvitations.getAll();
      res.json(invitations);
    } catch (error: any) {
      console.error("Get all invitations error:", error);
      res.status(500).json({ message: "Failed to get invitations" });
    }
  });

  app.get("/api/invitations/token/:token", async (req, res) => {
    try {
      const invitation = await firestoreInvitations.getByToken(req.params.token);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: `Invitation has already been ${invitation.status}` });
      }
      res.json({
        invitedEmail: invitation.invitedEmail,
        invitedName: invitation.invitedName,
        targetLevel: invitation.targetLevel,
        invitedByName: invitation.invitedByName,
        message: invitation.message,
      });
    } catch (error: any) {
      console.error("Get invitation by token error:", error);
      res.status(500).json({ message: "Failed to get invitation" });
    }
  });

  app.delete("/api/invitations/:id", firebaseAuth, requireTalent, async (req, res) => {
    try {
      await firestoreInvitations.delete(req.params.id);
      res.json({ message: "Invitation deleted" });
    } catch (error: any) {
      console.error("Delete invitation error:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });

  app.get("/api/admin/competitions/:id/detail", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid competition ID" });

      const comp = await storage.getCompetition(id);
      if (!comp) return res.status(404).json({ message: "Competition not found" });

      const allContestantsRaw = await storage.getAllContestants();
      const compContestants = allContestantsRaw.filter(c => c.competitionId === id);
      const totalVotes = await storage.getTotalVotesByCompetition(id);

      const hostSubs = await firestoreHostSubmissions.getAll();
      const matchingHosts = hostSubs.filter(h =>
        h.eventName?.toLowerCase().includes(comp.title.toLowerCase()) ||
        comp.title.toLowerCase().includes(h.eventName?.toLowerCase() || "")
      );

      const contestantDetails = [];
      for (const c of compContestants) {
        const voteCount = await storage.getVoteCountForContestantInCompetition(c.id, id);
        contestantDetails.push({
          id: c.id,
          talentProfileId: c.talentProfileId,
          applicationStatus: c.applicationStatus,
          appliedAt: c.appliedAt,
          displayName: c.talentProfile.displayName,
          stageName: (c.talentProfile as any).stageName || null,
          category: c.talentProfile.category,
          imageUrls: c.talentProfile.imageUrls,
          bio: c.talentProfile.bio,
          voteCount,
        });
      }

      res.json({
        competition: comp,
        totalVotes,
        hosts: matchingHosts.map(h => ({
          id: h.id,
          fullName: h.fullName,
          email: h.email,
          organization: h.organization,
          eventName: h.eventName,
          status: h.status,
          amountPaid: h.amountPaid,
        })),
        contestants: contestantDetails,
      });
    } catch (error: any) {
      console.error("Competition detail error:", error);
      res.status(500).json({ message: "Failed to get competition detail" });
    }
  });

  app.get("/api/admin/users/:profileId/detail", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      if (isNaN(profileId)) return res.status(400).json({ message: "Invalid profile ID" });

      const profile = await storage.getTalentProfile(profileId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const firestoreUser = await getFirestoreUser(profile.userId);

      const contestantEntries = await storage.getContestantsByTalent(profileId);

      const votingStats = [];
      for (const entry of contestantEntries) {
        const comp = await storage.getCompetition(entry.competitionId);
        if (!comp) continue;
        const voteCount = await storage.getVoteCountForContestantInCompetition(entry.id, entry.competitionId);
        const totalCompVotes = await storage.getTotalVotesByCompetition(entry.competitionId);
        const allContestants = await storage.getContestantsByCompetition(entry.competitionId);
        const sorted = allContestants.sort((a, b) => b.voteCount - a.voteCount);
        const rank = sorted.findIndex(c => c.id === entry.id) + 1;

        votingStats.push({
          competitionId: comp.id,
          competitionTitle: comp.title,
          competitionStatus: comp.status,
          applicationStatus: entry.applicationStatus,
          voteCount,
          totalVotes: totalCompVotes,
          votePercentage: totalCompVotes > 0 ? Math.round((voteCount / totalCompVotes) * 10000) / 100 : 0,
          rank: rank > 0 ? rank : null,
          totalContestants: allContestants.length,
        });
      }

      const talentName = ((profile as any).stageName || profile.displayName).replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();

      let driveImages: any[] = [];
      let vimeoVideos: any[] = [];
      try {
        driveImages = await listAllTalentImages(talentName);
        driveImages = driveImages.map(img => ({
          ...img,
          imageUrl: getDriveImageUrl(img.id),
          thumbnailUrl: getDriveThumbnailUrl(img.id),
        }));
      } catch {}
      try {
        const rawVideos = await listAllTalentVideos(talentName);
        vimeoVideos = rawVideos.map(v => ({
          uri: v.uri,
          name: v.name,
          link: v.link,
          embedUrl: v.player_embed_url,
          duration: v.duration,
          thumbnail: getVideoThumbnail(v),
          competitionFolder: v.competitionFolder,
        }));
      } catch {}

      const activeStats = votingStats.filter(s => s.competitionStatus === "active" || s.competitionStatus === "voting");
      const pastStats = votingStats.filter(s => s.competitionStatus === "completed");
      const upcomingEvents = votingStats.filter(s => s.competitionStatus === "draft" && s.applicationStatus === "approved");

      res.json({
        profile: {
          ...profile,
          email: firestoreUser?.email || null,
          level: firestoreUser?.level || 2,
          socialLinks: (profile as any).socialLinks || firestoreUser?.socialLinks || null,
        },
        activeStats,
        pastStats,
        upcomingEvents,
        driveImages,
        vimeoVideos,
      });
    } catch (error: any) {
      console.error("User detail error:", error);
      res.status(500).json({ message: "Failed to get user detail" });
    }
  });

  app.post("/api/admin/users/:profileId/assign", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      if (isNaN(profileId)) return res.status(400).json({ message: "Invalid profile ID" });

      const { competitionId } = req.body;
      if (!competitionId) return res.status(400).json({ message: "competitionId is required" });

      const compId = parseInt(competitionId);
      const profile = await storage.getTalentProfile(profileId);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const comp = await storage.getCompetition(compId);
      if (!comp) return res.status(404).json({ message: "Competition not found" });

      const existing = await storage.getContestant(compId, profileId);
      if (existing) return res.status(400).json({ message: "Already assigned to this competition" });

      const contestant = await storage.createContestant({
        competitionId: compId,
        talentProfileId: profileId,
        applicationStatus: "approved",
        appliedAt: new Date().toISOString(),
      });

      try {
        const talentName = ((profile as any).stageName || profile.displayName).replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
        await Promise.all([
          createContestantDriveFolders(comp.title, talentName),
          createContestantVimeoFolder(comp.title, talentName),
        ]);
      } catch (folderErr: any) {
        console.error("Auto-create assigned contestant folders error (non-blocking):", folderErr.message);
      }

      res.status(201).json(contestant);
    } catch (error: any) {
      console.error("Assign user error:", error);
      res.status(500).json({ message: "Failed to assign user to competition" });
    }
  });


  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await firestoreCategories.getAll();
      res.json(categories);
    } catch (error: any) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Failed to get categories" });
    }
  });

  app.post("/api/admin/categories", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { name, description, imageUrl, order, isActive } = req.body;
      if (!name) return res.status(400).json({ message: "Category name is required" });

      const category = await firestoreCategories.create({
        name,
        description: description || "",
        imageUrl: imageUrl || null,
        order: order || 0,
        isActive: isActive !== false,
      });
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Create category error:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await firestoreCategories.update(id, req.body);
      if (!updated) return res.status(404).json({ message: "Category not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Update category error:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await firestoreCategories.delete(id);
      res.json({ message: "Category deleted" });
    } catch (error: any) {
      console.error("Delete category error:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });


  app.get("/api/shop/packages", async (_req, res) => {
    try {
      const packages = await firestoreVotePackages.getActive();
      res.json(packages);
    } catch (error: any) {
      console.error("Get vote packages error:", error);
      res.status(500).json({ message: "Failed to get vote packages" });
    }
  });

  app.get("/api/admin/shop/packages", firebaseAuth, requireAdmin, async (_req, res) => {
    try {
      const packages = await firestoreVotePackages.getAll();
      res.json(packages);
    } catch (error: any) {
      console.error("Get all vote packages error:", error);
      res.status(500).json({ message: "Failed to get vote packages" });
    }
  });

  app.post("/api/admin/shop/packages", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { name, description, voteCount, bonusVotes, price, isActive, order } = req.body;
      if (!name || !voteCount || price === undefined) {
        return res.status(400).json({ message: "name, voteCount, and price are required" });
      }

      const pkg = await firestoreVotePackages.create({
        name,
        description: description || "",
        voteCount,
        bonusVotes: bonusVotes || 0,
        price,
        isActive: isActive !== false,
        order: order || 0,
      });
      res.status(201).json(pkg);
    } catch (error: any) {
      console.error("Create vote package error:", error);
      res.status(500).json({ message: "Failed to create vote package" });
    }
  });

  app.patch("/api/admin/shop/packages/:id", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await firestoreVotePackages.update(id, req.body);
      if (!updated) return res.status(404).json({ message: "Vote package not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Update vote package error:", error);
      res.status(500).json({ message: "Failed to update vote package" });
    }
  });

  app.delete("/api/admin/shop/packages/:id", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await firestoreVotePackages.delete(id);
      res.json({ message: "Vote package deleted" });
    } catch (error: any) {
      console.error("Delete vote package error:", error);
      res.status(500).json({ message: "Failed to delete vote package" });
    }
  });


  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await firestoreSettings.get();
      res.json(settings || {
        siteName: "HiFitComp",
        siteDescription: "Talent Competition & Voting Platform",
        contactEmail: "admin@hifitcomp.com",
        defaultVoteCost: 0,
        defaultMaxVotesPerDay: 10,
      });
    } catch (error: any) {
      console.error("Get settings error:", error);
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.put("/api/admin/settings", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await firestoreSettings.update(req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });


  app.get("/api/join/settings", async (_req, res) => {
    try {
      const settings = await firestoreJoinSettings.get();
      res.json(settings);
    } catch (error: any) {
      console.error("Get join settings error:", error);
      res.status(500).json({ message: "Failed to get join settings" });
    }
  });

  app.put("/api/admin/join/settings", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await firestoreJoinSettings.update(req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update join settings error:", error);
      res.status(500).json({ message: "Failed to update join settings" });
    }
  });

  app.post("/api/join/submit", async (req, res) => {
    try {
      const settings = await firestoreJoinSettings.get();
      if (!settings.isActive) {
        return res.status(400).json({ message: "Join applications are currently closed" });
      }

      const { fullName, email, phone, address, city, state, zip, bio, category, socialLinks, mediaUrls, competitionId, dataDescriptor, dataValue } = req.body;
      if (!fullName || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }
      if (!competitionId) {
        return res.status(400).json({ message: "Please select a competition to apply for" });
      }

      let transactionId: string | null = null;
      let amountPaid = 0;
      if (settings.mode === "purchase" && settings.price > 0) {
        if (!dataDescriptor || !dataValue) {
          return res.status(400).json({ message: "Payment is required to join" });
        }
        const chargeResult = await chargePaymentNonce(
          settings.price / 100,
          dataDescriptor,
          dataValue,
          `Join competition application`,
          email,
          fullName,
        );
        transactionId = chargeResult.transactionId;
        amountPaid = settings.price;
      }

      const autoApproved = settings.mode === "purchase" && amountPaid > 0;
      const submission = await firestoreJoinSubmissions.create({
        competitionId: competitionId || null,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        bio: bio || null,
        category: category || null,
        socialLinks: socialLinks || null,
        mediaUrls: mediaUrls || [],
        transactionId,
        amountPaid,
      });

      if (autoApproved) {
        await firestoreJoinSubmissions.updateStatus(submission.id, "approved");
        if (competitionId) {
          try {
            const comp = await storage.getCompetition(competitionId);
            if (comp) {
              const safeTalentName = fullName.trim().replace(/[^a-zA-Z0-9_\-\s]/g, "_");
              await Promise.all([
                createContestantDriveFolders(comp.title, safeTalentName),
                createContestantVimeoFolder(comp.title, safeTalentName),
              ]);
            }
          } catch (folderErr: any) {
            console.error("Auto-create join contestant folders error (non-blocking):", folderErr.message);
          }
        }
      }

      res.status(201).json({ ...submission, status: autoApproved ? "approved" : submission.status });
    } catch (error: any) {
      console.error("Join submission error:", error);
      if (error.errorMessage) {
        return res.status(400).json({ message: `Payment failed: ${error.errorMessage}` });
      }
      res.status(500).json({ message: "Submission failed. Please try again." });
    }
  });

  app.get("/api/admin/join/submissions", firebaseAuth, requireAdmin, async (_req, res) => {
    try {
      const submissions = await firestoreJoinSubmissions.getAll();
      res.json(submissions);
    } catch (error: any) {
      console.error("Get join submissions error:", error);
      res.status(500).json({ message: "Failed to get submissions" });
    }
  });

  app.patch("/api/admin/join/submissions/:id/status", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const updated = await firestoreJoinSubmissions.updateStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ message: "Submission not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Update join submission error:", error);
      res.status(500).json({ message: "Failed to update submission" });
    }
  });

  app.get("/api/host/settings", async (_req, res) => {
    try {
      const settings = await firestoreHostSettings.get();
      res.json(settings);
    } catch (error: any) {
      console.error("Get host settings error:", error);
      res.status(500).json({ message: "Failed to get host settings" });
    }
  });

  app.put("/api/admin/host/settings", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await firestoreHostSettings.update(req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("Update host settings error:", error);
      res.status(500).json({ message: "Failed to update host settings" });
    }
  });

  app.post("/api/host/submit", async (req, res) => {
    try {
      const settings = await firestoreHostSettings.get();
      if (!settings.isActive) {
        return res.status(400).json({ message: "Host applications are currently closed" });
      }

      const { fullName, email, phone, organization, address, city, state, zip, eventName, eventDescription, eventCategory, eventDate, socialLinks, mediaUrls, dataDescriptor, dataValue } = req.body;
      if (!fullName || !email || !eventName) {
        return res.status(400).json({ message: "Name, email, and event name are required" });
      }

      let transactionId: string | null = null;
      let amountPaid = 0;
      if (settings.mode === "purchase" && settings.price > 0) {
        if (!dataDescriptor || !dataValue) {
          return res.status(400).json({ message: "Payment is required to host" });
        }
        const chargeResult = await chargePaymentNonce(
          settings.price / 100,
          dataDescriptor,
          dataValue,
          `Host event application: ${eventName}`,
          email,
          fullName,
        );
        transactionId = chargeResult.transactionId;
        amountPaid = settings.price;
      }

      const submission = await firestoreHostSubmissions.create({
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone || null,
        organization: organization || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        eventName: eventName.trim(),
        eventDescription: eventDescription || null,
        eventCategory: eventCategory || null,
        eventDate: eventDate || null,
        socialLinks: socialLinks || null,
        mediaUrls: mediaUrls || [],
        transactionId,
        amountPaid,
      });

      res.status(201).json(submission);
    } catch (error: any) {
      console.error("Host submission error:", error);
      if (error.errorMessage) {
        return res.status(400).json({ message: `Payment failed: ${error.errorMessage}` });
      }
      res.status(500).json({ message: "Submission failed. Please try again." });
    }
  });

  app.get("/api/admin/host/submissions", firebaseAuth, requireAdmin, async (_req, res) => {
    try {
      const submissions = await firestoreHostSubmissions.getAll();
      res.json(submissions);
    } catch (error: any) {
      console.error("Get host submissions error:", error);
      res.status(500).json({ message: "Failed to get submissions" });
    }
  });

  app.patch("/api/admin/host/submissions/:id/status", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const updated = await firestoreHostSubmissions.updateStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ message: "Submission not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Update host submission error:", error);
      res.status(500).json({ message: "Failed to update submission" });
    }
  });


  app.get("/api/payment-config", (_req, res) => {
    const config = getPublicConfig();
    res.json(config);
  });

  const guestCheckoutSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
    competitionId: z.number().int().positive(),
    contestantId: z.number().int().positive(),
    packageId: z.string().min(1, "Package is required"),
    packageIndex: z.number().int().min(0).optional(),
    createAccount: z.boolean().default(false),
    dataDescriptor: z.string().min(1, "Payment token is required"),
    dataValue: z.string().min(1, "Payment token is required"),
  });

  app.post("/api/guest/checkout", async (req, res) => {
    try {
      const parsed = guestCheckoutSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { name, email, competitionId, contestantId, packageId, packageIndex, createAccount, dataDescriptor, dataValue } = parsed.data;

      const comp = await storage.getCompetition(competitionId);
      if (!comp) return res.status(404).json({ message: "Competition not found" });
      if (comp.status !== "voting" && comp.status !== "active") {
        return res.status(400).json({ message: "Voting is not open for this competition" });
      }

      let pkg: { voteCount: number; bonusVotes: number; price: number; name: string } | null = null;

      if (packageIndex !== undefined) {
        const settingsDoc = await getFirestore().collection("platformSettings").doc("global").get();
        const settings = settingsDoc.exists ? settingsDoc.data() : null;
        const votePackages = settings?.votePackages || [
          { name: "Starter Pack", voteCount: 500, bonusVotes: 0, price: 10 },
          { name: "Fan Pack", voteCount: 1000, bonusVotes: 300, price: 15 },
          { name: "Super Fan Pack", voteCount: 2000, bonusVotes: 600, price: 30 },
        ];
        if (packageIndex >= 0 && packageIndex < votePackages.length) {
          const vpkg = votePackages[packageIndex];
          pkg = { voteCount: vpkg.voteCount, bonusVotes: vpkg.bonusVotes || 0, price: vpkg.price * 100, name: vpkg.name };
        }
      }

      if (!pkg) {
        const firestorePkg = await firestoreVotePackages.get(packageId);
        if (firestorePkg && firestorePkg.isActive) {
          pkg = { voteCount: firestorePkg.voteCount, bonusVotes: firestorePkg.bonusVotes || 0, price: firestorePkg.price, name: firestorePkg.name };
        }
      }

      if (!pkg) return res.status(404).json({ message: "Vote package not found" });

      const totalVotes = pkg.voteCount + (pkg.bonusVotes || 0);
      const subtotalDollars = pkg.price / 100;

      const settingsForTax = await getFirestore().collection("platformSettings").doc("global").get();
      const salesTaxPercent = settingsForTax.exists ? (settingsForTax.data()?.salesTaxPercent || 0) : 0;
      const taxAmount = subtotalDollars * (salesTaxPercent / 100);
      const amountInDollars = Math.round((subtotalDollars + taxAmount) * 100) / 100;

      const chargeResult = await chargePaymentNonce(
        amountInDollars,
        dataDescriptor,
        dataValue,
        `${totalVotes} votes for ${comp.title}`,
        email,
        name,
      );

      let viewerId: string | null = null;
      if (createAccount) {
        const viewer = await firestoreViewerProfiles.getOrCreate(email, name);
        viewerId = viewer.id;
        await firestoreViewerProfiles.recordPurchase(viewer.id, totalVotes, pkg.price);
      }

      const purchase = await firestoreVotePurchases.create({
        userId: null,
        viewerId,
        guestEmail: email.toLowerCase().trim(),
        guestName: name.trim(),
        competitionId,
        contestantId,
        voteCount: totalVotes,
        amount: pkg.price,
        transactionId: chargeResult.transactionId,
      });

      await storage.castBulkVotes({
        contestantId,
        competitionId,
        userId: viewerId || `guest_${purchase.id}`,
        purchaseId: purchase.id,
        voteCount: totalVotes,
      });

      res.status(201).json({
        success: true,
        purchase,
        transactionId: chargeResult.transactionId,
        votesAdded: pkg.voteCount,
        accountCreated: createAccount,
        viewerId,
      });
    } catch (error: any) {
      console.error("Guest checkout error:", error);
      if (error.errorMessage) {
        return res.status(400).json({ message: `Payment failed: ${error.errorMessage}` });
      }
      res.status(500).json({ message: "Checkout failed. Please try again." });
    }
  });

  const guestLookupSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Valid email is required"),
  });

  app.post("/api/guest/lookup", async (req, res) => {
    try {
      const parsed = guestLookupSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }

      const { name, email } = parsed.data;
      const viewer = await firestoreViewerProfiles.lookup(email, name);
      if (!viewer) {
        return res.status(404).json({ message: "No account found with that name and email. Make sure they match exactly what you used at checkout." });
      }

      const purchases = await firestoreVotePurchases.getByViewer(viewer.id);

      const purchaseDetails = [];
      for (const p of purchases) {
        const comp = await storage.getCompetition(p.competitionId);
        purchaseDetails.push({
          ...p,
          competitionTitle: comp?.title || "Unknown Competition",
        });
      }

      res.json({
        viewer,
        purchases: purchaseDetails,
      });
    } catch (error: any) {
      console.error("Guest lookup error:", error);
      res.status(500).json({ message: "Lookup failed" });
    }
  });


  app.get("/api/platform-settings", async (_req, res) => {
    try {
      const db = getFirestore();
      const doc = await db.collection("platformSettings").doc("global").get();
      if (!doc.exists) {
        res.json({
          hostingPackages: [
            { name: "Starter", price: 49, maxContestants: 5, revenueSharePercent: 20, description: "Up to 5 competitors per event" },
            { name: "Pro", price: 149, maxContestants: 15, revenueSharePercent: 35, description: "Up to 15 competitors per event" },
            { name: "Premium", price: 399, maxContestants: 25, revenueSharePercent: 50, description: "25+ competitors with top revenue share" },
          ],
          votePackages: [
            { name: "Starter Pack", voteCount: 500, bonusVotes: 0, price: 10, description: "500 votes to support your favorite" },
            { name: "Fan Pack", voteCount: 1000, bonusVotes: 300, price: 15, description: "1,000 votes + 300 bonus votes" },
            { name: "Super Fan Pack", voteCount: 2000, bonusVotes: 600, price: 30, description: "2,000 votes + 600 bonus votes" },
          ],
          salesTaxPercent: 0,
          defaultVoteCost: 0,
          freeVotesPerDay: 5,
          votePricePerVote: 1,
          joinPrice: 0,
          hostPrice: 0,
        });
        return;
      }
      res.json(doc.data());
    } catch (error: any) {
      console.error("Platform settings error:", error);
      res.status(500).json({ message: "Failed to get platform settings" });
    }
  });

  app.put("/api/admin/platform-settings", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const db = getFirestore();
      const settings = req.body;
      await db.collection("platformSettings").doc("global").set(settings, { merge: true });
      res.json({ message: "Settings saved", ...settings });
    } catch (error: any) {
      console.error("Save platform settings error:", error);
      res.status(500).json({ message: "Failed to save platform settings" });
    }
  });

  app.get("/api/livery", async (_req, res) => {
    const items = await storage.getAllLivery();
    res.json(items);
  });

  app.put("/api/admin/livery/:imageKey", firebaseAuth, requireAdmin, liveryUpload.single("image"), async (req, res) => {
    const { imageKey } = req.params;
    const existing = await storage.getLiveryByKey(imageKey);
    if (!existing) return res.status(404).json({ message: "Livery item not found" });

    let imageUrl: string | null = null;
    let mediaType: "image" | "video" = "image";

    if (req.file) {
      const filePath = path.join(uploadsDir, req.file.filename);
      if (isVideoFile(req.file.originalname)) {
        const duration = await getVideoDuration(filePath);
        if (duration > 15) {
          fs.unlinkSync(filePath);
          return res.status(400).json({ message: `Video must be 15 seconds or less. Uploaded video is ${Math.round(duration)} seconds.` });
        }
        if (duration < 0) {
          console.warn("Could not determine video duration, allowing upload");
        }
        mediaType = "video";
      }
      imageUrl = `/uploads/livery/${req.file.filename}`;
    } else if (req.body.imageUrl !== undefined) {
      imageUrl = req.body.imageUrl || null;
      if (req.body.mediaType === "video") mediaType = "video";
    }

    const updated = await storage.updateLiveryImage(imageKey, imageUrl, mediaType);
    res.json(updated);
  });

  app.put("/api/admin/livery/:imageKey/text", firebaseAuth, requireAdmin, async (req, res) => {
    const { imageKey } = req.params;
    const { textContent } = req.body;
    const existing = await storage.getLiveryByKey(imageKey);
    if (!existing) return res.status(404).json({ message: "Livery item not found" });
    const updated = await storage.updateLiveryText(imageKey, textContent ?? null);
    res.json(updated);
  });

  app.delete("/api/admin/livery/:imageKey", firebaseAuth, requireAdmin, async (req, res) => {
    const { imageKey } = req.params;
    const updated = await storage.updateLiveryImage(imageKey, null);
    if (!updated) return res.status(404).json({ message: "Livery item not found" });
    res.json(updated);
  });


  app.post("/api/drive/upload", firebaseAuth, talentImageUpload.single("image"), async (req, res) => {
    try {
      const uid = req.firebaseUser!.uid;
      const profile = await storage.getTalentProfileByUserId(uid);
      if (!profile) return res.status(400).json({ message: "Create a talent profile first" });

      if (!req.file) return res.status(400).json({ message: "No image file provided" });

      const { competitionId } = req.body;
      if (!competitionId) return res.status(400).json({ message: "competitionId is required" });

      const comp = await storage.getCompetition(parseInt(competitionId));
      if (!comp) return res.status(404).json({ message: "Competition not found" });

      const talentName = (profile.stageName || profile.displayName).replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
      const result = await uploadImageToDrive(
        comp.title,
        talentName,
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer
      );

      const imageUrl = getDriveImageUrl(result.id);
      const thumbnailUrl = getDriveThumbnailUrl(result.id);

      const currentUrls = profile.imageUrls || [];
      await storage.updateTalentProfile(uid, {
        imageUrls: [...currentUrls, imageUrl],
      });

      res.json({
        fileId: result.id,
        imageUrl,
        thumbnailUrl,
        webViewLink: result.webViewLink,
      });
    } catch (error: any) {
      console.error("Drive upload error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.get("/api/drive/images", firebaseAuth, async (req, res) => {
    try {
      const uid = req.firebaseUser!.uid;
      const profile = await storage.getTalentProfileByUserId(uid);
      if (!profile) return res.json([]);

      const competitionId = req.query.competitionId ? parseInt(req.query.competitionId as string) : null;
      const talentName = (profile.stageName || profile.displayName).replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();

      if (competitionId) {
        const comp = await storage.getCompetition(competitionId);
        if (!comp) return res.json([]);
        const images = await listTalentImages(comp.title, talentName);
        res.json(images.map(img => ({
          ...img,
          imageUrl: getDriveImageUrl(img.id),
          thumbnailUrl: getDriveThumbnailUrl(img.id),
        })));
      } else {
        const allImages = await listAllTalentImages(talentName);
        res.json(allImages.map(img => ({
          ...img,
          imageUrl: getDriveImageUrl(img.id),
          thumbnailUrl: getDriveThumbnailUrl(img.id),
        })));
      }
    } catch (error: any) {
      console.error("Drive list error:", error);
      res.status(500).json({ message: "Failed to list images" });
    }
  });

  app.delete("/api/drive/images/:fileId", firebaseAuth, async (req, res) => {
    try {
      const uid = req.firebaseUser!.uid;
      const profile = await storage.getTalentProfileByUserId(uid);
      if (!profile) return res.status(400).json({ message: "Profile not found" });

      const { fileId } = req.params;
      await deleteFile(fileId);

      const imageUrl = getDriveImageUrl(fileId);
      const currentUrls = profile.imageUrls || [];
      await storage.updateTalentProfile(uid, {
        imageUrls: currentUrls.filter(url => url !== imageUrl),
      });

      res.json({ message: "Image deleted" });
    } catch (error: any) {
      console.error("Drive delete error:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  app.get("/api/drive/proxy/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      const stream = await getFileStream(fileId);
      res.setHeader("Cache-Control", "public, max-age=86400");
      stream.pipe(res);
    } catch (error: any) {
      console.error("Drive proxy error:", error);
      res.status(404).json({ message: "File not found" });
    }
  });


  app.get("/api/vimeo/videos", firebaseAuth, async (req, res) => {
    try {
      const uid = req.firebaseUser!.uid;
      const profile = await storage.getTalentProfileByUserId(uid);
      if (!profile) return res.json([]);

      const competitionId = req.query.competitionId ? parseInt(req.query.competitionId as string) : null;
      const talentName = (profile.stageName || profile.displayName).replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();

      if (competitionId) {
        const comp = await storage.getCompetition(competitionId);
        if (!comp) return res.json([]);
        const videos = await listTalentVideos(comp.title, talentName);
        res.json(videos.map(v => ({
          uri: v.uri,
          name: v.name,
          description: v.description,
          link: v.link,
          embedUrl: v.player_embed_url,
          duration: v.duration,
          status: v.status,
          thumbnail: getVideoThumbnail(v),
          createdTime: v.created_time,
        })));
      } else {
        const allVideos = await listAllTalentVideos(talentName);
        res.json(allVideos.map(v => ({
          uri: v.uri,
          name: v.name,
          description: v.description,
          link: v.link,
          embedUrl: v.player_embed_url,
          duration: v.duration,
          status: v.status,
          thumbnail: getVideoThumbnail(v),
          createdTime: v.created_time,
          competitionFolder: v.competitionFolder,
        })));
      }
    } catch (error: any) {
      console.error("Vimeo list error:", error);
      res.status(500).json({ message: "Failed to list videos" });
    }
  });

  app.post("/api/vimeo/upload-ticket", firebaseAuth, async (req, res) => {
    try {
      const uid = req.firebaseUser!.uid;
      const profile = await storage.getTalentProfileByUserId(uid);
      if (!profile) return res.status(400).json({ message: "Create a talent profile first" });

      const { fileName, fileSize, competitionId } = req.body;
      if (!fileName || !fileSize) {
        return res.status(400).json({ message: "fileName and fileSize are required" });
      }
      if (!competitionId) {
        return res.status(400).json({ message: "competitionId is required" });
      }

      const comp = await storage.getCompetition(parseInt(competitionId));
      if (!comp) return res.status(404).json({ message: "Competition not found" });

      const talentName = (profile.stageName || profile.displayName).replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
      const ticket = await createUploadTicket(comp.title, talentName, fileName, fileSize);

      res.json(ticket);
    } catch (error: any) {
      console.error("Vimeo upload ticket error:", error);
      res.status(500).json({ message: "Failed to create upload ticket" });
    }
  });

  app.delete("/api/vimeo/videos/:videoId", firebaseAuth, async (req, res) => {
    try {
      const { videoId } = req.params;
      await deleteVideo(`/videos/${videoId}`);
      res.json({ message: "Video deleted" });
    } catch (error: any) {
      console.error("Vimeo delete error:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });


  app.patch("/api/auth/profile", firebaseAuth, async (req, res) => {
    try {
      const { uid } = req.firebaseUser!;
      const { displayName, stageName, socialLinks, billingAddress } = req.body;

      const updateData: Record<string, any> = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (stageName !== undefined) updateData.stageName = stageName;
      if (socialLinks !== undefined) updateData.socialLinks = socialLinks;
      if (billingAddress !== undefined) updateData.billingAddress = billingAddress;

      if (Object.keys(updateData).length > 0) {
        await updateFirestoreUser(uid, updateData);
      }

      const firestoreUser = await getFirestoreUser(uid);
      const profile = await storage.getTalentProfileByUserId(uid);

      res.json({
        uid: firestoreUser?.uid,
        email: firestoreUser?.email,
        displayName: firestoreUser?.displayName,
        stageName: firestoreUser?.stageName || null,
        level: firestoreUser?.level,
        profileImageUrl: firestoreUser?.profileImageUrl || null,
        socialLinks: firestoreUser?.socialLinks || null,
        billingAddress: firestoreUser?.billingAddress || null,
        hasProfile: !!profile,
        profileRole: profile?.role || null,
      });
    } catch (error: any) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get("/api/vote-purchases", firebaseAuth, async (req, res) => {
    try {
      const { uid } = req.firebaseUser!;
      const purchases = await storage.getVotePurchasesByUser(uid);
      res.json(purchases);
    } catch (error: any) {
      console.error("Get vote purchases error:", error);
      res.status(500).json({ message: "Failed to get purchase history" });
    }
  });

  app.post("/api/vote-purchases", firebaseAuth, async (req, res) => {
    try {
      const { uid } = req.firebaseUser!;
      const { competitionId, contestantId, voteCount, amount } = req.body;

      if (!competitionId || !contestantId || !voteCount) {
        return res.status(400).json({ message: "competitionId, contestantId, and voteCount are required" });
      }

      const purchase = await storage.createVotePurchase({
        userId: uid,
        competitionId,
        contestantId,
        voteCount,
        amount: amount || 0,
      });

      for (let i = 0; i < voteCount; i++) {
        await storage.castVote({
          contestantId,
          competitionId,
          voterIp: null,
          userId: uid,
          purchaseId: purchase.id,
        });
      }

      res.status(201).json(purchase);
    } catch (error: any) {
      console.error("Vote purchase error:", error);
      res.status(500).json({ message: "Failed to process vote purchase" });
    }
  });

  return httpServer;
}
