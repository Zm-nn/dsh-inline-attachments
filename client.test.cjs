const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const filename = path.join(__dirname, 'client.js');
let source = fs.readFileSync(filename, 'utf8');
const marker = "    return {\n      inject: ['slots', 'sessions', 'locale', 'inputTriggers'],";
assert.ok(source.includes(marker), 'test export marker must match the client module');
source = source.replace(marker, `    globalThis.__inlineAttachmentsTest = { InlineAttachments, UserMessageView, HistoryEditActions, SentAttachment, PreviewOverlay, DurableAttachmentImage, modelFor, referencePath, previewPlacement, contentParts, positionMarker, restoreOrderedPayload, decodePayload, syncComposerChipNumbers, syncAttachmentNumbers, watchComposerChipNumbers, writeClipboard, payloadFromClipboard, readHistoricalAttachment };\n${marker}`);

const effects = [];
const React = {
  Fragment: Symbol('Fragment'),
  createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useRef: (current) => ({ current }),
  useCallback: (callback) => callback,
  useMemo: (factory) => factory(),
  useSyncExternalStore: (subscribe, getSnapshot) => getSnapshot(),
  useEffect: (effect) => { effects.push(effect); },
  useLayoutEffect: (effect) => { effects.push(effect); }
};

let definition;
const sandbox = {
  console,
  TextDecoder,
  TextEncoder,
  atob: (value) => Buffer.from(value, 'base64').toString('binary'),
  btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
  document: { body: { nodeType: 1 }, addEventListener() {}, removeEventListener() {} },
  window: {
    __ModuleLoader__: {
      load(value) { definition = value; }
    }
  }
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename });
assert.equal(definition.id, 'dsh-inline-attachments');
const plugin = definition.factory((id) => {
  if (id === 'react') return React;
  if (id === 'react-dom') return {
    createPortal: (node, container) => ({ type: 'portal', children: [node], container })
  };
  if (id === '@deepseek-ai/dsh-client-ui-primitives') return { FileTypeIcon: 'FileTypeIcon', JsonBlock: 'JsonBlock' };
  throw new Error(`Unexpected module: ${id}`);
});
assert.deepEqual(Array.from(plugin.inject), ['slots', 'sessions', 'locale', 'inputTriggers']);
let registeredAttachmentSource;
plugin.apply({
  sessions: {},
  locale: { register() { return () => {}; } },
  slots: { inject() { return () => {}; } },
  inputTriggers: { registerSource(source) { registeredAttachmentSource = source; return () => {}; } },
  effect(effect, description) {
    if (description === 'inline-attachments: attachment references') effect();
    return () => {};
  }
});
assert.equal(registeredAttachmentSource.name, 'inline-attachment');

const { InlineAttachments, UserMessageView, HistoryEditActions, SentAttachment, PreviewOverlay, DurableAttachmentImage, modelFor, referencePath, previewPlacement, contentParts, positionMarker, restoreOrderedPayload, decodePayload, syncComposerChipNumbers, syncAttachmentNumbers, watchComposerChipNumbers, writeClipboard, payloadFromClipboard, readHistoricalAttachment } = sandbox.__inlineAttachmentsTest;

assert.equal(referencePath({ ref: '@逻辑实体_20260910.xlsx' }, '/workspace/root'), '/workspace/root/逻辑实体_20260910.xlsx');
assert.equal(referencePath({ ref: '@/Users/zm/Desktop/report.xlsx' }, '/workspace/root'), '/Users/zm/Desktop/report.xlsx');
assert.equal(referencePath({ ref: '@"/Users/zm/Desktop/a b.xlsx"' }, '/workspace/root'), '/Users/zm/Desktop/a b.xlsx');
sandbox.window.innerHeight = 800;
assert.equal(previewPlacement({ top: 600, bottom: 630 }, true).openAbove, true, 'a low composer chip should open its preview above');
assert.equal(previewPlacement({ top: 100, bottom: 130 }, true).openAbove, false, 'a high chip should open its preview below');

const factoryCalls = [];
// Match the real Host payload: durable attachments first, then the serialized
// text. The two markers must put those attachments back between the text runs.
const sentContent = [
  { type: 'image', attachment: { attachmentId: 'image-1', name: '第一张.png', mediaType: 'image/png' } },
  { type: 'file', attachment: { attachmentId: 'file-1', name: 'report.xlsx', bytes: 20 } },
  { type: 'text', text: `你好，${positionMarker('draft-0', { number: 1, kind: 'image', name: '第一张.png' })}你好${positionMarker('draft-1', { number: 2, kind: 'file', name: 'report.xlsx' })}` }
];
const durableHovers = [];
const durableLightboxes = [];
const sentPreview = {
  hoverAttachment(...args) { durableHovers.push(args); },
  lightboxAttachment(...args) { durableLightboxes.push(args); },
  scheduleClose() {}
};
const sent = UserMessageView({
  node: { data: { seq: 8, time: 1, content: sentContent } },
  sessionId: 'session-1', copyCache: { current: null }, t: (key) => key, preview: sentPreview,
  loadImage: async () => 'blob:history',
  renderFactorySlot(name, input) { factoryCalls.push({ name, input }); return { name, input }; }
});
const sentBubble = sent.children[0];
assert.equal(sentBubble.props.className, 'dsh-ia-bubble', 'sent attachments and text must share one bubble');
const inlineItems = sentBubble.children[0];
assert.equal(inlineItems.length, 4, 'text and attachments must retain their original content-block count');
assert.equal(inlineItems[0].props.className, 'dsh-ia-message-text');
assert.equal(inlineItems[2].props.className, 'dsh-ia-message-text');
const renderedChips = [inlineItems[1], inlineItems[3]].map((chip) => chip.type(chip.props));
assert.deepEqual([inlineItems[1].props.number, inlineItems[3].props.number], [1, 2], 'visible chips must use Host attachment-order numbers');
assert.deepEqual(renderedChips.map((rendered) => rendered.children[1].children[0]), ['image1.png', 'file2.xlsx']);
for (const rendered of renderedChips) {
  assert.ok(rendered.props.className.startsWith('dsh-ia-sent-chip'));
  assert.equal(rendered.children[0].type, 'FileTypeIcon', 'images and files must both use compact type icons, never sent thumbnails');
  assert.equal(rendered.children[0].props.size, 18);
  assert.ok(!source.includes('SentAttachmentImage'), 'the sent-image thumbnail renderer must be removed');
}
const sentImageChip = inlineItems[1].type(inlineItems[1].props);
assert.equal(sentImageChip.props.role, 'button', 'sent images must remain compact chips with button semantics');
sentImageChip.props.onMouseEnter({ currentTarget: { getBoundingClientRect: () => ({ left: 20, top: 30, bottom: 60 }) } });
assert.equal(durableHovers.length, 1, 'hovering a sent image must open the durable-attachment preview');
assert.equal(durableHovers[0][1].type, 'image');
assert.deepEqual({ ...durableHovers[0][3] }, { left: 20, top: 30, bottom: 60 });
sentImageChip.props.onClick();
assert.equal(durableLightboxes.length, 1, 'clicking a sent image chip must open its lightbox');
assert.equal(durableLightboxes[0][1].image.attachment.name, '第一张.png');
assert.deepEqual(factoryCalls.map((call) => call.input.text), ['你好，', '你好'], 'text segments must render at their original positions around attachments');
assert.ok(factoryCalls.every((call) => call.name === 'conversation.user.text'), 'the native inline text/reference renderer must be preserved');
assert.ok(factoryCalls.every((call) => call.name !== 'conversation.chat.user.content'), 'the native separate attachment rail must not render');
const parsedSent = contentParts(sentContent);
assert.equal(parsedSent.text, '你好，你好', 'internal position markers must not leak into copied text');
assert.deepEqual(Array.from(parsedSent.ordered, (item) => item.type), ['text', 'attachment', 'text', 'attachment']);
assert.equal(parsedSent.ordered[1].attachment.image.attachment.name, '第一张.png');
assert.equal(parsedSent.ordered[3].attachment.file.name, 'report.xlsx');
assert.equal(parsedSent.ordered.filter((item) => item.type === 'attachment').length, 2, 'Host-prefixed attachments must not render a second time');
const parsedHostInterleaved = contentParts([
  { type: 'text', text: '你好，' }, { type: 'text', text: '【image1.png】' }, sentContent[0],
  { type: 'text', text: '你好' }, { type: 'text', text: '【file2.xlsx】' }, sentContent[1]
]);
assert.equal(parsedHostInterleaved.text, '你好，你好', 'Host captions must not leak into the bubble or copied text');
assert.deepEqual(Array.from(parsedHostInterleaved.ordered, (item) => item.type), ['text', 'attachment', 'text', 'attachment'], 'numbered Host captions must collapse into their existing adjacent attachments');
assert.equal(sentContent[2].text, '你好，【图片1：第一张.png】你好【文件2：report.xlsx】', 'the model-facing text must contain readable names and attachment-order numbers');
const legacyParsed = contentParts([
  { type: 'image', attachment: { attachmentId: 'legacy-image', mediaType: 'image/png' } },
  { type: 'text', text: '旧文字\uE000inline-attachment:legacy-draft\uE001仍兼容' }
]);
assert.equal(legacyParsed.text, '旧文字仍兼容', 'legacy private markers must still be removed');
assert.deepEqual(Array.from(legacyParsed.ordered, (item) => item.type), ['text', 'attachment', 'text']);
const copiedPayload = sent.children[2].children[2].props.payload;
assert.deepEqual(Array.from(copiedPayload.ordered, (item) => item.type), ['text', 'attachment', 'text', 'attachment'], 'copy and edit must carry the inline order');
const decodedPayload = decodePayload(Buffer.from(JSON.stringify(copiedPayload), 'utf8').toString('base64'));
assert.deepEqual(Array.from(decodedPayload.ordered, (item) => item.type), ['text', 'attachment', 'text', 'attachment'], 'HTML clipboard decoding must retain the inline order');
const runningSent = UserMessageView({
  // Even an old, closed Turn must be non-editable while another Turn is active.
  node: { data: { seq: 8, time: 1, content: sentContent }, location: { kind: 'turn', turn: { status: 'closed' } } },
  sessionId: 'session-1', copyCache: { current: null }, t: (key) => key, preview: sentPreview,
  useSession: (selector) => selector({ running: true }),
  loadImage: async () => 'blob:history', renderFactorySlot() { return null; }
});
assert.equal(runningSent.children[2].children[2], null, 'every historical message must hide edit actions while the Session is running');
assert.equal(sent.children[2].children[2].type, HistoryEditActions, 'a settled Session must keep edit actions on historical messages');
const restoreOperations = [];
let restoreRevision = 0;
let restoredDraft = null;
const restoreAttachmentIds = [];
const restoreKeyboard = {
  get snapshot() { return { draftRev: restoreRevision, attachmentIds: [...restoreAttachmentIds], draft: '', occurrences: [] }; },
  caretSpan() { return { start: 0, end: 0 }; },
  addAttachments(ids) {
    restoreOperations.push(`add:${ids.join(',')}`);
    restoreAttachmentIds.push(...ids);
    restoreRevision += 1;
    return true;
  },
  setDraft(draft) {
    restoredDraft = draft;
    restoreOperations.push('setDraft');
    restoreRevision += 1;
  }
};
const restoredCount = restoreOrderedPayload(copiedPayload, [
  { id: 'restored-image', kind: 'image', file: { name: '第一张.png', size: 10 } },
  { id: 'restored-file', kind: 'file', file: { name: 'report.xlsx', size: 20 } }
], restoreKeyboard, modelFor(restoreKeyboard), (key) => key);
assert.equal(restoredCount, 2);
assert.deepEqual(restoreOperations, ['add:restored-image,restored-file', 'setDraft'], 'restoration must add the batch and commit one complete semantic draft');
assert.equal(restoredDraft.text, '你好，第一张.png你好report.xlsx');
assert.deepEqual(Array.from(restoredDraft.references, (reference) => reference.ref), ['restored-image', 'restored-file'], 'every restored chip must retain a distinct semantic occurrence');
assert.deepEqual(Array.from(restoredDraft.references, (reference) => reference.offset), [3, 12], 'reference offsets must match the restored text positions');
assert.ok(restoredDraft.references.every((reference) => reference.length === reference.clipboardText.length), 'the semantic draft must satisfy the Host reference contract');
let durablePreviewState = {
  kind: 'hover', sessionId: 'session-1', id: 'image-1',
  attachment: parsedSent.ordered[1].attachment,
  loadImage: async () => 'blob:history',
  anchor: { left: 20, top: 30, bottom: 60 }
};
const durablePreviewStore = {
  subscribe() {}, getSnapshot: () => durablePreviewState,
  cancelClose() {}, scheduleClose() {}, close() {},
  lightboxAttachment(...args) { durableLightboxes.push(args); }
};
const durablePreviewProps = {
  preview: durablePreviewStore, keyboard: {}, model: {},
  conversation: {
    fileUploads: { subscribe() {}, getSnapshot: () => ({}) },
    resolveDraftAttachments() { throw new Error('durable previews must not resolve composer drafts'); }
  },
  useInput: (selector) => selector({ attachmentIds: [] }),
  sessionId: 'session-1', cwd: '', t: (key) => key
};
const durableHoverPortal = PreviewOverlay(durablePreviewProps);
assert.equal(durableHoverPortal.type, 'portal', 'sent previews must render outside the composer stacking and clipping context');
assert.equal(durableHoverPortal.container, sandbox.document.body, 'the preview portal must target the document body');
const durableHoverCard = durableHoverPortal.children[0];
assert.equal(durableHoverCard.props.className, 'dsh-ia-preview');
assert.equal(durableHoverCard.children[1].children[0].type, DurableAttachmentImage, 'the sent hover card must load the durable image');
assert.equal(durableHoverCard.children[5], null, 'sent attachments must not expose draft removal actions');
durableHoverCard.children[1].props.onClick();
assert.equal(durableLightboxes.length, 2, 'the hover thumbnail must also open the lightbox');
durablePreviewState = { ...durablePreviewState, kind: 'lightbox' };
const durableLightboxPortal = PreviewOverlay(durablePreviewProps);
assert.equal(durableLightboxPortal.type, 'portal', 'the lightbox must leave the composer so inset zeros match the viewport');
assert.equal(durableLightboxPortal.container, sandbox.document.body);
const durableLightbox = durableLightboxPortal.children[0];
assert.equal(durableLightbox.props.className, 'dsh-ia-lightbox');
assert.equal(durableLightbox.children[2].type, DurableAttachmentImage, 'the lightbox must load the durable image through the Chat image loader');
effects.length = 0;

const attachments = [
  { id: 'image-1', kind: 'image', file: { name: 'first.png', size: 10 }, previewUrl: 'blob:first' },
  { id: 'image-2', kind: 'image', file: { name: 'second.png', size: 20 }, previewUrl: 'blob:second' }
];
const composerChips = ['first.png', 'second.png', 'third.png'].map((title) => ({
  title,
  display: null,
  getAttribute(name) { return name === 'title' ? this.title : null; },
  setAttribute(name, value) { if (name === 'data-dsh-ia-display') this.display = value; },
  removeAttribute(name) { if (name === 'data-dsh-ia-display') this.display = null; }
}));
const composerOccurrences = [
  { source: 'inline-attachment', ref: 'image-1', label: 'first.png', offset: 0 },
  { source: 'inline-attachment', ref: 'image-2', label: 'second.png', offset: 10 },
  { source: 'native-file', ref: 'third', label: 'third.png', appearance: 'file', occurrenceId: 'native-3', offset: 20 }
];
const composerAttachments = [...attachments, { id: 'image-3', kind: 'image', file: { name: 'third.png', size: 30 } }];
syncComposerChipNumbers({ querySelectorAll: () => composerChips }, { occurrences: composerOccurrences }, composerAttachments);
assert.deepEqual(composerChips.map((chip) => chip.display), ['image1.png', 'image2.png', 'image3.png'], 'custom and native composer chips must all show short ASCII names');
syncAttachmentNumbers([attachments[1]], (key) => key, ['image-2']);
syncComposerChipNumbers({ querySelectorAll: () => [composerChips[1]] }, { occurrences: [composerOccurrences[1]], attachmentIds: ['image-2'] }, [attachments[1]]);
assert.equal(composerChips[1].display, 'image1.png', 'composer numbering must be recalculated after an earlier attachment is removed');

let mutationCallback = null;
let observedOptions = null;
let observerDisconnected = false;
sandbox.MutationObserver = class {
  constructor(callback) { mutationCallback = callback; }
  observe(_root, options) { observedOptions = options; }
  disconnect() { observerDisconnected = true; }
};
const lateChips = [];
const lateOccurrences = [];
const lateAttachments = [];
let liveLateInput = { occurrences: lateOccurrences };
const stopWatching = watchComposerChipNumbers(
  { querySelectorAll: () => lateChips },
  () => liveLateInput,
  lateAttachments
);
for (let index = 0; index < 3; index += 1) {
  lateChips.push(composerChips[index]);
  lateOccurrences.push(composerOccurrences[index]);
  lateAttachments.push(composerAttachments[index]);
  // Replace the snapshot to prove the observer does not use a stale closure.
  liveLateInput = { occurrences: lateOccurrences };
  mutationCallback(); // Simulate Lexical adding each chip after the initial render.
}
assert.deepEqual(lateChips.map((chip) => chip.display), ['image1.png', 'image2.png', 'image3.png'], 'a late third Lexical chip must be numbered in the same mutation turn');
assert.deepEqual({ ...observedOptions }, { childList: true, subtree: true, characterData: true });
stopWatching();
assert.equal(observerDisconnected, true, 'the DOM observer must be disposed with the editor listener');

const input = {
  phase: 'plain',
  draft: '',
  draftRev: 0,
  occurrences: [],
  attachmentIds: attachments.map((attachment) => attachment.id)
};
let revision = 0;
const insertions = [];
const keyboard = {
  editor: { getRootElement: () => null },
  caretSpan: () => ({ start: 0, end: 0 }),
  get snapshot() { return { ...input, draftRev: revision }; },
  insertReference(reference, span) {
    insertions.push({ reference, span });
    if (span.draftRev !== revision) return false;
    revision += 1;
    input.occurrences = [...input.occurrences, {
      occurrenceId: revision,
      source: reference.source,
      ref: reference.ref,
      label: reference.label,
      appearance: reference.appearance,
      offset: 0
    }];
    return true;
  },
  setDraft() { throw new Error('no draft removal expected'); }
};
const model = modelFor(keyboard);
const props = {
  attachments,
  keyboard,
  model,
  preview: {},
  useInput: (selector) => selector(input),
  inputActions: {},
  onAddFiles() {},
  onRemoveAttachment() { throw new Error('no attachment removal expected'); },
  canAcceptDrop: false,
  restorePayload: async () => 0,
  copyCache: { current: null },
  t: (key) => key,
  sessionId: 'session-1'
};

InlineAttachments(props);
assert.equal(effects.length, 4, 'the component should install notice cleanup, synchronization, drop, and editor effects');
effects[1]();

assert.equal(insertions.length, 2, 'both pasted images should request an inline reference');
assert.deepEqual(insertions.map((call) => call.span.draftRev), [0, 1], 'each insertion must use the latest draft revision');
assert.deepEqual(insertions.map((call) => call.reference.ref), ['image-1', 'image-2']);
assert.ok(insertions.every((call) => call.reference.source === 'inline-attachment'));
assert.equal(model.mappings.size, 2, 'accepted image references must remain mapped to their attachments');

const refreshedInput = { ...input, draftRev: revision };
effects.length = 0;
InlineAttachments({ ...props, useInput: (selector) => selector(refreshedInput) });
effects[1]();
assert.equal(insertions.length, 2, 'the committed references must not be inserted twice');
assert.deepEqual(Array.from(model.mappings.values(), (mapping) => mapping.pending), [false, false], 'the second render should reconcile both references without removing them');
const composerWithPreview = InlineAttachments({ ...props, conversation: {}, cwd: '' });
assert.equal(composerWithPreview.children[2].type, PreviewOverlay, 'the preview overlay must use the composer conversation context directly');
assert.equal(composerWithPreview.children[2].props.preview, props.preview, 'the composer and message renderer must share the same preview store');
assert.ok(!source.includes("ctx.slots.inject('shell.overlay'"), 'preview rendering must not depend on the shared shell overlay registration');
console.log('pasted image inline-reference regression test OK');

async function verifyHistoryEditActions() {
  assert.equal(await registeredAttachmentSource.codec.serialize('draft 0'), positionMarker('draft 0'), 'submission must preserve the exact inline attachment marker');
  assert.equal(await registeredAttachmentSource.codec.serialize('image-1'), '【图片1：first.png】', 'the first attachment must expose its readable name and Host-order number');
  assert.equal(await registeredAttachmentSource.codec.serialize('image-2'), '【图片2：second.png】', 'the second attachment must keep the second Host-order number');
  assert.equal(await registeredAttachmentSource.codec.serialize('restored-image'), '【图片1：第一张.png】', 'the first restored attachment must retain number one');
  assert.equal(await registeredAttachmentSource.codec.serialize('restored-file'), '【文件2：report.xlsx】', 'a later restored attachment must use its full-list position instead of repeating number one');
  syncAttachmentNumbers([{ id: 'restored-file', kind: 'file', file: { name: 'report.xlsx' } }], (key) => key, ['stale-partial-id']);
  assert.equal(await registeredAttachmentSource.codec.serialize('restored-file'), '【文件2：report.xlsx】', 'a partial later publication must not reset a restored attachment to one');
  const payload = { version: 1, sourceSessionId: 'session-1', text: '编辑这条消息', attachments: [] };
  let restored = null;
  let focused = 0;
  const actions = HistoryEditActions({
    payload,
    restorePayload: async (value) => { restored = value; },
    keyboard: { focus() { focused += 1; } },
    t: (key) => key
  });
  assert.equal(actions.props['data-component'], 'history-edit');
  const edit = actions.children[0];
  assert.equal(edit.props.disabled, false, 'a settled user message should offer editing');
  assert.ok(!source.includes('rollbackMessage') && !source.includes('forkAt: props.forkAt'), 'rollback UI and callbacks must be removed');

  await edit.props.onClick();
  assert.equal(restored, payload, 'editing must restore the complete text-and-attachment payload');
  assert.equal(focused, 1, 'editing must focus the composer after restoration');
  console.log('history edit and running-state tests OK');
}

async function verifyClipboardFallbacks() {
  const copiedPayload = {
    version: 1,
    sourceSessionId: 'session-1',
    text: '你好',
    attachments: [{
      type: 'image',
      image: { attachment: { attachmentId: 'clipboard-image', name: 'image.png', mediaType: 'image/png' } }
    }],
    ordered: [
      { type: 'text', text: '你好' },
      { type: 'attachment', attachment: {
        type: 'image',
        image: { attachment: { attachmentId: 'clipboard-image', name: 'image.png', mediaType: 'image/png' } }
      } }
    ]
  };
  const sessionStore = new Map();
  sandbox.sessionStorage = {
    getItem(key) { return sessionStore.has(key) ? sessionStore.get(key) : null; },
    setItem(key, value) { sessionStore.set(key, value); }
  };
  sandbox.Blob = Blob;
  sandbox.ClipboardItem = function ClipboardItem(parts) { this.parts = parts; };
  sandbox.window.ClipboardItem = sandbox.ClipboardItem;
  let htmlWriteFails = true;
  let execSucceeds = true;
  let writtenText = '';
  let copiedHTML = '';
  let selected = null;
  const selection = {
    rangeCount: 0,
    removeAllRanges() { this.rangeCount = 0; },
    addRange() { this.rangeCount = 1; },
    getRangeAt() { return {}; }
  };
  sandbox.navigator = {
    clipboard: {
      async write() { if (htmlWriteFails) throw new Error('clipboard.write denied'); },
      async writeText(text) { writtenText = text; }
    }
  };
  sandbox.document = {
    createElement() {
      return { contentEditable: 'false', innerHTML: '', style: {}, remove() {} };
    },
    body: { appendChild(node) { selected = node; } },
    getSelection() { return selection; },
    createRange() { return { selectNodeContents(node) { selected = node; } }; },
    execCommand(command) {
      if (command !== 'copy') return false;
      if (execSucceeds) copiedHTML = selected.innerHTML;
      return execSucceeds;
    }
  };

  const cache = { current: null };
  assert.equal(await writeClipboard(copiedPayload, cache), 'html', 'a rejected HTML clipboard write must fall back to execCommand HTML');
  assert.ok(copiedHTML.includes('data-dsh-inline-message='), 'legacy copy must carry the encoded attachment payload');
  const fromHTML = payloadFromClipboard({
    getData(type) { return type === 'text/html' ? copiedHTML : '你好'; }
  }, { current: null });
  assert.equal(fromHTML?.attachments.length, 1, 'the legacy HTML copy must restore its image attachment');

  htmlWriteFails = true;
  execSucceeds = false;
  writtenText = '';
  const plainCache = { current: null };
  assert.equal(await writeClipboard(copiedPayload, plainCache), 'text', 'plain text is the final clipboard fallback');
  assert.equal(writtenText, '你好');
  const fromPersistedCache = payloadFromClipboard({
    getData(type) { return type === 'text/plain' ? '你好' : ''; }
  }, { current: null });
  assert.equal(fromPersistedCache?.attachments.length, 1, 'session storage must preserve attachments when only plain text reaches the clipboard');
  console.log('clipboard HTML and persistent-cache fallback tests OK');
}

async function verifyHistoricalAttachmentFallback() {
  const reference = { attachmentId: 'sha256:test', mediaType: 'image/png', name: 'image.png' };
  const attachment = { type: 'image', image: { attachment: reference } };
  const failure = { ok: false, error: { code: 'gateway/internal', message: 'legacy read rejected' } };
  const binding = { session: { readAttachment: async () => failure } };
  let requestedUrl = '';
  sandbox.fetch = async (url) => {
    requestedUrl = url;
    return { ok: true, arrayBuffer: async () => Uint8Array.from([1, 2, 3, 4]).buffer };
  };
  const result = await readHistoricalAttachment(binding, attachment, async (value) => {
    assert.equal(value, reference, 'the fallback must load the exact durable image reference');
    return 'blob:historical-image';
  });
  assert.equal(result.ok, true, 'Chat image loading must recover an image when the legacy read is rejected');
  assert.equal(requestedUrl, 'blob:historical-image');
  assert.deepEqual(Array.from(result.value.data), [1, 2, 3, 4], 'restoration must receive the original image bytes');
  assert.equal(result.value.attachment, reference);

  const fileFailure = await readHistoricalAttachment(binding, {
    type: 'file', file: { attachmentId: 'file-1', name: 'report.xlsx' }
  }, async () => { throw new Error('files must not use the image loader'); });
  assert.equal(fileFailure, failure, 'non-image attachments must retain the original read result');
  console.log('historical attachment image-loader fallback tests OK');
}

verifyHistoryEditActions().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
verifyClipboardFallbacks().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
verifyHistoricalAttachmentFallback().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
