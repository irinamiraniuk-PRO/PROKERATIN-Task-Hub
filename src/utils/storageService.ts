import { supabaseClient } from './supabaseClient';

function fileExtFromMime(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'bin';
}

function dataUrlToBlob(dataUrl: string): { blob: Blob; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1];
  const base64 = match[2];
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

async function uploadBlob(bucket: string, path: string, blob: Blob, contentType: string): Promise<string | null> {
  if (!supabaseClient) return null;
  const { error } = await supabaseClient.storage.from(bucket).upload(path, blob, {
    upsert: true,
    contentType,
    cacheControl: '3600',
  });
  if (error) return null;
  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatarDataUrl(userId: string, dataUrl: string): Promise<string | null> {
  const converted = dataUrlToBlob(dataUrl);
  if (!converted) return null;
  const ext = fileExtFromMime(converted.mimeType);
  const path = `${userId}/avatar.${ext}`;
  return uploadBlob('avatars', path, converted.blob, converted.mimeType);
}

export async function uploadAttachmentDataUrl(userId: string, taskId: string, fileName: string, dataUrl: string, mimeType: string): Promise<string | null> {
  const converted = dataUrlToBlob(dataUrl);
  if (!converted) return null;
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const ext = fileExtFromMime(mimeType || converted.mimeType);
  const path = `${userId}/${taskId}/${Date.now()}-${safeName}.${ext}`;
  return uploadBlob('attachments', path, converted.blob, mimeType || converted.mimeType);
}
