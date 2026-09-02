const DOCUMENT_STORAGE_ROOT_NAME = 'document-storage';

const KNOWN_ORGANIZATION_FOLDERS = {
  lobo: 'lobo',
  'company-a': 'lobo',
  tim: 'timothys-toolbox',
  timothy: 'timothys-toolbox',
  'timothys-toolbox': 'timothys-toolbox',
  'company-b': 'timothys-toolbox',
};

const MIME_EXTENSIONS = {
  'application/pdf': 'pdf',
  'text/html': 'html',
  'text/plain': 'txt',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
};

const invalidPathCharacters = /[<>:"/\\|?*]/g;

export const getDocumentStorageRootName = () => DOCUMENT_STORAGE_ROOT_NAME;

export const sanitizePathSegment = (value, fallback = 'unknown') => {
  const cleaned = String(value ?? '')
    .trim()
    .split('')
    .filter(character => character.charCodeAt(0) >= 32)
    .join('')
    .replace(invalidPathCharacters, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[. -]+|[. -]+$/g, '')
    .toLowerCase();
  return cleaned || fallback;
};

export const getOrganizationStorageFolder = (orgKey) => {
  const normalized = sanitizePathSegment(orgKey, 'organization');
  if (KNOWN_ORGANIZATION_FOLDERS[normalized]) {
    return KNOWN_ORGANIZATION_FOLDERS[normalized];
  }
  if (normalized.includes('lobo')) return 'lobo';
  if (normalized.includes('tim')) return 'timothys-toolbox';
  return normalized;
};

const getBusinessYear = (businessDate) => {
  const match = String(businessDate ?? '').match(/^(\d{4})-/);
  if (match) return match[1];
  const parsed = new Date(businessDate);
  if (!Number.isNaN(parsed.getTime())) return String(parsed.getFullYear());
  throw new Error('A valid PO or invoice business date is required before storing a document.');
};

const ensurePermission = async (rootHandle, mode = 'readwrite', requestIfNeeded = true) => {
  if (!rootHandle) {
    throw new Error('Connect the document-storage root in Settings before uploading documents.');
  }

  const permissionOptions = { mode };
  if (typeof rootHandle.queryPermission === 'function') {
    const existing = await rootHandle.queryPermission(permissionOptions);
    if (existing === 'granted') return;
  }
  if (requestIfNeeded && typeof rootHandle.requestPermission === 'function') {
    const requested = await rootHandle.requestPermission(permissionOptions);
    if (requested === 'granted') return;
  }
  throw new Error('Permission to the document-storage root is required. Reconnect it in Settings.');
};

const getOrCreateDirectory = async (parentHandle, name) =>
  parentHandle.getDirectoryHandle(name, { create: true });

const walkDirectories = async (rootHandle, segments, create = false) => {
  let current = rootHandle;
  for (const segment of segments) {
    current = await current.getDirectoryHandle(segment, create ? { create: true } : undefined);
  }
  return current;
};

const writeFile = async (directoryHandle, fileName, contents) => {
  const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(contents);
  await writable.close();
};

const extensionFor = (file) => {
  const existing = String(file.name || '').match(/\.([a-z0-9]{1,10})$/i)?.[1];
  return existing?.toLowerCase() || MIME_EXTENSIONS[file.type] || 'bin';
};

const checksumSha256 = async (file) => {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
};

const dataUrlToBlob = (dataUrl) => {
  const [header, encoded] = String(dataUrl).split(',');
  const mimeType = header?.match(/^data:([^;]+);base64$/)?.[1];
  if (!mimeType || !encoded) throw new Error('The stored company logo is not a valid image.');
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
};

const normalizeLogoBlob = (logo) => {
  if (!logo) return null;
  if (logo instanceof Blob) return logo;
  if (typeof logo === 'string' && logo.startsWith('data:')) return dataUrlToBlob(logo);
  throw new Error('The company logo format is not supported.');
};

export const initializeDocumentStorageRoot = async (rootHandle) => {
  await ensurePermission(rootHandle);
  for (const organization of ['lobo', 'timothys-toolbox']) {
    const organizationHandle = await getOrCreateDirectory(rootHandle, organization);
    await getOrCreateDirectory(organizationHandle, 'customers');
    await getOrCreateDirectory(organizationHandle, 'vendors');
    await getOrCreateDirectory(organizationHandle, 'company-profile');
  }
};

export const storeCompanyProfile = async ({ rootHandle, orgKey, profile, logo }) => {
  await ensurePermission(rootHandle);
  const organization = getOrganizationStorageFolder(orgKey);
  const directory = await walkDirectories(rootHandle, [organization, 'company-profile'], true);
  const storedAt = new Date().toISOString();
  const logoBlob = normalizeLogoBlob(logo);
  let logoMetadata = null;

  if (logoBlob) {
    const extension = extensionFor(logoBlob);
    const storedName = `logo.${extension}`;
    await writeFile(directory, storedName, logoBlob);
    logoMetadata = {
      originalName: logoBlob.name || storedName,
      storedName,
      mimeType: logoBlob.type || 'application/octet-stream',
      size: logoBlob.size,
      lastModified: logoBlob.lastModified || null,
      checksumSha256: await checksumSha256(logoBlob),
    };
  }

  const payload = {
    schemaVersion: 1,
    organization,
    profile: profile || {},
    logo: logoMetadata,
    updatedAt: storedAt,
  };
  await writeFile(
    directory,
    'profile.json',
    new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
  );
  return payload;
};

export const readCompanyProfile = async ({ rootHandle, orgKey }) => {
  await ensurePermission(rootHandle, 'read', false);
  const organization = getOrganizationStorageFolder(orgKey);
  try {
    const directory = await walkDirectories(rootHandle, [organization, 'company-profile'], false);
    const profileHandle = await directory.getFileHandle('profile.json');
    const profileFile = await profileHandle.getFile();
    const payload = JSON.parse(await profileFile.text());
    let logo = null;
    if (payload.logo?.storedName) {
      try {
        const logoHandle = await directory.getFileHandle(payload.logo.storedName);
        logo = await logoHandle.getFile();
      } catch (logoError) {
        if (logoError?.name !== 'NotFoundError') throw logoError;
      }
    }
    return { ...payload, profile: payload.profile || {}, logo };
  } catch (error) {
    if (error?.name === 'NotFoundError') return null;
    throw error;
  }
};

export const storeDocumentFile = async ({
  rootHandle,
  orgKey,
  partyType,
  partyId,
  partyName,
  businessDate,
  direction,
  documentType,
  recordId,
  recordLabel,
  area = 'originals',
  file,
  metadata = {},
}) => {
  await ensurePermission(rootHandle);
  if (!(file instanceof Blob)) throw new Error('A valid document file is required.');
  if (!['customers', 'vendors'].includes(partyType)) throw new Error('Document party type must be customers or vendors.');
  if (!['incoming', 'outgoing'].includes(direction)) throw new Error('Document direction must be incoming or outgoing.');

  const organizationFolder = getOrganizationStorageFolder(orgKey);
  const partyFolder = `${sanitizePathSegment(partyName, partyType.slice(0, -1))}--${sanitizePathSegment(partyId, 'unassigned')}`;
  const year = getBusinessYear(businessDate);
  const recordFolder = `${sanitizePathSegment(recordLabel, documentType)}--${sanitizePathSegment(recordId, 'record')}`;
  const safeArea = sanitizePathSegment(area, 'originals');
  const extension = extensionFor(file);
  const baseName = String(file.name || `${documentType}.${extension}`).replace(/\.[^.]+$/, '');
  const fileName = `${sanitizePathSegment(baseName, documentType)}.${extension}`;
  const directorySegments = [
    organizationFolder,
    partyType,
    partyFolder,
    year,
    direction,
    sanitizePathSegment(documentType, 'documents'),
    recordFolder,
    safeArea,
  ];
  const directoryHandle = await walkDirectories(rootHandle, directorySegments, true);
  await writeFile(directoryHandle, fileName, file);

  const storedAt = new Date().toISOString();
  const checksum = await checksumSha256(file);
  const relativePath = [...directorySegments, fileName].join('/');
  const recordDirectorySegments = directorySegments.slice(0, -1);
  const manifest = {
    schemaVersion: 1,
    organization: organizationFolder,
    party: { type: partyType, id: partyId, name: partyName },
    businessDate,
    year,
    direction,
    documentType,
    record: { id: recordId, label: recordLabel },
    file: {
      area: safeArea,
      originalName: file.name || fileName,
      storedName: fileName,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified || null,
      checksumSha256: checksum,
      relativePath,
    },
    sourceMetadata: metadata,
    storedAt,
  };
  const recordDirectory = await walkDirectories(rootHandle, recordDirectorySegments, true);
  await writeFile(
    recordDirectory,
    'record.json',
    new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
  );

  return {
    storageVersion: 1,
    relativePath,
    manifestPath: [...recordDirectorySegments, 'record.json'].join('/'),
    routing: {
      organization: organizationFolder,
      partyType,
      partyId,
      businessDate,
      direction,
      documentType,
      recordId,
      recordLabel,
      area: safeArea,
    },
    originalName: file.name || fileName,
    storedName: fileName,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    lastModified: file.lastModified || null,
    checksumSha256: checksum,
    storedAt,
  };
};

export const getStoredDocumentFile = async (rootHandle, storageReference) => {
  await ensurePermission(rootHandle, 'read');
  const path = storageReference?.relativePath;
  if (!path) throw new Error('This record does not contain a document-storage path.');
  const segments = path.split('/').filter(Boolean);
  const fileName = segments.pop();
  const directoryHandle = await walkDirectories(rootHandle, segments, false);
  const fileHandle = await directoryHandle.getFileHandle(fileName);
  return fileHandle.getFile();
};
