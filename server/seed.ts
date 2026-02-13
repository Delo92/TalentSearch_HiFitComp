import { db } from "./db";
import { competitions, talentProfiles, contestants, votes, users } from "@shared/schema";
import { sql } from "drizzle-orm";

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
