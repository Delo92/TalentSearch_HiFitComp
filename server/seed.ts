import { db } from "./db";
import { competitions, talentProfiles, contestants, votes, users, siteLivery } from "@shared/schema";
import { sql } from "drizzle-orm";
import { storage } from "./storage";
import {
  getFirebaseAuth,
  createFirebaseUser,
  setUserLevel,
  getFirestoreUser,
  createFirestoreUser,
  getFirebaseAdmin,
} from "./firebase-admin";

export async function seedDatabase() {
  const existingComps = await db.select().from(competitions);
  if (existingComps.length > 0) return;

  const seedUserId = "seed-system-user";
  const existingUsers = await db.select().from(users);
  let systemUser = existingUsers.find((u) => u.id === seedUserId);
  if (!systemUser) {
    [systemUser] = await db.insert(users).values({
      id: seedUserId,
      email: "system@starvote.com",
      firstName: "System",
      lastName: "Admin",
    }).returning();
  }

  const profileData = [
    { userId: seedUserId, displayName: "Marcus Steel", bio: "Professional bodybuilder and fitness model with over 10 years of competition experience. IFBB Pro League competitor.", category: "Bodybuilding", location: "Los Angeles, CA", imageUrls: ["/images/template/b1.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
    { userId: seedUserId, displayName: "Aria Velvet", bio: "R&B vocalist and songwriter. Known for soulful performances and captivating stage presence. Two-time regional singing champion.", category: "Music", location: "Atlanta, GA", imageUrls: ["/images/template/a1.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
    { userId: seedUserId, displayName: "Jade Monroe", bio: "International fashion model represented by Elite Models. Runway experience in Paris, Milan, and New York Fashion Week.", category: "Modeling", location: "New York, NY", imageUrls: ["/images/template/a2.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
    { userId: seedUserId, displayName: "DJ Phoenix", bio: "Award-winning electronic music producer and DJ. Headlined festivals across the country with high-energy sets.", category: "Music", location: "Miami, FL", imageUrls: ["/images/template/a3.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
    { userId: seedUserId, displayName: "Titan Brooks", bio: "Classic physique competitor. Natural athlete dedicated to the art of bodybuilding. Multiple state champion.", category: "Bodybuilding", location: "Houston, TX", imageUrls: ["/images/template/b2.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
    { userId: seedUserId, displayName: "Luna Ray", bio: "Contemporary dancer and choreographer specializing in modern and hip-hop fusion. Viral performance artist.", category: "Dance", location: "Chicago, IL", imageUrls: ["/images/template/a4.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
    { userId: seedUserId, displayName: "Crystal Vega", bio: "Swimwear and fitness model with a passion for wellness. Brand ambassador for major sportswear companies.", category: "Modeling", location: "San Diego, CA", imageUrls: ["/images/template/a5.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
    { userId: seedUserId, displayName: "Rico Blaze", bio: "Hip-hop artist and battle rapper from the streets of Brooklyn. Raw talent with lyrical precision.", category: "Music", location: "Brooklyn, NY", imageUrls: ["/images/template/a6.jpg"], videoUrls: [], socialLinks: null, role: "talent" as const },
  ];

  const profiles = await db.insert(talentProfiles).values(profileData).returning();

  const compData = [
    {
      title: "Star Search 2026 - Music Edition",
      description: "The ultimate singing and music performance competition. Show the world your vocal talent and stage presence. Open to all genres including R&B, pop, hip-hop, rock, and more.",
      category: "Music",
      coverImage: "/images/template/bg-1.jpg",
      status: "active" as const,
      voteCost: 0,
      maxVotesPerDay: 10,
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-04-30"),
    },
    {
      title: "Iron Physique Championship",
      description: "The premier bodybuilding competition showcasing the best physiques. Categories include Classic Physique, Men's Open, and Women's Fitness.",
      category: "Bodybuilding",
      coverImage: "/images/template/breadcumb3.jpg",
      status: "active" as const,
      voteCost: 0,
      maxVotesPerDay: 5,
      startDate: new Date("2026-02-15"),
      endDate: new Date("2026-05-15"),
    },
    {
      title: "Top Model Search",
      description: "Are you the next top model? Show off your runway walk, photogenic qualities, and unique style in this nationwide modeling competition.",
      category: "Modeling",
      coverImage: "/images/template/breadcumb.jpg",
      status: "active" as const,
      voteCost: 0,
      maxVotesPerDay: 10,
      startDate: new Date("2026-03-01"),
      endDate: new Date("2026-06-01"),
    },
    {
      title: "Dance Battle Royale",
      description: "Bring your best moves to the biggest dance competition of the year. All styles welcome: hip-hop, contemporary, breakdancing, and more.",
      category: "Dance",
      coverImage: "/images/template/breadcumb2.jpg",
      status: "voting" as const,
      voteCost: 0,
      maxVotesPerDay: 15,
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-03-30"),
    },
  ];

  const comps = await db.insert(competitions).values(compData).returning();

  const contestantData = [
    { competitionId: comps[0].id, talentProfileId: profiles[1].id, applicationStatus: "approved" as const },
    { competitionId: comps[0].id, talentProfileId: profiles[3].id, applicationStatus: "approved" as const },
    { competitionId: comps[0].id, talentProfileId: profiles[7].id, applicationStatus: "approved" as const },
    { competitionId: comps[1].id, talentProfileId: profiles[0].id, applicationStatus: "approved" as const },
    { competitionId: comps[1].id, talentProfileId: profiles[4].id, applicationStatus: "approved" as const },
    { competitionId: comps[2].id, talentProfileId: profiles[2].id, applicationStatus: "approved" as const },
    { competitionId: comps[2].id, talentProfileId: profiles[6].id, applicationStatus: "approved" as const },
    { competitionId: comps[3].id, talentProfileId: profiles[5].id, applicationStatus: "approved" as const },
    { competitionId: comps[3].id, talentProfileId: profiles[1].id, applicationStatus: "approved" as const },
  ];

  const createdContestants = await db.insert(contestants).values(contestantData).returning();

  const voteData: { contestantId: number; competitionId: number; voterIp: string }[] = [];
  const voteDistribution = [47, 32, 28, 65, 41, 53, 39, 72, 18];
  createdContestants.forEach((c, i) => {
    const count = voteDistribution[i] || 10;
    for (let v = 0; v < count; v++) {
      voteData.push({
        contestantId: c.id,
        competitionId: c.competitionId,
        voterIp: `seed-${v}-${i}`,
      });
    }
  });

  if (voteData.length > 0) {
    await db.insert(votes).values(voteData);
  }

  console.log("Database seeded successfully with sample data");
}

const LIVERY_DEFAULTS = [
  { imageKey: "logo", label: "Site Logo", defaultUrl: "/images/template/logo.png" },
  { imageKey: "hero_background", label: "Hero Background", defaultUrl: "/images/template/bg-1.jpg" },
  { imageKey: "feature_background", label: "Feature Section Background", defaultUrl: "/images/template/bg-2.jpg" },
  { imageKey: "cta_background", label: "Call to Action Background", defaultUrl: "/images/template/breadcumb.jpg" },
  { imageKey: "competitions_header", label: "Competitions Page Header", defaultUrl: "/images/template/breadcumb2.jpg" },
  { imageKey: "competition_detail_header", label: "Competition Detail Header", defaultUrl: "/images/template/breadcumb3.jpg" },
  { imageKey: "category_music", label: "Category Card - Music", defaultUrl: "/images/template/a1.jpg" },
  { imageKey: "category_modeling", label: "Category Card - Modeling", defaultUrl: "/images/template/a2.jpg" },
  { imageKey: "category_bodybuilding", label: "Category Card - Bodybuilding", defaultUrl: "/images/template/b1.jpg" },
  { imageKey: "category_dance", label: "Category Card - Dance", defaultUrl: "/images/template/a4.jpg" },
  { imageKey: "competition_card_fallback", label: "Competition Card Fallback", defaultUrl: "/images/template/e1.jpg" },
  { imageKey: "talent_profile_fallback", label: "Talent Profile Fallback", defaultUrl: "/images/template/a1.jpg" },
  { imageKey: "bg_3", label: "Background Image 3", defaultUrl: "/images/template/bg-3.jpg" },
  { imageKey: "bg_4", label: "Background Image 4", defaultUrl: "/images/template/bg-4.jpg" },
  { imageKey: "artist_a3", label: "Artist Image - A3", defaultUrl: "/images/template/a3.jpg" },
  { imageKey: "artist_a5", label: "Artist Image - A5", defaultUrl: "/images/template/a5.jpg" },
  { imageKey: "artist_a6", label: "Artist Image - A6", defaultUrl: "/images/template/a6.jpg" },
  { imageKey: "artist_a7", label: "Artist Image - A7", defaultUrl: "/images/template/a7.jpg" },
  { imageKey: "artist_a8", label: "Artist Image - A8", defaultUrl: "/images/template/a8.jpg" },
  { imageKey: "artist_a9", label: "Artist Image - A9", defaultUrl: "/images/template/a9.jpg" },
  { imageKey: "artist_a10", label: "Artist Image - A10", defaultUrl: "/images/template/a10.jpg" },
  { imageKey: "artist_a11", label: "Artist Image - A11", defaultUrl: "/images/template/a11.jpg" },
  { imageKey: "artist_a12", label: "Artist Image - A12", defaultUrl: "/images/template/a12.jpg" },
  { imageKey: "bodybuilder_b2", label: "Bodybuilder Image - B2", defaultUrl: "/images/template/b2.jpg" },
  { imageKey: "bodybuilder_b3", label: "Bodybuilder Image - B3", defaultUrl: "/images/template/b3.jpg" },
  { imageKey: "bodybuilder_b4", label: "Bodybuilder Image - B4", defaultUrl: "/images/template/b4.jpg" },
  { imageKey: "event_e1", label: "Event Image - E1", defaultUrl: "/images/template/e1.jpg" },
  { imageKey: "event_e2", label: "Event Image - E2", defaultUrl: "/images/template/e2.jpg" },
  { imageKey: "event_e3", label: "Event Image - E3", defaultUrl: "/images/template/e3.jpg" },
  { imageKey: "event_e4", label: "Event Image - E4", defaultUrl: "/images/template/e4.jpg" },
  { imageKey: "event_e5", label: "Event Image - E5", defaultUrl: "/images/template/e5.jpg" },
  { imageKey: "event_e6", label: "Event Image - E6", defaultUrl: "/images/template/e6.jpg" },
  { imageKey: "featured_artist", label: "Featured Artist", defaultUrl: "/images/template/fa.jpg" },
  { imageKey: "promo_pa1", label: "Promo Image - PA1", defaultUrl: "/images/template/pa1.jpg" },
  { imageKey: "promo_pa2", label: "Promo Image - PA2", defaultUrl: "/images/template/pa2.jpg" },
  { imageKey: "promo_pa3", label: "Promo Image - PA3", defaultUrl: "/images/template/pa3.jpg" },
  { imageKey: "promo_pa4", label: "Promo Image - PA4", defaultUrl: "/images/template/pa4.jpg" },
  { imageKey: "promo_pa5", label: "Promo Image - PA5", defaultUrl: "/images/template/pa5.jpg" },
];

export async function seedLivery() {
  const existing = await storage.getAllLivery();
  const existingKeys = new Set(existing.map((l) => l.imageKey));

  for (const item of LIVERY_DEFAULTS) {
    if (!existingKeys.has(item.imageKey)) {
      await storage.upsertLivery({ ...item, imageUrl: null });
    }
  }
  console.log(`Livery seeded: ${LIVERY_DEFAULTS.length} slots configured`);
}

const TEST_ACCOUNTS = [
  {
    email: "viewer@test.com",
    password: "TestPass123",
    displayName: "Test Viewer",
    level: 1,
    role: "viewer" as const,
  },
  {
    email: "talent@test.com",
    password: "TestPass123",
    displayName: "Test Talent",
    stageName: "The Star",
    level: 2,
    role: "talent" as const,
    socialLinks: {
      instagram: "https://instagram.com/testtalent",
      twitter: "https://twitter.com/testtalent",
      tiktok: "https://tiktok.com/@testtalent",
    },
  },
  {
    email: "admin@test.com",
    password: "TestPass123",
    displayName: "Test Admin",
    level: 3,
    role: "admin" as const,
  },
];

export async function seedTestAccounts() {
  try {
    getFirebaseAdmin();
  } catch {
    console.log("Firebase not configured, skipping test account seeding");
    return;
  }

  const auth = getFirebaseAuth();

  for (const account of TEST_ACCOUNTS) {
    try {
      let firebaseUser;
      try {
        firebaseUser = await auth.getUserByEmail(account.email);
        console.log(`Test account ${account.email} already exists (uid: ${firebaseUser.uid})`);
      } catch (err: any) {
        if (err.code === "auth/user-not-found") {
          firebaseUser = await createFirebaseUser(account.email, account.password, account.displayName);
          console.log(`Created test account: ${account.email} (uid: ${firebaseUser.uid})`);
        } else {
          throw err;
        }
      }

      await setUserLevel(firebaseUser.uid, account.level);

      let firestoreUser = await getFirestoreUser(firebaseUser.uid);
      if (!firestoreUser) {
        const firestoreData: any = {
          uid: firebaseUser.uid,
          email: account.email,
          displayName: account.displayName,
          level: account.level,
        };
        if ("stageName" in account) firestoreData.stageName = account.stageName;
        if ("socialLinks" in account) firestoreData.socialLinks = account.socialLinks;
        await createFirestoreUser(firestoreData);
      }

      let dbUser = await storage.getUser(firebaseUser.uid);
      if (!dbUser) {
        await storage.createUser({
          id: firebaseUser.uid,
          email: account.email,
          firstName: account.displayName,
          lastName: null,
          profileImageUrl: null,
          level: account.level,
        });
      }

      if (account.level >= 2) {
        const existingProfile = await storage.getTalentProfileByUserId(firebaseUser.uid);
        if (!existingProfile) {
          await storage.createTalentProfile({
            userId: firebaseUser.uid,
            displayName: account.displayName,
            stageName: "stageName" in account ? account.stageName : null,
            bio: account.level === 3 ? "Platform administrator" : "Test talent profile",
            category: account.level === 2 ? "Music" : null,
            location: null,
            imageUrls: [],
            videoUrls: [],
            socialLinks: "socialLinks" in account ? JSON.stringify(account.socialLinks) : null,
            role: account.role,
          });
        }
      }

      console.log(`Test account ${account.email} seeded at level ${account.level} (${account.role})`);
    } catch (error: any) {
      console.error(`Failed to seed test account ${account.email}:`, error.message);
    }
  }
}
