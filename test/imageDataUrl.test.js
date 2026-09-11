import test from 'node:test';
import assert from 'node:assert/strict';

import { blobToDataUrl, imageToDataUrl } from '../src/utils/imageDataUrl.js';

test('uses an imported image data URL without passing it to FileReader', async () => {
  const importedLogo = 'data:image/png;base64,bG9nbw==';
  assert.equal(await imageToDataUrl(importedLogo), importedLogo);
});

test('ignores absent and unsupported logo values', async () => {
  assert.equal(await imageToDataUrl(null), null);
  assert.equal(await imageToDataUrl('https://example.com/logo.png'), null);
  assert.equal(await imageToDataUrl({ data: 'not-a-blob' }), null);
});

test('converts uploaded Blob logos with FileReader', async () => {
  const OriginalFileReader = globalThis.FileReader;

  class TestFileReader {
    readAsDataURL(value) {
      assert.ok(value instanceof Blob);
      this.result = 'data:image/png;base64,dXBsb2FkZWQ=';
      this.onloadend();
    }
  }

  globalThis.FileReader = TestFileReader;
  try {
    const logo = new Blob(['uploaded'], { type: 'image/png' });
    assert.equal(await imageToDataUrl(logo), 'data:image/png;base64,dXBsb2FkZWQ=');
  } finally {
    if (OriginalFileReader === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = OriginalFileReader;
  }
});

test('converts non-image Blob documents for browser storage', async () => {
  const OriginalFileReader = globalThis.FileReader;

  class TestFileReader {
    readAsDataURL(value) {
      assert.equal(value.type, 'application/pdf');
      this.result = 'data:application/pdf;base64,cGRm';
      this.onloadend();
    }
  }

  globalThis.FileReader = TestFileReader;
  try {
    const pdf = new Blob(['pdf'], { type: 'application/pdf' });
    assert.equal(await blobToDataUrl(pdf), 'data:application/pdf;base64,cGRm');
  } finally {
    if (OriginalFileReader === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = OriginalFileReader;
  }
});

test('returns null when FileReader rejects or throws', async () => {
  const OriginalFileReader = globalThis.FileReader;

  class FailingFileReader {
    readAsDataURL() {
      throw new TypeError('conversion failed');
    }
  }

  globalThis.FileReader = FailingFileReader;
  try {
    assert.equal(await imageToDataUrl(new Blob(['bad'])), null);
  } finally {
    if (OriginalFileReader === undefined) delete globalThis.FileReader;
    else globalThis.FileReader = OriginalFileReader;
  }
});
