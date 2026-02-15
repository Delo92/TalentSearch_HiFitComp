import { storage } from "./storage";
import {
  getFirebaseAuth,
  createFirebaseUser,
  setUserLevel,
  getFirestoreUser,
  createFirestoreUser,
  getFirebaseAdmin,
} from "./firebase-admin";
import {
  firestoreCategories,
  firestoreVotePackages,
  firestoreSettings,
  firestoreLivery,
  firestoreVotes,
} from "./firestore-collections";

export async function seedDatabase() {
  const comps = await storage.getCompetitions();
  if (comps.length > 0) return;

  const systemUid = "seed-system-user";
  let systemUser = await getFirestoreUser(systemUid);
  if (!systemUser) {
    systemUser = await createFirestoreUser({
      uid: systemUid,
      email: "system@hifitcomp.com",
      displayName: "System",
      level: 1,
    });
  }

  const profileData = [
    { userId: systemUid, displayName: "Marcus Steel", stageName: null, bio: "Professional bodybuilder and fitness model with over 10 years of competition experience. IFBB Pro League competitor.", category: "Bodybuilding", location: "Los Angeles, CA", imageUrls: ["/images/template/b1.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
    { userId: systemUid, displayName: "Aria Velvet", stageName: null, bio: "R&B vocalist and songwriter. Known for soulful performances and captivating stage presence. Two-time regional singing champion.", category: "Music", location: "Atlanta, GA", imageUrls: ["/images/template/a1.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
    { userId: systemUid, displayName: "Jade Monroe", stageName: null, bio: "International fashion model represented by Elite Models. Runway experience in Paris, Milan, and New York Fashion Week.", category: "Modeling", location: "New York, NY", imageUrls: ["/images/template/a2.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
    { userId: systemUid, displayName: "DJ Phoenix", stageName: null, bio: "Award-winning electronic music producer and DJ. Headlined festivals across the country with high-energy sets.", category: "Music", location: "Miami, FL", imageUrls: ["/images/template/a3.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
    { userId: systemUid, displayName: "Titan Brooks", stageName: null, bio: "Classic physique competitor. Natural athlete dedicated to the art of bodybuilding. Multiple state champion.", category: "Bodybuilding", location: "Houston, TX", imageUrls: ["/images/template/b2.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
    { userId: systemUid, displayName: "Luna Ray", stageName: null, bio: "Contemporary dancer and choreographer specializing in modern and hip-hop fusion. Viral performance artist.", category: "Dance", location: "Chicago, IL", imageUrls: ["/images/template/a4.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
    { userId: systemUid, displayName: "Crystal Vega", stageName: null, bio: "Swimwear and fitness model with a passion for wellness. Brand ambassador for major sportswear companies.", category: "Modeling", location: "San Diego, CA", imageUrls: ["/images/template/a5.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
    { userId: systemUid, displayName: "Rico Blaze", stageName: null, bio: "Hip-hop artist and battle rapper from the streets of Brooklyn. Raw talent with lyrical precision.", category: "Music", location: "Brooklyn, NY", imageUrls: ["/images/template/a6.jpg"], videoUrls: [], socialLinks: null, role: "talent" },
  ];

  const profiles = [];
  for (const p of profileData) {
    const profile = await storage.createTalentProfile(p);
    profiles.push(profile);
  }

  const compData = [
    {
      title: "Star Search 2026 - Music Edition",
      description: "The ultimate singing and music performance competition. Show the world your vocal talent and stage presence. Open to all genres including R&B, pop, hip-hop, rock, and more.",
      category: "Music",
      coverImage: "/images/template/bg-1.jpg",
      status: "active",
      voteCost: 0,
      maxVotesPerDay: 10,
      startDate: "2026-02-01T00:00:00.000Z",
      endDate: "2026-04-30T00:00:00.000Z",
      createdAt: new Date().toISOString(),
      createdBy: null,
    },
    {
      title: "Iron Physique Championship",
      description: "The premier bodybuilding competition showcasing the best physiques. Categories include Classic Physique, Men's Open, and Women's Fitness.",
      category: "Bodybuilding",
      coverImage: "/images/template/breadcumb3.jpg",
      status: "active",
      voteCost: 0,
      maxVotesPerDay: 5,
      startDate: "2026-02-15T00:00:00.000Z",
      endDate: "2026-05-15T00:00:00.000Z",
      createdAt: new Date().toISOString(),
      createdBy: null,
    },
    {
      title: "Top Model Search",
      description: "Are you the next top model? Show off your runway walk, photogenic qualities, and unique style in this nationwide modeling competition.",
      category: "Modeling",
      coverImage: "/images/template/breadcumb.jpg",
      status: "active",
      voteCost: 0,
      maxVotesPerDay: 10,
      startDate: "2026-03-01T00:00:00.000Z",
      endDate: "2026-06-01T00:00:00.000Z",
      createdAt: new Date().toISOString(),
      createdBy: null,
    },
    {
      title: "Dance Battle Royale",
      description: "Bring your best moves to the biggest dance competition of the year. All styles welcome: hip-hop, contemporary, breakdancing, and more.",
      category: "Dance",
      coverImage: "/images/template/breadcumb2.jpg",
      status: "voting",
      voteCost: 0,
      maxVotesPerDay: 15,
      startDate: "2026-01-15T00:00:00.000Z",
      endDate: "2026-03-30T00:00:00.000Z",
      createdAt: new Date().toISOString(),
      createdBy: null,
    },
  ];

  const compsCreated = [];
  for (const c of compData) {
    const comp = await storage.createCompetition(c);
    compsCreated.push(comp);
  }

  const contestantData = [
    { competitionId: compsCreated[0].id, talentProfileId: profiles[1].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[0].id, talentProfileId: profiles[3].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[0].id, talentProfileId: profiles[7].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[1].id, talentProfileId: profiles[0].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[1].id, talentProfileId: profiles[4].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[2].id, talentProfileId: profiles[2].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[2].id, talentProfileId: profiles[6].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[3].id, talentProfileId: profiles[5].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
    { competitionId: compsCreated[3].id, talentProfileId: profiles[1].id, applicationStatus: "approved", appliedAt: new Date().toISOString() },
  ];

  const createdContestants = [];
  for (const c of contestantData) {
    const contestant = await storage.createContestant(c);
    createdContestants.push(contestant);
  }

  const voteDistribution = [47, 32, 28, 65, 41, 53, 39, 72, 18];
  for (let i = 0; i < createdContestants.length; i++) {
    const c = createdContestants[i];
    const count = voteDistribution[i] || 10;
    await firestoreVotes.syncVoteCount(c.id, c.competitionId, count);
  }

  console.log("Database seeded successfully with sample data (all in Firestore)");
}

const LIVERY_DEFAULTS = [
  { imageKey: "logo", label: "Site Logo", defaultUrl: "/images/template/logo.png" },
  { imageKey: "hero_background", label: "Hero Background (Landing)", defaultUrl: "/images/template/bg-1.jpg" },
  { imageKey: "feature_background", label: "Feature Section Background (Landing)", defaultUrl: "/images/template/bg-2.jpg" },
  { imageKey: "cta_background", label: "Call to Action Background (Landing)", defaultUrl: "/images/template/breadcumb.jpg" },
  { imageKey: "breadcrumb_bg", label: "Page Header Background (Login, Join, Host, Checkout, Purchases)", defaultUrl: "/images/template/breadcumb.jpg" },
  { imageKey: "competitions_header", label: "Competitions Page Header", defaultUrl: "/images/template/breadcumb2.jpg" },
  { imageKey: "competition_detail_header", label: "Competition Detail Header", defaultUrl: "/images/template/breadcumb3.jpg" },
  { imageKey: "category_music", label: "Category Card - Music (Landing)", defaultUrl: "/images/template/a1.jpg" },
  { imageKey: "category_modeling", label: "Category Card - Modeling (Landing)", defaultUrl: "/images/template/a2.jpg" },
  { imageKey: "category_bodybuilding", label: "Category Card - Bodybuilding (Landing)", defaultUrl: "/images/template/b1.jpg" },
  { imageKey: "category_dance", label: "Category Card - Dance (Landing)", defaultUrl: "/images/template/a4.jpg" },
  { imageKey: "competition_card_fallback", label: "Default Competition Card Image", defaultUrl: "/images/template/e1.jpg" },
  { imageKey: "talent_profile_fallback", label: "Default Talent Profile Image", defaultUrl: "/images/template/a1.jpg" },
  { imageKey: "hero_summary", label: "Hero Summary / Instructions", defaultUrl: "", itemType: "text" as const, defaultText: "Welcome to HiFitComp — the ultimate talent competition platform. Browse competitions, vote for your favorites, join as a competitor, or host your own event. Get started today!" },
  { imageKey: "about_rules_text", label: "About Page - Rules & Guidelines", defaultUrl: "", itemType: "text" as const, defaultText: "Welcome to HiFitComp! Our platform connects talent with audiences through fair, transparent competitions.\n\n**Rules & Guidelines:**\n\n1. All participants must be 18 years or older.\n2. Each competitor may only enter a competition once.\n3. Voting is limited per IP address daily to ensure fairness.\n4. Content must be original and appropriate for all audiences.\n5. Hosts are responsible for managing their events and enforcing rules.\n6. Vote purchases are non-refundable once processed.\n7. HiFitComp reserves the right to remove content that violates community standards." },
  { imageKey: "social_facebook", label: "Social - Facebook URL", defaultUrl: "", itemType: "text" as const, defaultText: "" },
  { imageKey: "social_instagram", label: "Social - Instagram URL", defaultUrl: "", itemType: "text" as const, defaultText: "" },
  { imageKey: "social_twitter", label: "Social - X / Twitter URL", defaultUrl: "", itemType: "text" as const, defaultText: "" },
  { imageKey: "social_youtube", label: "Social - YouTube URL", defaultUrl: "", itemType: "text" as const, defaultText: "" },
  { imageKey: "social_tiktok", label: "Social - TikTok URL", defaultUrl: "", itemType: "text" as const, defaultText: "" },
  { imageKey: "contact_email", label: "Contact Email", defaultUrl: "", itemType: "text" as const, defaultText: "admin@hifitcomp.com" },
  { imageKey: "contact_phone", label: "Contact Phone", defaultUrl: "", itemType: "text" as const, defaultText: "" },
  { imageKey: "contact_address", label: "Contact Address", defaultUrl: "", itemType: "text" as const, defaultText: "" },
];

export async function seedLivery() {
  const existing = await firestoreLivery.getAll();
  const existingKeys = new Set(existing.map((l) => l.imageKey));

  const validKeys = new Set(LIVERY_DEFAULTS.map((l) => l.imageKey));

  for (const item of LIVERY_DEFAULTS) {
    if (!existingKeys.has(item.imageKey)) {
      await firestoreLivery.upsert({ ...item, imageUrl: null });
    }
  }

  for (const item of existing) {
    if (!validKeys.has(item.imageKey)) {
      await firestoreLivery.delete(item.imageKey);
    }
  }
  console.log(`Livery seeded: ${LIVERY_DEFAULTS.length} slots configured (Firestore)`);
}

const DEFAULT_CATEGORIES = [
  { name: "Music", description: "Singing, rapping, DJing, and all musical performances", imageUrl: "/images/template/a1.jpg", order: 1, isActive: true },
  { name: "Modeling", description: "Fashion, runway, commercial, and fitness modeling", imageUrl: "/images/template/a2.jpg", order: 2, isActive: true },
  { name: "Bodybuilding", description: "Classic physique, men's open, women's fitness, and athletic physique", imageUrl: "/images/template/b1.jpg", order: 3, isActive: true },
  { name: "Dance", description: "Hip-hop, contemporary, breakdancing, ballroom, and all dance styles", imageUrl: "/images/template/a4.jpg", order: 4, isActive: true },
  { name: "Comedy", description: "Stand-up, sketch, improv, and comedic performances", imageUrl: "/images/template/e1.jpg", order: 5, isActive: true },
  { name: "Acting", description: "Dramatic, comedic, and theatrical acting performances", imageUrl: "/images/template/e2.jpg", order: 6, isActive: true },
];

export async function seedCategories() {
  const existing = await firestoreCategories.getAll();
  if (existing.length > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    await firestoreCategories.create(cat);
  }
  console.log(`Categories seeded: ${DEFAULT_CATEGORIES.length} categories (Firestore)`);
}

const DEFAULT_VOTE_PACKAGES = [
  { name: "Starter Pack", description: "500 votes to support your favorite", voteCount: 500, bonusVotes: 0, price: 1000, isActive: true, order: 1 },
  { name: "Fan Pack", description: "1,000 votes + 300 bonus votes", voteCount: 1000, bonusVotes: 300, price: 1500, isActive: true, order: 2 },
  { name: "Super Fan Pack", description: "2,000 votes + 600 bonus votes", voteCount: 2000, bonusVotes: 600, price: 3000, isActive: true, order: 3 },
];

export async function seedVotePackages() {
  const existing = await firestoreVotePackages.getAll();
  if (existing.length > 0) return;

  for (const pkg of DEFAULT_VOTE_PACKAGES) {
    await firestoreVotePackages.create(pkg);
  }
  console.log(`Vote packages seeded: ${DEFAULT_VOTE_PACKAGES.length} packages (Firestore)`);
}

export async function seedSettings() {
  const existing = await firestoreSettings.get();
  if (existing) return;

  await firestoreSettings.update({
    siteName: "HiFitComp",
    siteDescription: "Talent Competition & Voting Platform",
    contactEmail: "admin@hifitcomp.com",
    defaultVoteCost: 0,
    defaultMaxVotesPerDay: 10,
  });
  console.log("Settings seeded (Firestore)");
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
    email: "host@test.com",
    password: "TestPass123",
    displayName: "Test Host",
    level: 3,
    role: "host" as const,
  },
  {
    email: "admin@test.com",
    password: "TestPass123",
    displayName: "Test Admin",
    level: 4,
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

      if (account.level >= 2) {
        const existingProfile = await storage.getTalentProfileByUserId(firebaseUser.uid);
        if (!existingProfile) {
          await storage.createTalentProfile({
            userId: firebaseUser.uid,
            displayName: account.displayName,
            stageName: "stageName" in account ? account.stageName || null : null,
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
