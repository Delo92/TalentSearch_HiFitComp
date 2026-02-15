import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";

let driveClient: drive_v3.Drive | null = null;
let oauthDriveClient: drive_v3.Drive | null = null;

const REFRESH_TOKEN_PATH = path.join(process.cwd(), ".google-drive-refresh-token");

function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient;

  const credentialsJson = process.env.GOOGLE_DRIVE_CREDENTIALS || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!credentialsJson) {
    throw new Error("GOOGLE_DRIVE_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT secret is not set");
  }

  let credentials: any;
  try {
    credentials = JSON.parse(credentialsJson);
  } catch {
    throw new Error("Drive credentials are not valid JSON");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  driveClient = google.drive({ version: "v3", auth });
  return driveClient;
}

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const redirectUri = getOAuthRedirectUri();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getOAuthRedirectUri(): string {
  const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPL_SLUG + "." + process.env.REPL_OWNER + ".repl.co";
  return `https://${domain}/api/admin/google-drive-callback`;
}

function getSavedRefreshToken(): string | null {
  try {
    if (fs.existsSync(REFRESH_TOKEN_PATH)) {
      return fs.readFileSync(REFRESH_TOKEN_PATH, "utf-8").trim();
    }
  } catch {}
  return process.env.GOOGLE_DRIVE_REFRESH_TOKEN || null;
}

function saveRefreshToken(token: string) {
  try {
    fs.writeFileSync(REFRESH_TOKEN_PATH, token, "utf-8");
    console.log("Google Drive refresh token saved");
  } catch (err: any) {
    console.error("Failed to save refresh token:", err.message);
  }
}

function getOAuthDriveClient(): drive_v3.Drive | null {
  if (oauthDriveClient) return oauthDriveClient;

  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;

  const refreshToken = getSavedRefreshToken();
  if (!refreshToken) return null;

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  oauthDriveClient = google.drive({ version: "v3", auth: oauth2Client });
  return oauthDriveClient;
}

function getUploadDriveClient(): drive_v3.Drive {
  const oauthClient = getOAuthDriveClient();
  if (oauthClient) return oauthClient;
  return getDriveClient();
}

export function getOAuthAuthorizationUrl(): string | null {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return null;

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    prompt: "consent",
  });
}

export async function exchangeOAuthCode(code: string): Promise<{ success: boolean; error?: string }> {
  const oauth2Client = getOAuth2Client();
  if (!oauth2Client) return { success: false, error: "OAuth client not configured" };

  try {
    const { tokens } = await oauth2Client.getToken(code);
    if (tokens.refresh_token) {
      saveRefreshToken(tokens.refresh_token);
      oauthDriveClient = null;
      return { success: true };
    }
    return { success: false, error: "No refresh token received" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function isOAuthConnected(): boolean {
  return !!getSavedRefreshToken();
}

export function getOAuthRedirectUriForSetup(): string {
  return getOAuthRedirectUri();
}

export async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const drive = getUploadDriveClient();

  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const folderMetadata: drive_v3.Schema$File = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    folderMetadata.parents = [parentId];
  }

  const folder = await drive.files.create({
    requestBody: folderMetadata,
    fields: "id",
  });

  return folder.data.id!;
}

export async function getHiFitCompFolder(): Promise<string> {
  return findOrCreateFolder("HiFitComp");
}

export async function getCompetitionFolder(competitionName: string): Promise<string> {
  const rootId = await getHiFitCompFolder();
  const safeName = competitionName.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
  return findOrCreateFolder(safeName, rootId);
}

export async function getTalentFolderInCompetition(competitionName: string, talentName: string): Promise<string> {
  const competitionFolderId = await getCompetitionFolder(competitionName);
  const safeTalentName = talentName.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
  return findOrCreateFolder(safeTalentName, competitionFolderId);
}

export async function getTalentMediaFolder(competitionName: string, talentName: string): Promise<string> {
  const talentFolderId = await getTalentFolderInCompetition(competitionName, talentName);
  return findOrCreateFolder("media1", talentFolderId);
}

export async function createCompetitionDriveFolder(competitionName: string): Promise<string> {
  return getCompetitionFolder(competitionName);
}

export async function createContestantDriveFolders(competitionName: string, talentName: string): Promise<string> {
  return getTalentMediaFolder(competitionName, talentName);
}

export async function uploadImageToDrive(
  competitionName: string,
  talentName: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ id: string; webViewLink: string; webContentLink: string; thumbnailLink: string }> {
  const drive = getUploadDriveClient();
  const folderId = await getTalentMediaFolder(competitionName, talentName);

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink, webContentLink, thumbnailLink",
  });

  await drive.permissions.create({
    fileId: res.data.id!,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    id: res.data.id!,
    webViewLink: res.data.webViewLink || "",
    webContentLink: res.data.webContentLink || "",
    thumbnailLink: res.data.thumbnailLink || "",
  };
}

export async function uploadFileToDriveFolder(
  folderId: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ id: string; name: string; webViewLink: string; size: string }> {
  const drive = getUploadDriveClient();

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, name, webViewLink, size",
  });

  return {
    id: res.data.id!,
    name: res.data.name || fileName,
    webViewLink: res.data.webViewLink || "",
    size: res.data.size || "0",
  };
}

export async function listImagesInFolder(folderId: string): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink: string;
}>> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false and mimeType contains 'image/'`,
    fields: "files(id, name, mimeType, webViewLink, webContentLink, thumbnailLink)",
    orderBy: "createdTime desc",
  });

  return (res.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType!,
    webViewLink: f.webViewLink || "",
    webContentLink: f.webContentLink || "",
    thumbnailLink: f.thumbnailLink || "",
  }));
}

export async function listTalentImages(competitionName: string, talentName: string): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink: string;
}>> {
  try {
    const folderId = await getTalentMediaFolder(competitionName, talentName);
    return listImagesInFolder(folderId);
  } catch {
    return [];
  }
}

export async function listAllTalentImages(talentName: string): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink: string;
  competitionFolder: string;
}>> {
  try {
    const drive = getDriveClient();
    const rootId = await getHiFitCompFolder();
    const compFoldersRes = await drive.files.list({
      q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
    });
    const allImages: Array<{
      id: string;
      name: string;
      mimeType: string;
      webViewLink: string;
      webContentLink: string;
      thumbnailLink: string;
      competitionFolder: string;
    }> = [];
    const safeTalentName = talentName.replace(/[^a-zA-Z0-9_\-\s]/g, "_").trim();
    for (const compFolder of compFoldersRes.data.files || []) {
      const talentFoldersRes = await drive.files.list({
        q: `'${compFolder.id}' in parents and name='${safeTalentName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
      });
      for (const talentFolder of talentFoldersRes.data.files || []) {
        const mediaFolderRes = await drive.files.list({
          q: `'${talentFolder.id}' in parents and name='media1' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
          fields: "files(id)",
        });
        for (const mediaFolder of mediaFolderRes.data.files || []) {
          const images = await listImagesInFolder(mediaFolder.id!);
          allImages.push(...images.map(img => ({ ...img, competitionFolder: compFolder.name! })));
        }
      }
    }
    return allImages;
  } catch {
    return [];
  }
}

export async function listFilesInFolder(folderId: string): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink: string;
  webViewLink: string;
  webContentLink: string;
  size: string;
  createdTime: string;
}>> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: "files(id, name, mimeType, thumbnailLink, webViewLink, webContentLink, size, createdTime)",
    orderBy: "createdTime desc",
    pageSize: 100,
  });

  return (res.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType || "",
    thumbnailLink: f.thumbnailLink || "",
    webViewLink: f.webViewLink || "",
    webContentLink: f.webContentLink || "",
    size: f.size || "0",
    createdTime: f.createdTime || "",
  }));
}

export async function getFileStream(fileId: string): Promise<Readable> {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  return res.data as unknown as Readable;
}

export async function deleteFile(fileId: string): Promise<void> {
  const drive = getUploadDriveClient();
  await drive.files.delete({ fileId });
}

export function getDriveImageUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function getDriveThumbnailUrl(fileId: string, size: number = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

export async function getDriveStorageUsage(): Promise<{
  usedGB: number;
  totalGB: number;
  usedPercent: number;
  totalFiles: number;
  hifitcompSizeMB: number;
  folders: Array<{ name: string; fileCount: number; sizeBytes: number; sizeMB: number }>;
  error?: string;
}> {
  const drive = getDriveClient();
  let usedGB = 0;
  let totalGB = 0;
  let totalFiles = 0;
  let hifitcompSizeBytes = 0;
  const folders: Array<{ name: string; fileCount: number; sizeBytes: number; sizeMB: number }> = [];

  try {
    const about = await drive.about.get({ fields: "storageQuota" });
    const quota = about.data.storageQuota;
    if (quota) {
      usedGB = Math.round((parseInt(quota.usage || "0") / (1024 * 1024 * 1024)) * 100) / 100;
      const limitBytes = parseInt(quota.limit || "0");
      totalGB = limitBytes > 0
        ? Math.round((limitBytes / (1024 * 1024 * 1024)) * 100) / 100
        : 0;
    }
  } catch (err: any) {
    console.error("Error getting Drive about info:", err.message);
  }

  try {
    const rootId = await getHiFitCompFolder();
    const compFoldersRes = await drive.files.list({
      q: `'${rootId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
    });

    for (const compFolder of compFoldersRes.data.files || []) {
      let folderSize = 0;
      let folderFiles = 0;

      const allFilesInComp = await drive.files.list({
        q: `'${compFolder.id}' in parents and trashed=false`,
        fields: "files(id, mimeType, size)",
        pageSize: 1000,
      });

      for (const item of allFilesInComp.data.files || []) {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          const subFiles = await drive.files.list({
            q: `'${item.id}' in parents and trashed=false`,
            fields: "files(id, mimeType, size)",
            pageSize: 1000,
          });
          for (const subItem of subFiles.data.files || []) {
            if (subItem.mimeType === "application/vnd.google-apps.folder") {
              const deepFiles = await drive.files.list({
                q: `'${subItem.id}' in parents and trashed=false`,
                fields: "files(size)",
                pageSize: 1000,
              });
              for (const df of deepFiles.data.files || []) {
                const sz = parseInt(df.size || "0");
                folderSize += sz;
                folderFiles++;
              }
            } else {
              const sz = parseInt(subItem.size || "0");
              folderSize += sz;
              folderFiles++;
            }
          }
        } else {
          const sz = parseInt(item.size || "0");
          folderSize += sz;
          folderFiles++;
        }
      }

      totalFiles += folderFiles;
      hifitcompSizeBytes += folderSize;
      folders.push({
        name: compFolder.name!,
        fileCount: folderFiles,
        sizeBytes: folderSize,
        sizeMB: Math.round((folderSize / (1024 * 1024)) * 100) / 100,
      });
    }
  } catch (err: any) {
    console.error("Error calculating Drive folder sizes:", err.message);
  }

  return {
    usedGB,
    totalGB,
    usedPercent: totalGB > 0 ? Math.round((usedGB / totalGB) * 10000) / 100 : 0,
    totalFiles,
    hifitcompSizeMB: Math.round((hifitcompSizeBytes / (1024 * 1024)) * 100) / 100,
    folders,
  };
}
