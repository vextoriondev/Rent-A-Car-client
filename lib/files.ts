/** Client side of the central File & Media system (backend: rentals/api/attachments.py). Never trusts itself: the server re-validates everything. */
import {apiRequest, csrf, currentOrgId, ApiError} from '@/lib/api';

export type FileKind = 'profile' | 'photo' | 'document';
export type AttachmentItem = {
  id: string; kind: FileKind; category: string; description: string; fileName: string; mimeType: string; extension: string; isImage: boolean;
  sizeOriginal: number; sizeStored: number; width: number | null; height: number | null; status: 'uploading' | 'processing' | 'completed' | 'failed';
  error: string; hasThumb: boolean; uploadedAt: string; uploadedBy: string; duplicate?: boolean;
  urls: {view: string; thumb: string; medium: string; download: string};
};
export type FileLimits = {maxImageBytes: number; maxPdfBytes: number; maxDocBytes: number; maxFiles: number; maxTotalBytes: number; categories: Record<string, string[]>};
export type UploadResult = {items: AttachmentItem[]; errors: {fileName: string; code: string; message: string; status: number}[]};

/** Route prefix of every entity the server accepts files for. */
export const ENTITY_PREFIX = {owner: 'tasin-owners', driver: 'tasin-drivers', client: 'tasin-clients', vehicle: 'tasin-vehicles', agreement: 'tasin-agreements', maintenance: 'tasin-maintenance', transaction: 'tasin-transactions'} as const;
export type EntityType = keyof typeof ENTITY_PREFIX;

export const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** A file URL the browser can use directly (inside <img src> / links). The server checks the session on every request. */
export const fileUrl = (path: string) => (path.startsWith('/backend') ? path : '/backend' + path);

let limitsPromise: Promise<FileLimits> | null = null;
export function fetchFileLimits(): Promise<FileLimits> {
  if (!limitsPromise) limitsPromise = apiRequest('/orgs/1/files-limits').catch(e => { limitsPromise = null; throw e; });
  return limitsPromise;
}

export const listFiles = (entity: EntityType, id: number | string): Promise<AttachmentItem[]> => apiRequest(`/orgs/1/${ENTITY_PREFIX[entity]}/${id}/files`);
export const updateFile = (fileId: string, body: {description?: string; category?: string}): Promise<AttachmentItem> =>
  apiRequest(`/orgs/1/files/${fileId}`, {method: 'PATCH', body: JSON.stringify(body)});
export const deleteFile = (fileId: string) => apiRequest(`/orgs/1/files/${fileId}`, {method: 'DELETE'});
export const makeMainPhoto = (fileId: string): Promise<AttachmentItem> => apiRequest(`/orgs/1/files/${fileId}/make-primary`, {method: 'POST'});
export const retryFile = (fileId: string): Promise<AttachmentItem> => apiRequest(`/orgs/1/files/${fileId}/retry`, {method: 'POST'});
export const fetchFileUsage = () => apiRequest('/orgs/1/files-usage');

export const fmtBytes = (n: number) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B');

/** First problem with a file against the server's limits, or ''. Mirrors the backend (which still checks everything again). */
export function checkFile(f: File, limits: FileLimits | null, imagesOnly = false): string {
  const isImg = /^image\/(jpeg|png|webp)$/.test(f.type);
  const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
  const isDoc = /\.docx?$/i.test(f.name);
  if (imagesOnly && !isImg) return 'Only JPEG, PNG or WebP photos are allowed here';
  if (!isImg && !isPdf && !isDoc) return 'Only images, PDF and Word files are allowed';
  if (f.size === 0) return 'The file is empty';
  if (limits) {
    const max = isImg ? limits.maxImageBytes : isPdf ? limits.maxPdfBytes : limits.maxDocBytes;
    if (f.size > max) return `Larger than the ${fmtBytes(max)} limit for this type`;
  }
  return '';
}

/** Phone photos are huge; shrink them in the browser first so the upload is small and quick (the server optimizes again).
 *  Scans of documents are NOT touched: legibility matters more than bytes there. */
export async function shrinkPhoto(f: File, maxSide = 2400): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1.2 * 1048576 || typeof createImageBitmap === 'undefined') return f;
  try {
    const bmp = await createImageBitmap(f, {imageOrientation: 'from-image'});
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const keepPng = f.type === 'image/png';
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, keepPng ? 'image/png' : 'image/jpeg', 0.88));
    if (blob && blob.size < f.size) return new File([blob], f.name.replace(/\.\w+$/, keepPng ? '.png' : '.jpg'), {type: blob.type});
  } catch { /* fall back to the original */ }
  return f;
}

const newKey = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

/** Multipart upload with progress. One Idempotency-Key per batch, so a retry after a network drop never creates duplicates. */
export async function uploadFiles(entity: EntityType, id: number | string, files: File[], opts: {kind?: FileKind; category?: string; description?: string; onProgress?: (pct: number) => void; key?: string} = {}): Promise<UploadResult> {
  const orgId = await currentOrgId();
  try { await fetch('/backend/csrf', {credentials: 'same-origin'}); } catch { /* the cookie may already exist */ }
  const form = new FormData();
  files.forEach(f => form.append('files', f, f.name));
  form.append('kind', opts.kind || 'document');
  form.append('category', opts.category || '');
  form.append('description', opts.description || '');
  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/backend/orgs/${orgId}/${ENTITY_PREFIX[entity]}/${id}/files`);
    xhr.withCredentials = true;
    const token = csrf();
    if (token) xhr.setRequestHeader('X-CSRFToken', decodeURIComponent(token));
    xhr.setRequestHeader('Idempotency-Key', opts.key || newKey());
    xhr.upload.onprogress = e => { if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => reject(new ApiError('Network error: the upload was interrupted. Try again.', 0));
    xhr.ontimeout = () => reject(new ApiError('The upload took too long. Try again.', 0));
    xhr.onload = () => {
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResult);
      else reject(new ApiError(body?.detail || (xhr.status === 413 ? 'The upload is too large' : `Upload failed (${xhr.status})`), xhr.status, body?.code));
    };
    xhr.send(form);
  });
}

export type CentralFile = AttachmentItem & {entityType: EntityType; entityId: number; entityName: string; entityDetail: string};
/** Central Documents screen: files of every record the caller may view, filtered on the server. */
export function fetchCentralFiles(f: {entity?: string; entityId?: string | number; category?: string; q?: string; kind?: string; limit?: number; offset?: number} = {}): Promise<{items: CentralFile[]; total: number}> {
  const p = new URLSearchParams();
  if (f.entity) p.set('entity', f.entity);
  if (f.entityId) p.set('entity_id', String(f.entityId));
  if (f.category) p.set('category', f.category);
  if (f.q) p.set('q', f.q);
  p.set('kind', f.kind || 'document');
  p.set('limit', String(f.limit || 100));
  if (f.offset) p.set('offset', String(f.offset));
  return apiRequest(`/orgs/1/files?${p.toString()}`);
}

/** Replace a document: the new file takes over the old one's record, category and description. */
export async function replaceFile(fileId: string, file: File): Promise<AttachmentItem> {
  const orgId = await currentOrgId();
  try { await fetch('/backend/csrf', {credentials: 'same-origin'}); } catch { /* the cookie may already exist */ }
  const form = new FormData();
  form.append('file', file, file.name);
  const headers: Record<string, string> = {};
  const token = csrf();
  if (token) headers['X-CSRFToken'] = decodeURIComponent(token);
  const r = await fetch(`/backend/orgs/${orgId}/files/${fileId}/replace`, {method: 'POST', body: form, credentials: 'same-origin', headers});
  let body: any = null;
  try { body = await r.json(); } catch { /* not JSON */ }
  if (!r.ok) throw new ApiError(body?.detail || (r.status === 413 ? 'The file is too large' : `Replace failed (${r.status})`), r.status, body?.code);
  return body;
}

/** After creating a record in a form: upload the profile picture the user picked while filling it in.
 *  Returns an error message (the record itself was saved), or '' on success / when no file was chosen. */
export async function uploadPendingPhoto(entity: EntityType, id: number | string, file: File | null | undefined): Promise<string> {
  if (!file) return '';
  try {
    await uploadFiles(entity, id, [await shrinkPhoto(file)], {kind: 'profile'});
    return '';
  } catch (e: any) {
    return e?.message || 'The picture could not be uploaded';
  }
}
