import {
  type User, type InsertUser, type UpsertUser,
  talentProfiles, type TalentProfile, type InsertTalentProfile,
  competitions, type Competition, type InsertCompetition,
  contestants, type Contestant, type InsertContestant,
  votes, type Vote, type InsertVote,
  votePurchases, type VotePurchase, type InsertVotePurchase,
  siteLivery, type SiteLivery, type InsertSiteLivery,
  users,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getTalentProfile(id: number): Promise<TalentProfile | undefined>;
  getTalentProfileByUserId(userId: string): Promise<TalentProfile | undefined>;
  createTalentProfile(profile: InsertTalentProfile): Promise<TalentProfile>;
  updateTalentProfile(userId: string, data: Partial<InsertTalentProfile>): Promise<TalentProfile | undefined>;
  getAllTalentProfiles(): Promise<TalentProfile[]>;

  getCompetitions(): Promise<Competition[]>;
  getCompetition(id: number): Promise<Competition | undefined>;
  createCompetition(comp: InsertCompetition): Promise<Competition>;
  updateCompetition(id: number, data: Partial<InsertCompetition>): Promise<Competition | undefined>;
  deleteCompetition(id: number): Promise<void>;

  getContestantsByCompetition(competitionId: number): Promise<(Contestant & { talentProfile: TalentProfile; voteCount: number })[]>;
  getContestantsByTalent(talentProfileId: number): Promise<(Contestant & { competitionTitle: string })[]>;
  createContestant(contestant: InsertContestant): Promise<Contestant>;
  updateContestantStatus(id: number, status: "pending" | "approved" | "rejected"): Promise<Contestant | undefined>;
  getContestant(competitionId: number, talentProfileId: number): Promise<Contestant | undefined>;
  getAllContestants(): Promise<(Contestant & { talentProfile: TalentProfile; competitionTitle: string })[]>;

  getAdminProfiles(): Promise<TalentProfile[]>;

  castVote(vote: InsertVote): Promise<Vote>;
  getVoteCount(contestantId: number): Promise<number>;
  getTotalVotesByCompetition(competitionId: number): Promise<number>;
  getVotesTodayByIp(competitionId: number, voterIp: string): Promise<number>;

  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  createVotePurchase(purchase: InsertVotePurchase): Promise<VotePurchase>;
  getVotePurchasesByUser(userId: string): Promise<VotePurchase[]>;

  getAllLivery(): Promise<SiteLivery[]>;
  getLiveryByKey(imageKey: string): Promise<SiteLivery | undefined>;
  upsertLivery(item: InsertSiteLivery): Promise<SiteLivery>;
  updateLiveryImage(imageKey: string, imageUrl: string | null): Promise<SiteLivery | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getTalentProfile(id: number): Promise<TalentProfile | undefined> {
    const [profile] = await db.select().from(talentProfiles).where(eq(talentProfiles.id, id));
    return profile || undefined;
  }

  async getTalentProfileByUserId(userId: string): Promise<TalentProfile | undefined> {
    const [profile] = await db.select().from(talentProfiles).where(eq(talentProfiles.userId, userId));
    return profile || undefined;
  }

  async createTalentProfile(profile: InsertTalentProfile): Promise<TalentProfile> {
    const [created] = await db.insert(talentProfiles).values(profile).returning();
    return created;
  }

  async updateTalentProfile(userId: string, data: Partial<InsertTalentProfile>): Promise<TalentProfile | undefined> {
    const [updated] = await db.update(talentProfiles).set(data).where(eq(talentProfiles.userId, userId)).returning();
    return updated || undefined;
  }

  async getAllTalentProfiles(): Promise<TalentProfile[]> {
    return db.select().from(talentProfiles);
  }

  async getCompetitions(): Promise<Competition[]> {
    return db.select().from(competitions).orderBy(desc(competitions.createdAt));
  }

  async getCompetition(id: number): Promise<Competition | undefined> {
    const [comp] = await db.select().from(competitions).where(eq(competitions.id, id));
    return comp || undefined;
  }

  async createCompetition(comp: InsertCompetition): Promise<Competition> {
    const [created] = await db.insert(competitions).values(comp).returning();
    return created;
  }

  async updateCompetition(id: number, data: Partial<InsertCompetition>): Promise<Competition | undefined> {
    const [updated] = await db.update(competitions).set(data).where(eq(competitions.id, id)).returning();
    return updated || undefined;
  }

  async deleteCompetition(id: number): Promise<void> {
    await db.delete(votes).where(eq(votes.competitionId, id));
    await db.delete(contestants).where(eq(contestants.competitionId, id));
    await db.delete(competitions).where(eq(competitions.id, id));
  }

  async getContestantsByCompetition(competitionId: number): Promise<(Contestant & { talentProfile: TalentProfile; voteCount: number })[]> {
    const rows = await db
      .select({
        contestant: contestants,
        talentProfile: talentProfiles,
        voteCount: sql<number>`COALESCE((SELECT COUNT(*) FROM votes WHERE votes.contestant_id = ${contestants.id})::int, 0)`,
      })
      .from(contestants)
      .innerJoin(talentProfiles, eq(contestants.talentProfileId, talentProfiles.id))
      .where(and(eq(contestants.competitionId, competitionId), eq(contestants.applicationStatus, "approved")));

    return rows.map((r) => ({
      ...r.contestant,
      talentProfile: r.talentProfile,
      voteCount: r.voteCount,
    }));
  }

  async getContestantsByTalent(talentProfileId: number): Promise<(Contestant & { competitionTitle: string })[]> {
    const rows = await db
      .select({
        contestant: contestants,
        competitionTitle: competitions.title,
      })
      .from(contestants)
      .innerJoin(competitions, eq(contestants.competitionId, competitions.id))
      .where(eq(contestants.talentProfileId, talentProfileId));

    return rows.map((r) => ({
      ...r.contestant,
      competitionTitle: r.competitionTitle,
    }));
  }

  async createContestant(contestant: InsertContestant): Promise<Contestant> {
    const [created] = await db.insert(contestants).values(contestant).returning();
    return created;
  }

  async updateContestantStatus(id: number, status: "pending" | "approved" | "rejected"): Promise<Contestant | undefined> {
    const [updated] = await db.update(contestants).set({ applicationStatus: status }).where(eq(contestants.id, id)).returning();
    return updated || undefined;
  }

  async getContestant(competitionId: number, talentProfileId: number): Promise<Contestant | undefined> {
    const [row] = await db.select().from(contestants).where(
      and(eq(contestants.competitionId, competitionId), eq(contestants.talentProfileId, talentProfileId))
    );
    return row || undefined;
  }

  async getAdminProfiles(): Promise<TalentProfile[]> {
    return db.select().from(talentProfiles).where(eq(talentProfiles.role, "admin"));
  }

  async getAllContestants(): Promise<(Contestant & { talentProfile: TalentProfile; competitionTitle: string })[]> {
    const rows = await db
      .select({
        contestant: contestants,
        talentProfile: talentProfiles,
        competitionTitle: competitions.title,
      })
      .from(contestants)
      .innerJoin(talentProfiles, eq(contestants.talentProfileId, talentProfiles.id))
      .innerJoin(competitions, eq(contestants.competitionId, competitions.id));

    return rows.map((r) => ({
      ...r.contestant,
      talentProfile: r.talentProfile,
      competitionTitle: r.competitionTitle,
    }));
  }

  async castVote(vote: InsertVote): Promise<Vote> {
    const [created] = await db.insert(votes).values(vote).returning();
    return created;
  }

  async getVoteCount(contestantId: number): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(votes).where(eq(votes.contestantId, contestantId));
    return row?.count || 0;
  }

  async getTotalVotesByCompetition(competitionId: number): Promise<number> {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(votes).where(eq(votes.competitionId, competitionId));
    return row?.count || 0;
  }

  async getVotesTodayByIp(competitionId: number, voterIp: string): Promise<number> {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(votes)
      .where(
        and(
          eq(votes.competitionId, competitionId),
          eq(votes.voterIp, voterIp),
          sql`${votes.votedAt} >= CURRENT_DATE`
        )
      );
    return row?.count || 0;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated || undefined;
  }

  async createVotePurchase(purchase: InsertVotePurchase): Promise<VotePurchase> {
    const [created] = await db.insert(votePurchases).values(purchase).returning();
    return created;
  }

  async getVotePurchasesByUser(userId: string): Promise<VotePurchase[]> {
    return db.select().from(votePurchases).where(eq(votePurchases.userId, userId)).orderBy(desc(votePurchases.purchasedAt));
  }

  async getAllLivery(): Promise<SiteLivery[]> {
    return db.select().from(siteLivery).orderBy(siteLivery.label);
  }

  async getLiveryByKey(imageKey: string): Promise<SiteLivery | undefined> {
    const [row] = await db.select().from(siteLivery).where(eq(siteLivery.imageKey, imageKey));
    return row || undefined;
  }

  async upsertLivery(item: InsertSiteLivery): Promise<SiteLivery> {
    const existing = await this.getLiveryByKey(item.imageKey);
    if (existing) {
      const [updated] = await db.update(siteLivery).set(item).where(eq(siteLivery.imageKey, item.imageKey)).returning();
      return updated;
    }
    const [created] = await db.insert(siteLivery).values(item).returning();
    return created;
  }

  async updateLiveryImage(imageKey: string, imageUrl: string | null): Promise<SiteLivery | undefined> {
    const [updated] = await db.update(siteLivery).set({ imageUrl }).where(eq(siteLivery.imageKey, imageKey)).returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
