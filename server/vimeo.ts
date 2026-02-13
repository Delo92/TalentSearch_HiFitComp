const VIMEO_BASE = "https://api.vimeo.com";

function getVimeoHeaders(): Record<string, string> {
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("VIMEO_ACCESS_TOKEN secret is not set");
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.vimeo.*+json;version=3.4",
  };
}

export interface VimeoVideo {
  uri: string;
  name: string;
  description: string | null;
  link: string;
  player_embed_url: string;
  duration: number;
  width: number;
  height: number;
  status: string;
  pictures: {
    sizes: Array<{ width: number; height: number; link: string }>;
  };
  created_time: string;
}

export interface VimeoFolder {
  uri: string;
  name: string;
  metadata: {
    connections: {
      videos: { total: number; uri: string };
    };
  };
}

async function vimeoRequest(path: string, options: RequestInit = {}): Promise<any> {
  const url = path.startsWith("http") ? path : `${VIMEO_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      ...getVimeoHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vimeo API error ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function findOrCreateFolder(name: string, parentUri?: string): Promise<VimeoFolder> {
  const listPath = parentUri
    ? `${parentUri}/items?type=folder&per_page=100`
    : `/me/projects?per_page=100`;

  try {
    const data = await vimeoRequest(listPath);
    const folders = data.data || [];
    const existing = folders.find((f: any) => f.name === name);
    if (existing) return existing;
  } catch {
  }

  const createPath = parentUri ? `${parentUri}/items` : `/me/projects`;
  const created = await vimeoRequest(createPath, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  return created;
}

export async function getHiFitCompFolder(): Promise<VimeoFolder> {
  return findOrCreateFolder("HiFitComp");
}

export async function getCompetitionFolder(competitionName: string): Promise<VimeoFolder> {
  const root = await getHiFitCompFolder();
  const safeName = competitionName.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
  return findOrCreateFolder(safeName, root.uri);
}

export async function getTalentFolderInCompetition(competitionName: string, talentName: string): Promise<VimeoFolder> {
  const compFolder = await getCompetitionFolder(competitionName);
  const safeTalentName = talentName.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
  return findOrCreateFolder(safeTalentName, compFolder.uri);
}

export async function createCompetitionVimeoFolder(competitionName: string): Promise<VimeoFolder> {
  return getCompetitionFolder(competitionName);
}

export async function createContestantVimeoFolder(competitionName: string, talentName: string): Promise<VimeoFolder> {
  return getTalentFolderInCompetition(competitionName, talentName);
}

export async function listTalentVideos(competitionName: string, talentName: string): Promise<VimeoVideo[]> {
  try {
    const folder = await getTalentFolderInCompetition(competitionName, talentName);
    const videosUri = folder.metadata?.connections?.videos?.uri;
    if (!videosUri) return [];

    const data = await vimeoRequest(`${videosUri}?per_page=50&sort=date&direction=desc`);
    return data.data || [];
  } catch {
    return [];
  }
}

export async function listAllTalentVideos(talentName: string): Promise<(VimeoVideo & { competitionFolder: string })[]> {
  try {
    const root = await getHiFitCompFolder();
    const listPath = `${root.uri}/items?type=folder&per_page=100`;
    const data = await vimeoRequest(listPath);
    const compFolders = data.data || [];

    const allVideos: (VimeoVideo & { competitionFolder: string })[] = [];
    const safeTalentName = talentName.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();

    for (const compFolder of compFolders) {
      try {
        const talentListPath = `${compFolder.uri}/items?type=folder&per_page=100`;
        const talentData = await vimeoRequest(talentListPath);
        const talentFolders = talentData.data || [];
        const talentFolder = talentFolders.find((f: any) => f.name === safeTalentName);
        if (!talentFolder) continue;

        const videosUri = talentFolder.metadata?.connections?.videos?.uri;
        if (!videosUri) continue;

        const videosData = await vimeoRequest(`${videosUri}?per_page=50&sort=date&direction=desc`);
        const videos = videosData.data || [];
        allVideos.push(...videos.map((v: VimeoVideo) => ({ ...v, competitionFolder: compFolder.name })));
      } catch {
        continue;
      }
    }
    return allVideos;
  } catch {
    return [];
  }
}

export async function createUploadTicket(
  competitionName: string,
  talentName: string,
  fileName: string,
  fileSize: number
): Promise<{
  uploadLink: string;
  videoUri: string;
  completeUri: string;
}> {
  const folder = await getTalentFolderInCompetition(competitionName, talentName);

  const data = await vimeoRequest("/me/videos", {
    method: "POST",
    body: JSON.stringify({
      upload: {
        approach: "tus",
        size: fileSize,
      },
      name: fileName,
      folder_uri: folder.uri,
    }),
  });

  return {
    uploadLink: data.upload.upload_link,
    videoUri: data.uri,
    completeUri: data.upload.complete_uri || "",
  };
}

export async function getVideo(videoUri: string): Promise<VimeoVideo> {
  return vimeoRequest(videoUri);
}

export async function deleteVideo(videoUri: string): Promise<void> {
  await vimeoRequest(videoUri, { method: "DELETE" });
}

export function getVideoThumbnail(video: VimeoVideo, width: number = 640): string {
  if (!video.pictures?.sizes?.length) return "";
  const sorted = [...video.pictures.sizes].sort((a, b) => Math.abs(a.width - width) - Math.abs(b.width - width));
  return sorted[0]?.link || "";
}

export function getVideoEmbedUrl(video: VimeoVideo): string {
  return video.player_embed_url || "";
}
