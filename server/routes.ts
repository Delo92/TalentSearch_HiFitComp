import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { firebaseAuth, requireAdmin, requireTalent } from "./auth-middleware";
import {
  verifyFirebaseToken,
  createFirebaseUser,
  setUserLevel,
  getFirestoreUser,
  createFirestoreUser,
  updateFirestoreUser,
  getFirebaseAuth,
} from "./firebase-admin";
import {
  uploadImageToDrive,
  listTalentImages,
  getFileStream,
  deleteFile,
  getDriveImageUrl,
  getDriveThumbnailUrl,
} from "./google-drive";
import {
  listTalentVideos,
  createUploadTicket,
  deleteVideo,
  getVideoThumbnail,
} from "./vimeo";
import { insertCompetitionSchema, insertTalentProfileSchema } from "@shared/schema";
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
      const { email, password, displayName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const firebaseUser = await createFirebaseUser(email, password, displayName);
      await setUserLevel(firebaseUser.uid, 2);

      await createFirestoreUser({
        uid: firebaseUser.uid,
        email,
        displayName: displayName || email.split("@")[0],
        level: 2,
      });

      let dbUser = await storage.getUser(firebaseUser.uid);
      if (!dbUser) {
        dbUser = await storage.createUser({
          id: firebaseUser.uid,
          email,
          firstName: displayName || email.split("@")[0],
          lastName: null,
          profileImageUrl: null,
        });
      }

      res.status(201).json({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        level: 2,
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
          level: 2,
        });
      }

      let dbUser = await storage.getUser(uid);
      if (!dbUser) {
        dbUser = await storage.createUser({
          id: uid,
          email,
          firstName: firestoreUser.displayName || email.split("@")[0],
          lastName: null,
          profileImageUrl: firestoreUser.profileImageUrl || null,
        });
      }

      res.json({
        uid,
        email: firestoreUser.email,
        displayName: firestoreUser.displayName,
        level: firestoreUser.level,
        profileImageUrl: firestoreUser.profileImageUrl || null,
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
        level: firestoreUser.level,
        profileImageUrl: firestoreUser.profileImageUrl || null,
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
        if (!firestoreUser || firestoreUser.level < 3) {
          return res.status(403).json({ message: "Admin already exists. Contact existing admin." });
        }
      }

      await setUserLevel(uid, 3);
      await updateFirestoreUser(uid, { level: 3 });

      let profile = await storage.getTalentProfileByUserId(uid);
      if (profile) {
        profile = await storage.updateTalentProfile(uid, { role: "admin" }) || profile;
      } else {
        const firestoreUser = await getFirestoreUser(uid);
        profile = await storage.createTalentProfile({
          userId: uid,
          displayName: firestoreUser?.displayName || "Admin",
          bio: "Platform administrator",
          category: null,
          location: null,
          imageUrls: [],
          videoUrls: [],
          socialLinks: null,
          role: "admin",
        });
      }

      res.json({ message: "Admin access granted", level: 3, profile });
    } catch (error: any) {
      console.error("Set admin error:", error);
      res.status(500).json({ message: "Failed to set admin" });
    }
  });


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

  app.post("/api/competitions", firebaseAuth, requireAdmin, async (req, res) => {
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
    res.json(updated);
  });

  app.get("/api/admin/stats", firebaseAuth, requireAdmin, async (_req, res) => {
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

  app.get("/api/admin/users", firebaseAuth, requireAdmin, async (_req, res) => {
    try {
      const profiles = await storage.getAllTalentProfiles();
      res.json(profiles);
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to get users" });
    }
  });

  app.patch("/api/admin/users/:uid/level", firebaseAuth, requireAdmin, async (req, res) => {
    try {
      const { uid } = req.params;
      const { level } = req.body;
      if (![1, 2, 3].includes(level)) {
        return res.status(400).json({ message: "Level must be 1, 2, or 3" });
      }

      await setUserLevel(uid, level);
      await updateFirestoreUser(uid, { level });

      const roleMap: Record<number, string> = { 1: "public", 2: "talent", 3: "admin" };
      await storage.updateTalentProfile(uid, { role: roleMap[level] as any });

      res.json({ message: "User level updated", uid, level });
    } catch (error: any) {
      console.error("Update user level error:", error);
      res.status(500).json({ message: "Failed to update user level" });
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
    if (req.file) {
      imageUrl = `/uploads/livery/${req.file.filename}`;
    } else if (req.body.imageUrl !== undefined) {
      imageUrl = req.body.imageUrl || null;
    }

    const updated = await storage.updateLiveryImage(imageKey, imageUrl);
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

      const talentName = profile.displayName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const result = await uploadImageToDrive(
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

      const talentName = profile.displayName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const images = await listTalentImages(talentName);
      res.json(images.map(img => ({
        ...img,
        imageUrl: getDriveImageUrl(img.id),
        thumbnailUrl: getDriveThumbnailUrl(img.id),
      })));
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

      const talentName = profile.displayName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const videos = await listTalentVideos(talentName);
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

      const { fileName, fileSize } = req.body;
      if (!fileName || !fileSize) {
        return res.status(400).json({ message: "fileName and fileSize are required" });
      }

      const talentName = profile.displayName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const ticket = await createUploadTicket(talentName, fileName, fileSize);

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

  return httpServer;
}
