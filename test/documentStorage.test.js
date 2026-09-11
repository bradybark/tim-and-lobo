import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getStoredDocumentFile,
  hasDocumentStoragePermission,
  getOrganizationDocumentStoragePath,
  initializeDocumentStorageRoot,
  isDocumentStorageRootName,
  readCompanyProfile,
  storeCompanyProfile,
  storeDocumentFile,
} from '../src/utils/documentStorage.js';

class MemoryFileHandle {
  constructor(name) {
    this.name = name;
    this.contents = new Blob();
  }

  async createWritable() {
    return {
      write: async contents => { this.contents = contents instanceof Blob ? contents : new Blob([contents]); },
      close: async () => {},
    };
  }

  async getFile() {
    return new File([this.contents], this.name, { type: this.contents.type });
  }
}

class MemoryDirectoryHandle {
  constructor(name) {
    this.name = name;
    this.directories = new Map();
    this.files = new Map();
  }

  async queryPermission() { return 'granted'; }
  async requestPermission() { return 'granted'; }

  async getDirectoryHandle(name, options = {}) {
    if (!this.directories.has(name)) {
      if (!options.create) throw Object.assign(new Error('Missing directory'), { name: 'NotFoundError' });
      this.directories.set(name, new MemoryDirectoryHandle(name));
    }
    return this.directories.get(name);
  }

  async getFileHandle(name, options = {}) {
    if (!this.files.has(name)) {
      if (!options.create) throw Object.assign(new Error('Missing file'), { name: 'NotFoundError' });
      this.files.set(name, new MemoryFileHandle(name));
    }
    return this.files.get(name);
  }
}

test('initializes both organizations under one shared root', async () => {
  const root = new MemoryDirectoryHandle('document-storage');
  await initializeDocumentStorageRoot(root);

  for (const organization of ['lobo', 'timothys-toolbox']) {
    const organizationDirectory = await root.getDirectoryHandle(organization);
    await organizationDirectory.getDirectoryHandle('customers');
    await organizationDirectory.getDirectoryHandle('vendors');
    await organizationDirectory.getDirectoryHandle('company-profile');
  }
});

test('describes the organization-relative destination beneath the selected root', () => {
  assert.equal(
    getOrganizationDocumentStoragePath({ name: 'document-storage' }, 'lobo'),
    'document-storage/lobo',
  );
  assert.equal(
    getOrganizationDocumentStoragePath({ name: 'document-storage' }, 'timothy'),
    'document-storage/timothys-toolbox',
  );
});

test('requires the shared root folder name exactly', async () => {
  assert.equal(isDocumentStorageRootName('document-storage'), true);
  assert.equal(isDocumentStorageRootName('Document-Storage'), false);
  await assert.rejects(
    initializeDocumentStorageRoot(new MemoryDirectoryHandle('Document-Storage')),
    /named exactly document-storage/i,
  );
});

test('checks saved root permission without requesting it', async () => {
  let requestCount = 0;
  const promptHandle = {
    queryPermission: async () => 'prompt',
    requestPermission: async () => { requestCount += 1; return 'granted'; },
  };
  const grantedHandle = {
    queryPermission: async () => 'granted',
    requestPermission: async () => { requestCount += 1; return 'granted'; },
  };

  assert.equal(await hasDocumentStoragePermission(promptHandle), false);
  assert.equal(await hasDocumentStoragePermission(grantedHandle), true);
  assert.equal(requestCount, 0);
});

test('stores and reads a permanent company profile with its original logo type', async () => {
  const root = new MemoryDirectoryHandle('document-storage');
  const logo = new File(['logo-bytes'], 'lobo-logo.png', { type: 'image/png', lastModified: 123 });
  await storeCompanyProfile({
    rootHandle: root,
    orgKey: 'company-a',
    profile: { companyName: 'Lobo Tool Company', phone: '555-0100' },
    logo,
  });

  const stored = await readCompanyProfile({ rootHandle: root, orgKey: 'lobo' });
  assert.equal(stored.organization, 'lobo');
  assert.equal(stored.profile.companyName, 'Lobo Tool Company');
  assert.equal(stored.logo.name, 'logo.png');
  assert.equal(stored.logo.type, 'image/png');
  assert.equal(await stored.logo.text(), 'logo-bytes');
});

test('routes a customer PDF by organization, customer, year, direction, and record', async () => {
  const root = new MemoryDirectoryHandle('document-storage');
  const pdf = new File(['pdf-bytes'], 'Invoice Final.PDF', { type: 'application/pdf' });
  const reference = await storeDocumentFile({
    rootHandle: root,
    orgKey: 'company-a',
    partyType: 'customers',
    partyId: 42,
    partyName: 'Tool Source - Lenexa, KS',
    businessDate: '2026-08-28',
    direction: 'outgoing',
    documentType: 'invoices',
    recordId: 99,
    recordLabel: '00041-010',
    area: 'final',
    file: pdf,
    metadata: { purchaseOrderNumber: '520978-00' },
  });

  assert.equal(
    reference.relativePath,
    'lobo/customers/tool-source-lenexa,-ks--42/2026/outgoing/invoices/00041-010--99/final/invoice-final.pdf',
  );
  const restored = await getStoredDocumentFile(root, reference);
  assert.equal(restored.type, 'application/pdf');
  assert.equal(await restored.text(), 'pdf-bytes');

  const recordParts = reference.manifestPath.split('/');
  const recordName = recordParts.pop();
  let recordDirectory = root;
  for (const part of recordParts) recordDirectory = await recordDirectory.getDirectoryHandle(part);
  const recordFile = await (await recordDirectory.getFileHandle(recordName)).getFile();
  const manifest = JSON.parse(await recordFile.text());
  assert.equal(manifest.sourceMetadata.purchaseOrderNumber, '520978-00');
  assert.equal(manifest.file.relativePath, reference.relativePath);
});

test('refuses storage without a valid business date or connected root', async () => {
  const root = new MemoryDirectoryHandle('document-storage');
  const pdf = new File(['pdf'], 'invoice.pdf', { type: 'application/pdf' });
  const baseRequest = {
    rootHandle: root,
    orgKey: 'lobo',
    partyType: 'customers',
    partyId: 1,
    partyName: 'Customer',
    direction: 'outgoing',
    documentType: 'invoices',
    recordId: 1,
    recordLabel: '001',
    file: pdf,
  };

  await assert.rejects(
    storeDocumentFile({ ...baseRequest, businessDate: '' }),
    /valid PO or invoice business date/i,
  );
  await assert.rejects(
    storeDocumentFile({ ...baseRequest, rootHandle: null, businessDate: '2026-01-01' }),
    /connect the document-storage root/i,
  );
});
