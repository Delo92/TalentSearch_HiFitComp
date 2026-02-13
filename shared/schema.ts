import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, serial, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";
import { users } from "./models/auth";

export const userRoleEnum = pgEnum("user_role", ["public", "talent", "admin"]);
export const competitionStatusEnum = pgEnum("competition_status", ["draft", "active", "voting", "completed"]);
export const applicationStatusEnum = pgEnum("application_status", ["pending", "approved", "rejected"]);

export const talentProfiles = pgTable("talent_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  category: text("category"),
  location: text("location"),
  imageUrls: text("image_urls").array().default(sql`'{}'::text[]`),
  videoUrls: text("video_urls").array().default(sql`'{}'::text[]`),
  socialLinks: text("social_links"),
  role: userRoleEnum("role").notNull().default("talent"),
});

export const competitions = pgTable("competitions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  coverImage: text("cover_image"),
  status: competitionStatusEnum("status").notNull().default("draft"),
  voteCost: integer("vote_cost").notNull().default(0),
  maxVotesPerDay: integer("max_votes_per_day").notNull().default(10),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contestants = pgTable("contestants", {
  id: serial("id").primaryKey(),
  competitionId: integer("competition_id").notNull().references(() => competitions.id),
  talentProfileId: integer("talent_profile_id").notNull().references(() => talentProfiles.id),
  applicationStatus: applicationStatusEnum("application_status").notNull().default("pending"),
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  contestantId: integer("contestant_id").notNull().references(() => contestants.id),
  competitionId: integer("competition_id").notNull().references(() => competitions.id),
  voterIp: text("voter_ip"),
  votedAt: timestamp("voted_at").defaultNow(),
});

export const talentProfilesRelations = relations(talentProfiles, ({ one, many }) => ({
  user: one(users, { fields: [talentProfiles.userId], references: [users.id] }),
  contestants: many(contestants),
}));

export const competitionsRelations = relations(competitions, ({ many }) => ({
  contestants: many(contestants),
  votes: many(votes),
}));

export const contestantsRelations = relations(contestants, ({ one, many }) => ({
  competition: one(competitions, { fields: [contestants.competitionId], references: [competitions.id] }),
  talentProfile: one(talentProfiles, { fields: [contestants.talentProfileId], references: [talentProfiles.id] }),
  votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
  contestant: one(contestants, { fields: [votes.contestantId], references: [contestants.id] }),
  competition: one(competitions, { fields: [votes.competitionId], references: [competitions.id] }),
}));

export const insertTalentProfileSchema = createInsertSchema(talentProfiles).omit({ id: true });
export const insertCompetitionSchema = createInsertSchema(competitions).omit({ id: true, createdAt: true });
export const insertContestantSchema = createInsertSchema(contestants).omit({ id: true, appliedAt: true });
export const insertVoteSchema = createInsertSchema(votes).omit({ id: true, votedAt: true });

export type InsertTalentProfile = z.infer<typeof insertTalentProfileSchema>;
export type TalentProfile = typeof talentProfiles.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type Competition = typeof competitions.$inferSelect;
export type InsertContestant = z.infer<typeof insertContestantSchema>;
export type Contestant = typeof contestants.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votes.$inferSelect;
