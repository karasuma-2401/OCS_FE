import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../src/components/shop/contractCamera.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleObject = { exports: {} };
new Function('module', 'exports', compiled)(moduleObject, moduleObject.exports);
const { prepareCameraPhoto } = moduleObject.exports;

test('camera capture is resized, compressed and releases its object URL', async () => {
  const previous = { Image: globalThis.Image, document: globalThis.document, create: URL.createObjectURL, revoke: URL.revokeObjectURL };
  let revoked = false;
  let canvas;
  try {
    URL.createObjectURL = () => 'blob:test';
    URL.revokeObjectURL = value => { assert.equal(value, 'blob:test'); revoked = true; };
    globalThis.Image = class { naturalWidth = 4000; naturalHeight = 2000; set src(_) { queueMicrotask(() => this.onload()); } };
    globalThis.document = { createElement: () => (canvas = { getContext: () => ({ fillRect() {}, drawImage() {} }), toBlob: callback => callback(new Blob(['jpeg'], { type: 'image/jpeg' })) }) };
    const file = new File(['camera'], 'camera.jpg', { type: 'image/jpeg' });
    const result = await prepareCameraPhoto(file);
    assert.equal(result.type, 'image/jpeg');
    assert.equal(canvas.width, 2048);
    assert.equal(canvas.height, 1024);
    assert.ok(result.size <= 2 * 1024 * 1024);
    assert.ok(revoked);
  } finally {
    globalThis.Image = previous.Image; globalThis.document = previous.document;
    URL.createObjectURL = previous.create; URL.revokeObjectURL = previous.revoke;
  }
});

test('camera rejects invalid image types without opening them', async () => {
  await assert.rejects(() => prepareCameraPhoto(new File(['not an image'], 'photo.heic', { type: 'image/heic' })), /JPEG hoặc PNG/);
});
