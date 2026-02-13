import { google, drive_v3 } from "googleapis";
import { Readable } from "stream";

let driveClient: drive_v3.Drive | null = null;

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

export async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const drive = getDriveClient();

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

export async function getTalentFolder(talentName: string): Promise<string> {
  const rootId = await getHiFitCompFolder();
  return findOrCreateFolder(talentName, rootId);
}

export async function getTalentImagesFolder(talentName: string): Promise<string> {
  const talentId = await getTalentFolder(talentName);
  return findOrCreateFolder("images", talentId);
}

export async function uploadImageToDrive(
  talentName: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer
): Promise<{ id: string; webViewLink: string; webContentLink: string; thumbnailLink: string }> {
  const drive = getDriveClient();
  const folderId = await getTalentImagesFolder(talentName);

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

export async function listTalentImages(talentName: string): Promise<Array<{
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  webContentLink: string;
  thumbnailLink: string;
}>> {
  try {
    const folderId = await getTalentImagesFolder(talentName);
    return listImagesInFolder(folderId);
  } catch {
    return [];
  }
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
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

export function getDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

export function getDriveThumbnailUrl(fileId: string, size: number = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}
