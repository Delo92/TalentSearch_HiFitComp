import admin from "firebase-admin";
import { getFirestore } from "./firebase-admin";

const COLLECTIONS = {
  USERS: "users",
  CATEGORIES: "categories",
  COMPETITIONS: "competitions",
  TALENT_PROFILES: "talentProfiles",
  CONTESTANTS: "contestants",
  VOTES: "votes",
  VOTE_COUNTS: "voteCounts",
  VOTE_PURCHASES: "votePurchases",
  VOTE_PACKAGES: "votePackages",
  LIVERY: "livery",
  SETTINGS: "settings",
  COUNTERS: "counters",
} as const;

function db() {
  return getFirestore();
}

function now() {
  return admin.firestore.Timestamp.now();
}

async function nextId(collection: string): Promise<number> {
  const ref = db().collection(COLLECTIONS.COUNTERS).doc("ids");
  const result = await db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.data() || {};
    const current = data[collection] || 0;
    const next = current + 1;
    tx.set(ref, { ...data, [collection]: next });
    return next;
  });
  return result;
}

export interface FirestoreCategory {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface FirestoreCompetition {
  id: number;
  title: string;
  description: string | null;
  category: string;
  coverImage: string | null;
  status: string;
  voteCost: number;
  maxVotesPerDay: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
}

export interface FirestoreTalentProfile {
  id: number;
  userId: string;
  displayName: string;
  stageName: string | null;
  bio: string | null;
  category: string | null;
  location: string | null;
  imageUrls: string[];
  videoUrls: string[];
  socialLinks: string | null;
  role: string;
}

export interface FirestoreContestant {
  id: number;
  competitionId: number;
  talentProfileId: number;
  applicationStatus: string;
  appliedAt: string | null;
}

export interface FirestoreVote {
  id: number;
  contestantId: number;
  competitionId: number;
  voterIp: string | null;
  userId: string | null;
  purchaseId: number | null;
  votedAt: string;
}

export interface FirestoreVoteCount {
  contestantId: number;
  competitionId: number;
  count: number;
  updatedAt: admin.firestore.Timestamp;
}

export interface FirestoreVotePurchase {
  id: number;
  userId: string;
  competitionId: number;
  contestantId: number;
  voteCount: number;
  amount: number;
  purchasedAt: string | null;
}

export interface FirestoreVotePackage {
  id: string;
  name: string;
  description: string;
  voteCount: number;
  price: number;
  isActive: boolean;
  order: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface FirestoreLiveryItem {
  imageKey: string;
  label: string;
  imageUrl: string | null;
  defaultUrl: string;
}

export interface FirestoreSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  defaultVoteCost: number;
  defaultMaxVotesPerDay: number;
  updatedAt: admin.firestore.Timestamp;
}

export const firestoreCategories = {
  async getAll(): Promise<FirestoreCategory[]> {
    const snapshot = await db()
      .collection(COLLECTIONS.CATEGORIES)
      .get();
    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreCategory));
    return categories.sort((a, b) => a.order - b.order);
  },

  async get(id: string): Promise<FirestoreCategory | null> {
    const doc = await db().collection(COLLECTIONS.CATEGORIES).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as FirestoreCategory;
  },

  async create(data: Omit<FirestoreCategory, "id" | "createdAt" | "updatedAt">): Promise<FirestoreCategory> {
    const timestamp = now();
    const docRef = db().collection(COLLECTIONS.CATEGORIES).doc();
    const category: FirestoreCategory = {
      ...data,
      id: docRef.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await docRef.set(category);
    return category;
  },

  async update(id: string, data: Partial<Omit<FirestoreCategory, "id" | "createdAt">>): Promise<FirestoreCategory | null> {
    const ref = db().collection(COLLECTIONS.CATEGORIES).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ ...data, updatedAt: now() });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as FirestoreCategory;
  },

  async delete(id: string): Promise<void> {
    await db().collection(COLLECTIONS.CATEGORIES).doc(id).delete();
  },
};

export const firestoreCompetitions = {
  async getAll(): Promise<FirestoreCompetition[]> {
    const snapshot = await db().collection(COLLECTIONS.COMPETITIONS).get();
    const comps = snapshot.docs.map(doc => doc.data() as FirestoreCompetition);
    return comps.sort((a, b) => b.id - a.id);
  },

  async get(id: number): Promise<FirestoreCompetition | null> {
    const doc = await db().collection(COLLECTIONS.COMPETITIONS).doc(String(id)).get();
    if (!doc.exists) return null;
    return doc.data() as FirestoreCompetition;
  },

  async create(data: Omit<FirestoreCompetition, "id">): Promise<FirestoreCompetition> {
    const id = await nextId("competitions");
    const competition: FirestoreCompetition = { ...data, id };
    await db().collection(COLLECTIONS.COMPETITIONS).doc(String(id)).set(competition);
    return competition;
  },

  async update(id: number, data: Partial<Omit<FirestoreCompetition, "id">>): Promise<FirestoreCompetition | null> {
    const ref = db().collection(COLLECTIONS.COMPETITIONS).doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update(data);
    const updated = await ref.get();
    return updated.data() as FirestoreCompetition;
  },

  async delete(id: number): Promise<void> {
    await db().collection(COLLECTIONS.COMPETITIONS).doc(String(id)).delete();
    const votesSnapshot = await db().collection(COLLECTIONS.VOTES).where("competitionId", "==", id).get();
    const batch1 = db().batch();
    votesSnapshot.docs.forEach(doc => batch1.delete(doc.ref));
    if (votesSnapshot.docs.length > 0) await batch1.commit();

    const contestantsSnapshot = await db().collection(COLLECTIONS.CONTESTANTS).where("competitionId", "==", id).get();
    const batch2 = db().batch();
    contestantsSnapshot.docs.forEach(doc => batch2.delete(doc.ref));
    if (contestantsSnapshot.docs.length > 0) await batch2.commit();

    const voteCountsSnapshot = await db().collection(COLLECTIONS.VOTE_COUNTS).where("competitionId", "==", id).get();
    const batch3 = db().batch();
    voteCountsSnapshot.docs.forEach(doc => batch3.delete(doc.ref));
    if (voteCountsSnapshot.docs.length > 0) await batch3.commit();
  },
};

export const firestoreTalentProfiles = {
  async getAll(): Promise<FirestoreTalentProfile[]> {
    const snapshot = await db().collection(COLLECTIONS.TALENT_PROFILES).get();
    return snapshot.docs.map(doc => doc.data() as FirestoreTalentProfile);
  },

  async get(id: number): Promise<FirestoreTalentProfile | null> {
    const doc = await db().collection(COLLECTIONS.TALENT_PROFILES).doc(String(id)).get();
    if (!doc.exists) return null;
    return doc.data() as FirestoreTalentProfile;
  },

  async getByUserId(userId: string): Promise<FirestoreTalentProfile | null> {
    const snapshot = await db()
      .collection(COLLECTIONS.TALENT_PROFILES)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as FirestoreTalentProfile;
  },

  async create(data: Omit<FirestoreTalentProfile, "id">): Promise<FirestoreTalentProfile> {
    const id = await nextId("talentProfiles");
    const profile: FirestoreTalentProfile = { ...data, id };
    await db().collection(COLLECTIONS.TALENT_PROFILES).doc(String(id)).set(profile);
    return profile;
  },

  async updateByUserId(userId: string, data: Partial<Omit<FirestoreTalentProfile, "id" | "userId">>): Promise<FirestoreTalentProfile | null> {
    const snapshot = await db()
      .collection(COLLECTIONS.TALENT_PROFILES)
      .where("userId", "==", userId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const docRef = snapshot.docs[0].ref;
    await docRef.update(data);
    const updated = await docRef.get();
    return updated.data() as FirestoreTalentProfile;
  },

  async getByRole(role: string): Promise<FirestoreTalentProfile[]> {
    const snapshot = await db()
      .collection(COLLECTIONS.TALENT_PROFILES)
      .where("role", "==", role)
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreTalentProfile);
  },
};

export const firestoreContestants = {
  async getByCompetition(competitionId: number): Promise<FirestoreContestant[]> {
    const snapshot = await db()
      .collection(COLLECTIONS.CONTESTANTS)
      .where("competitionId", "==", competitionId)
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreContestant);
  },

  async getByTalent(talentProfileId: number): Promise<FirestoreContestant[]> {
    const snapshot = await db()
      .collection(COLLECTIONS.CONTESTANTS)
      .where("talentProfileId", "==", talentProfileId)
      .get();
    return snapshot.docs.map(doc => doc.data() as FirestoreContestant);
  },

  async getAll(): Promise<FirestoreContestant[]> {
    const snapshot = await db().collection(COLLECTIONS.CONTESTANTS).get();
    return snapshot.docs.map(doc => doc.data() as FirestoreContestant);
  },

  async get(competitionId: number, talentProfileId: number): Promise<FirestoreContestant | null> {
    const snapshot = await db()
      .collection(COLLECTIONS.CONTESTANTS)
      .where("competitionId", "==", competitionId)
      .where("talentProfileId", "==", talentProfileId)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as FirestoreContestant;
  },

  async getById(id: number): Promise<FirestoreContestant | null> {
    const doc = await db().collection(COLLECTIONS.CONTESTANTS).doc(String(id)).get();
    if (!doc.exists) return null;
    return doc.data() as FirestoreContestant;
  },

  async create(data: Omit<FirestoreContestant, "id">): Promise<FirestoreContestant> {
    const id = await nextId("contestants");
    const contestant: FirestoreContestant = { ...data, id };
    await db().collection(COLLECTIONS.CONTESTANTS).doc(String(id)).set(contestant);
    return contestant;
  },

  async updateStatus(id: number, status: string): Promise<FirestoreContestant | null> {
    const ref = db().collection(COLLECTIONS.CONTESTANTS).doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ applicationStatus: status });
    const updated = await ref.get();
    return updated.data() as FirestoreContestant;
  },
};

export const firestoreVotes = {
  async cast(data: Omit<FirestoreVote, "id" | "votedAt">): Promise<FirestoreVote> {
    const id = await nextId("votes");
    const vote: FirestoreVote = {
      ...data,
      id,
      votedAt: new Date().toISOString(),
    };
    await db().collection(COLLECTIONS.VOTES).doc(String(id)).set(vote);

    const countDocId = `${data.competitionId}_${data.contestantId}`;
    const countRef = db().collection(COLLECTIONS.VOTE_COUNTS).doc(countDocId);
    const countDoc = await countRef.get();
    if (countDoc.exists) {
      await countRef.update({
        count: admin.firestore.FieldValue.increment(1),
        updatedAt: now(),
      });
    } else {
      await countRef.set({
        contestantId: data.contestantId,
        competitionId: data.competitionId,
        count: 1,
        updatedAt: now(),
      });
    }

    return vote;
  },

  async getVoteCount(contestantId: number): Promise<number> {
    const snapshot = await db()
      .collection(COLLECTIONS.VOTE_COUNTS)
      .where("contestantId", "==", contestantId)
      .get();
    let total = 0;
    snapshot.docs.forEach(doc => {
      total += (doc.data() as FirestoreVoteCount).count;
    });
    return total;
  },

  async getTotalByCompetition(competitionId: number): Promise<number> {
    const snapshot = await db()
      .collection(COLLECTIONS.VOTE_COUNTS)
      .where("competitionId", "==", competitionId)
      .get();
    let total = 0;
    snapshot.docs.forEach(doc => {
      total += (doc.data() as FirestoreVoteCount).count;
    });
    return total;
  },

  async getVotesTodayByIp(competitionId: number, voterIp: string): Promise<number> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStr = todayStart.toISOString();

    const snapshot = await db()
      .collection(COLLECTIONS.VOTES)
      .where("competitionId", "==", competitionId)
      .where("voterIp", "==", voterIp)
      .where("votedAt", ">=", todayStr)
      .get();
    return snapshot.docs.length;
  },

  async syncVoteCount(contestantId: number, competitionId: number, totalCount: number): Promise<void> {
    const docId = `${competitionId}_${contestantId}`;
    await db().collection(COLLECTIONS.VOTE_COUNTS).doc(docId).set({
      contestantId,
      competitionId,
      count: totalCount,
      updatedAt: now(),
    });
  },

  async getVoteCountForContestantInCompetition(contestantId: number, competitionId: number): Promise<number> {
    const docId = `${competitionId}_${contestantId}`;
    const doc = await db().collection(COLLECTIONS.VOTE_COUNTS).doc(docId).get();
    if (!doc.exists) return 0;
    return (doc.data() as FirestoreVoteCount).count;
  },
};

export const firestoreVotePurchases = {
  async create(data: Omit<FirestoreVotePurchase, "id" | "purchasedAt">): Promise<FirestoreVotePurchase> {
    const id = await nextId("votePurchases");
    const purchase: FirestoreVotePurchase = {
      ...data,
      id,
      purchasedAt: new Date().toISOString(),
    };
    await db().collection(COLLECTIONS.VOTE_PURCHASES).doc(String(id)).set(purchase);
    return purchase;
  },

  async getByUser(userId: string): Promise<FirestoreVotePurchase[]> {
    const snapshot = await db()
      .collection(COLLECTIONS.VOTE_PURCHASES)
      .where("userId", "==", userId)
      .get();
    const purchases = snapshot.docs.map(doc => doc.data() as FirestoreVotePurchase);
    return purchases.sort((a, b) => (b.purchasedAt || "").localeCompare(a.purchasedAt || ""));
  },
};

export const firestoreVotePackages = {
  async getAll(): Promise<FirestoreVotePackage[]> {
    const snapshot = await db()
      .collection(COLLECTIONS.VOTE_PACKAGES)
      .get();
    const packages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreVotePackage));
    return packages.sort((a, b) => a.order - b.order);
  },

  async getActive(): Promise<FirestoreVotePackage[]> {
    const snapshot = await db()
      .collection(COLLECTIONS.VOTE_PACKAGES)
      .where("isActive", "==", true)
      .get();
    const packages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreVotePackage));
    return packages.sort((a, b) => a.order - b.order);
  },

  async get(id: string): Promise<FirestoreVotePackage | null> {
    const doc = await db().collection(COLLECTIONS.VOTE_PACKAGES).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as FirestoreVotePackage;
  },

  async create(data: Omit<FirestoreVotePackage, "id" | "createdAt" | "updatedAt">): Promise<FirestoreVotePackage> {
    const timestamp = now();
    const docRef = db().collection(COLLECTIONS.VOTE_PACKAGES).doc();
    const pkg: FirestoreVotePackage = {
      ...data,
      id: docRef.id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await docRef.set(pkg);
    return pkg;
  },

  async update(id: string, data: Partial<Omit<FirestoreVotePackage, "id" | "createdAt">>): Promise<FirestoreVotePackage | null> {
    const ref = db().collection(COLLECTIONS.VOTE_PACKAGES).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ ...data, updatedAt: now() });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() } as FirestoreVotePackage;
  },

  async delete(id: string): Promise<void> {
    await db().collection(COLLECTIONS.VOTE_PACKAGES).doc(id).delete();
  },
};

export const firestoreLivery = {
  async getAll(): Promise<FirestoreLiveryItem[]> {
    const snapshot = await db().collection(COLLECTIONS.LIVERY).get();
    const items = snapshot.docs.map(doc => doc.data() as FirestoreLiveryItem);
    return items.sort((a, b) => a.label.localeCompare(b.label));
  },

  async getByKey(imageKey: string): Promise<FirestoreLiveryItem | null> {
    const doc = await db().collection(COLLECTIONS.LIVERY).doc(imageKey).get();
    if (!doc.exists) return null;
    return doc.data() as FirestoreLiveryItem;
  },

  async upsert(item: FirestoreLiveryItem): Promise<FirestoreLiveryItem> {
    await db().collection(COLLECTIONS.LIVERY).doc(item.imageKey).set(item);
    return item;
  },

  async updateImage(imageKey: string, imageUrl: string | null): Promise<FirestoreLiveryItem | null> {
    const ref = db().collection(COLLECTIONS.LIVERY).doc(imageKey);
    const doc = await ref.get();
    if (!doc.exists) return null;
    await ref.update({ imageUrl });
    const updated = await ref.get();
    return updated.data() as FirestoreLiveryItem;
  },
};

export const firestoreSettings = {
  async get(): Promise<FirestoreSettings | null> {
    const doc = await db().collection(COLLECTIONS.SETTINGS).doc("global").get();
    if (!doc.exists) return null;
    return doc.data() as FirestoreSettings;
  },

  async update(data: Partial<Omit<FirestoreSettings, "updatedAt">>): Promise<FirestoreSettings> {
    const ref = db().collection(COLLECTIONS.SETTINGS).doc("global");
    const doc = await ref.get();

    if (doc.exists) {
      await ref.update({ ...data, updatedAt: now() });
    } else {
      const defaults: FirestoreSettings = {
        siteName: "HiFitComp",
        siteDescription: "Talent Competition & Voting Platform",
        contactEmail: "admin@hifitcomp.com",
        defaultVoteCost: 0,
        defaultMaxVotesPerDay: 10,
        updatedAt: now(),
        ...data,
      };
      await ref.set(defaults);
      return defaults;
    }

    const updated = await ref.get();
    return updated.data() as FirestoreSettings;
  },
};
