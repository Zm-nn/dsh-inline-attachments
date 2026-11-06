window.__ModuleLoader__.load({
  id: 'dsh-inline-attachments',
  factory(require) {
    const React = require('react');
    const ReactDOM = (() => {
      try { return require('react-dom'); } catch { return null; }
    })();
    const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    const h = React.createElement;
    const NS = 'inlineAttachments';
    const SOURCE = 'inline-attachment';
    const PAYLOAD_ATTRIBUTE = 'data-dsh-inline-message';
    const COPY_CACHE_KEY = 'dsh-inline-attachments:last-copy';
    const models = new WeakMap();
    const referenceMetadata = new Map();

    const zh = {
      meta: { title: '输入框优化组件', description: '优化对话框中的图片与文件显示，支持内联编号、悬浮预览，以及历史消息文字与附件一键复制和重新编辑。' },
      copy: '复制', copied: '已复制',
      copiedWithAttachments: '已复制文字和 {count} 个附件；粘贴到输入框即可恢复',
      remove: '移除附件', retry: '重试上传', close: '关闭预览', openImage: '查看大图',
      image: '图片', file: '文件', browserFile: '浏览器上传文件', path: '路径', size: '大小',
      uploading: '正在上传', uploadFailed: '上传失败', drop: '松开以添加图片或文件',
      restoring: '正在恢复附件…', restored: '已恢复文字和 {count} 个附件',
      restoreFailed: '附件恢复失败：{message}',
      sourceUnavailable: '源会话当前未打开，无法读取历史附件',
      readFailed: '无法读取附件 {name}', unknownImage: '未命名图片',
      clipboardPath: '剪贴板内容，没有本地文件路径', unavailablePath: '浏览器未提供本地文件路径',
      referenceSummary: '引用会话 · {labels}', extraBlock: '附加内容块', jsonTruncated: '… 已截断，共 {total} 字符',
      historyComponent: '历史消息重新编辑', editMessage: '重新编辑此消息',
      restoringEdit: '正在恢复到输入框…', editRestored: '已恢复到输入框，可修改后重新发送',
      historyActionFailed: '操作失败：{message}'
    };
    const en = {
      meta: { title: '输入框优化组件', description: 'Optimizes image and file display in the composer, with inline numbering, hover previews, one-click copying of historical messages with attachments, and re-editing.' },
      copy: 'Copy', copied: 'Copied',
      copiedWithAttachments: 'Copied text and {count} attachments; paste into the composer to restore them',
      remove: 'Remove attachment', retry: 'Retry upload', close: 'Close preview', openImage: 'Open image',
      image: 'Image', file: 'File', browserFile: 'Browser-uploaded file', path: 'Path', size: 'Size',
      uploading: 'Uploading', uploadFailed: 'Upload failed', drop: 'Drop to add images or files',
      restoring: 'Restoring attachments…', restored: 'Restored text and {count} attachments',
      restoreFailed: 'Could not restore attachments: {message}',
      sourceUnavailable: 'Open the source conversation before restoring its attachments',
      readFailed: 'Could not read attachment {name}', unknownImage: 'Untitled image',
      clipboardPath: 'Clipboard content; no local file path', unavailablePath: 'The browser did not provide a local file path',
      referenceSummary: 'Referenced sessions · {labels}', extraBlock: 'Extra content block', jsonTruncated: '… truncated, {total} characters total',
      historyComponent: 'Edit historical message', editMessage: 'Edit this message again',
      restoringEdit: 'Restoring to the composer…', editRestored: 'Restored to the composer; edit and resend when ready',
      historyActionFailed: 'Action failed: {message}'
    };

    const CSS = `
      .dsh-ia-user{display:flex;flex-direction:column;align-items:flex-end;align-self:stretch;gap:2px;max-width:100%;padding:4px 0}
      .dsh-ia-bubble{box-sizing:border-box;display:block;max-width:min(100%,760px);padding:10px 14px;border-radius:16px 16px 4px 16px;background:var(--dsw-alias-state-business-tertiary,#eef2ff);color:var(--dsw-alias-label-primary,#222);font-size:var(--dsh-content-font-size,14px);line-height:calc(24px + var(--dsh-content-font-delta,0px));overflow-wrap:anywhere}
      .dsh-ia-message-text{display:inline;white-space:pre-wrap}
      .dsh-ia-sent-chip{display:inline-flex;align-items:center;gap:7px;min-width:0;max-width:min(100%,280px);margin:2px 4px;padding:4px 10px 4px 6px;border-radius:9px;background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#222);line-height:20px;vertical-align:middle}
      .dsh-ia-sent-chip.image{cursor:zoom-in}
      .dsh-ia-sent-chip.image:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#5470e0);outline-offset:2px}
      .dsh-ia-sent-chip svg{flex:none;width:18px;height:18px;color:var(--dsw-alias-state-business-primary,#5470e0)}
      .dsh-ia-sent-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500}
      [data-dsh-ia-display]{font-size:0!important}
      [data-dsh-ia-display]::after{content:attr(data-dsh-ia-display);flex:none;font-size:var(--dsh-content-font-size,14px);font-weight:500;line-height:24px}
      .dsh-ia-sent-extra{display:block;min-width:0;margin-top:8px}
      .dsh-ia-reference-summary{align-self:flex-end;color:var(--dsw-alias-label-tertiary,#777);font-size:12px;line-height:20px}
      .dsh-ia-actions{display:flex;align-items:center;gap:4px;opacity:0;transition:opacity .15s;color:var(--dsw-alias-label-tertiary,#777);font-size:11px}
      .dsh-ia-user:hover .dsh-ia-actions,.dsh-ia-user:focus-within .dsh-ia-actions{opacity:1}
      .dsh-ia-icon{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;padding:0;border:0;border-radius:6px;background:transparent;color:inherit;cursor:pointer}
      .dsh-ia-icon:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#222)}
      .dsh-ia-icon:disabled{cursor:default;opacity:.45}
      .dsh-ia-icon svg{width:15px;height:15px}
      .dsh-ia-history{display:inline-flex;align-items:center;gap:4px}
      .dsh-ia-history-status{max-width:280px;color:var(--dsw-alias-label-tertiary,#777);line-height:16px}
      .dsh-ia-history-status.error{color:var(--dsw-alias-state-danger,#c33)}
      .dsh-ia-preview{box-sizing:border-box;position:fixed;z-index:4000;width:320px;max-width:calc(100vw - 24px);padding:12px;border:.5px solid var(--dsw-alias-border-l1,rgba(0,0,0,.14));border-radius:12px;background:var(--dsw-specific-menu,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:var(--dsw-elevation-prominent,0 14px 40px rgba(0,0,0,.18));backdrop-filter:var(--dsw-menu-backdrop-filter,blur(18px));font-size:12px;line-height:18px;overflow-y:auto;isolation:isolate;pointer-events:auto}
      .dsh-ia-preview *{box-sizing:border-box}
      .dsh-ia-preview-head{display:flex;align-items:center;gap:8px;min-width:0;margin-bottom:8px}
      .dsh-ia-preview-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
      .dsh-ia-preview-kind{flex:none;color:var(--dsw-alias-label-tertiary,#777)}
      .dsh-ia-thumb{display:block;width:100%;height:160px;margin:0;padding:0;border:0;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover,#f3f4f6);cursor:zoom-in;overflow:hidden}
      .dsh-ia-thumb img{display:block;width:100%;height:100%;object-fit:contain}
      .dsh-ia-image-loading{display:grid;place-items:center;width:100%;min-width:160px;min-height:120px;color:var(--dsw-alias-label-tertiary,#777)}
      .dsh-ia-lightbox .dsh-ia-image-loading{min-width:240px;min-height:180px;color:#fff}
      .dsh-ia-file-glyph{display:flex;align-items:center;justify-content:center;height:64px;margin:0 0 8px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover,#f3f4f6);color:var(--dsw-alias-state-business-primary,#5470e0)}
      .dsh-ia-file-glyph svg{width:34px;height:34px}
      .dsh-ia-meta{display:grid;grid-template-columns:auto minmax(0,1fr);gap:3px 10px;margin:10px 0 0;color:var(--dsw-alias-label-tertiary,#777);line-height:18px}
      .dsh-ia-meta dt,.dsh-ia-meta dd{min-width:0;margin:0;padding:0}
      .dsh-ia-meta dd{color:var(--dsw-alias-label-secondary,#444);text-align:left}
      .dsh-ia-path{color:var(--dsw-alias-label-primary,#222)!important;word-break:break-all;user-select:text}
      .dsh-ia-status{margin-top:8px;color:var(--dsw-alias-label-tertiary,#777)}
      .dsh-ia-status.error{color:var(--dsw-alias-state-danger,#c33)}
      .dsh-ia-preview-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
      .dsh-ia-button{padding:5px 10px;border:.5px solid var(--dsw-alias-border-l2,#ddd);border-radius:7px;background:transparent;color:var(--dsw-alias-label-primary,#222);font:inherit;cursor:pointer}
      .dsh-ia-button:hover{background:var(--dsw-alias-interactive-bg-hover,#f3f4f6)}
      .dsh-ia-button.danger{color:var(--dsw-alias-state-danger,#c33)}
      .dsh-ia-lightbox{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:56px 24px 24px;background:rgba(0,0,0,.78);color:#fff}
      .dsh-ia-lightbox img{display:block;max-width:94vw;max-height:86vh;object-fit:contain;box-shadow:0 20px 70px rgba(0,0,0,.45)}
      .dsh-ia-lightbox-name{position:absolute;top:18px;left:24px;max-width:calc(100vw - 100px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .dsh-ia-lightbox-close{position:absolute;top:12px;right:18px;width:34px;height:34px;border:0;border-radius:8px;background:rgba(255,255,255,.12);color:#fff;font-size:24px;cursor:pointer}
      .dsh-ia-drop{position:fixed;inset:0;z-index:3000;display:grid;place-items:center;pointer-events:none;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#5470e0) 12%,transparent);color:var(--dsw-alias-state-business-primary,#5470e0);font-size:18px;font-weight:600}
      .dsh-ia-drop span{padding:18px 26px;border:2px dashed currentColor;border-radius:16px;background:var(--dsw-specific-menu,#fff)}
      .dsh-ia-notice{position:absolute;right:0;bottom:calc(100% + 8px);z-index:3500;max-width:360px;padding:8px 12px;border:.5px solid var(--dsw-alias-border-l1,#ddd);border-radius:9px;background:var(--dsw-specific-menu,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.14));font-size:12px}
      .dsh-ia-notice.error{color:var(--dsw-alias-state-danger,#c33)}
      @media (prefers-reduced-motion:reduce){.dsh-ia-actions{transition:none}}
    `;

    function translate(t, key, params) {
      return t ? t(key, params) : key;
    }

    function icon(name) {
      const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
      if (name === 'copy') return h('svg', common,
        h('rect', { x: 8, y: 8, width: 11, height: 11, rx: 2 }),
        h('path', { d: 'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2' }));
      if (name === 'check') return h('svg', common, h('path', { d: 'm5 12 4 4L19 6' }));
      if (name === 'edit') return h('svg', common,
        h('path', { d: 'm4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Zm9.5-12.5 3 3' }));
      if (name === 'file') return h('svg', common,
        h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z' }),
        h('path', { d: 'M14 2v6h6M8 13h8M8 17h5' }));
      return h('svg', common, h('path', { d: 'm5 12 4 4L19 6' }));
    }

    function createPreviewStore() {
      let snapshot = null;
      let closeTimer = null;
      let opener = null;
      const listeners = new Set();
      const emit = () => { for (const listener of listeners) listener(); };
      const clearTimer = () => { if (closeTimer !== null) clearTimeout(closeTimer); closeTimer = null; };
      return {
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        getSnapshot() { return snapshot; },
        hover(sessionId, id, anchor, pinned = false, reference = null) {
          clearTimer();
          snapshot = { kind: 'hover', sessionId, id, anchor, pinned, reference };
          emit();
        },
        lightbox(sessionId, id) {
          clearTimer();
          opener = document.activeElement;
          snapshot = { kind: 'lightbox', sessionId, id };
          emit();
        },
        hoverAttachment(sessionId, attachment, loadImage, anchor) {
          clearTimer();
          snapshot = {
            kind: 'hover', sessionId, id: durableAttachmentId(attachment) || 'sent-attachment',
            anchor, pinned: false, attachment, loadImage
          };
          emit();
        },
        lightboxAttachment(sessionId, attachment, loadImage) {
          clearTimer();
          opener = document.activeElement;
          snapshot = {
            kind: 'lightbox', sessionId, id: durableAttachmentId(attachment) || 'sent-attachment',
            attachment, loadImage
          };
          emit();
        },
        cancelClose: clearTimer,
        scheduleClose() {
          clearTimer();
          if (snapshot?.kind !== 'hover' || snapshot.pinned) return;
          closeTimer = setTimeout(() => { snapshot = null; closeTimer = null; emit(); }, 140);
        },
        close() {
          clearTimer();
          snapshot = null;
          emit();
          if (opener && typeof opener.focus === 'function') opener.focus({ preventScroll: true });
          opener = null;
        }
      };
    }

    function modelFor(keyboard) {
      let model = models.get(keyboard);
      if (!model) {
        model = { mappings: new Map() };
        models.set(keyboard, model);
      }
      return model;
    }

    function attachmentName(attachment, t) {
      return attachment.file.name || translate(t, 'unknownImage');
    }

    function sameOccurrence(occurrence, mapping) {
      if (mapping.occurrenceId && occurrence.occurrenceId === mapping.occurrenceId) return true;
      return occurrence.source === mapping.source && occurrence.ref === mapping.ref;
    }

    function nativeOccurrence(occurrence, attachment, used) {
      return occurrence.source !== SOURCE && occurrence.appearance === 'file' &&
        occurrence.label === attachment.file.name && !used.has(occurrence.occurrenceId);
    }

    function syncAttachmentNumbers(attachments, t, attachmentIds) {
      const order = Array.isArray(attachmentIds) ? attachmentIds : attachments.map((attachment) => attachment.id);
      attachments.forEach((attachment) => {
        const orderedIndex = order.indexOf(attachment.id);
        // Ignore an incomplete publication instead of resetting valid metadata
        // to one. Restoration supplies its complete batch order up front.
        if (orderedIndex < 0) return;
        referenceMetadata.set(attachment.id, {
          kind: attachment.kind,
          name: attachmentName(attachment, t),
          number: orderedIndex + 1
        });
      });
    }

    function numberedAttachmentName(kind, name, number) {
      const extension = String(name || '').match(/\.[A-Za-z0-9]{1,10}$/)?.[0] || (kind === 'image' ? '.png' : '');
      return `${kind === 'image' ? 'image' : 'file'}${number}${extension}`;
    }

    function syncComposerChipNumbers(root, input, attachments) {
      if (!root || !input) return;
      const occurrences = input.occurrences.slice().sort((a, b) => a.offset - b.offset);
      const labels = new Set(occurrences.map((occurrence) => occurrence.label));
      const chips = Array.from(root.querySelectorAll('span[title]')).filter((item) => labels.has(item.getAttribute('title')));
      const usedNative = new Set();
      for (const [index, chip] of chips.entries()) {
        const occurrence = occurrences[index];
        const attachment = occurrence?.source === SOURCE
          ? attachments.find((item) => item.id === occurrence.ref)
          : occurrence ? attachments.find((item) => nativeOccurrence(occurrence, item, usedNative)) : null;
        if (attachment) {
          if (occurrence.source !== SOURCE) usedNative.add(occurrence.occurrenceId);
          const metadataNumber = referenceMetadata.get(attachment.id)?.number;
          const ids = Array.isArray(input.attachmentIds) ? input.attachmentIds : attachments.map((item) => item.id);
          const orderedIndex = ids.indexOf(attachment.id);
          const complete = attachments.every((item) => ids.includes(item.id));
          const attachmentIndex = orderedIndex >= 0 ? orderedIndex : attachments.indexOf(attachment);
          const number = complete && orderedIndex >= 0 ? orderedIndex + 1
            : Number.isSafeInteger(metadataNumber) && metadataNumber > 0 ? metadataNumber : attachmentIndex + 1;
          chip.setAttribute('data-dsh-ia-display', numberedAttachmentName(attachment.kind, attachmentName(attachment), number));
        } else {
          chip.removeAttribute('data-dsh-ia-display');
        }
        chip.removeAttribute('data-dsh-ia-prefix');
      }
    }

    function watchComposerChipNumbers(root, input, attachments) {
      let active = true;
      const sync = () => {
        if (!active) return;
        const current = typeof input === 'function' ? input() : input;
        syncComposerChipNumbers(root, current, attachments);
      };
      // Run once immediately, then catch Lexical nodes inserted or reconciled
      // after this component's own render. Attribute writes do not retrigger it.
      sync();
      if (typeof MutationObserver !== 'function') return () => { active = false; };
      const observer = new MutationObserver(sync);
      observer.observe(root, { childList: true, subtree: true, characterData: true });
      return () => { active = false; observer.disconnect(); };
    }

    function customReference(attachment, t) {
      const previous = referenceMetadata.get(attachment.id);
      referenceMetadata.set(attachment.id, {
        kind: attachment.kind,
        name: attachmentName(attachment, t),
        number: previous?.number || 0
      });
      return {
        source: SOURCE,
        ref: attachment.id,
        label: attachmentName(attachment, t),
        appearance: 'file',
        clipboardText: ''
      };
    }

    function removeOccurrences(keyboard, input, removals) {
      if (!removals.length) return false;
      const selected = new Set(removals.map((occurrence) => occurrence.occurrenceId));
      let text = input.draft;
      let references = input.occurrences.slice();
      const ordered = removals.slice().sort((a, b) => b.offset - a.offset);
      for (const occurrence of ordered) {
        const start = occurrence.offset;
        const length = occurrence.label.length;
        if (start < 0 || start > text.length) continue;
        text = text.slice(0, start) + text.slice(start + length);
        references = references.filter((item) => item.occurrenceId !== occurrence.occurrenceId).map((item) => {
          if (item.offset <= start) return item;
          return { ...item, offset: Math.max(start, item.offset - length) };
        });
      }
      if (references.length === input.occurrences.length && references.every((item, index) => item === input.occurrences[index])) return false;
      const command = input.claim?.token && text.startsWith(input.claim.token) ? { token: input.claim.token } : undefined;
      keyboard.setDraft({ text, references, ...(command ? { command } : {}) });
      return selected.size > 0;
    }

    function removeAttachment(props, id, input) {
      if (!input) return;
      const mapping = props.model.mappings.get(id);
      let occurrence = mapping ? input.occurrences.find((item) => sameOccurrence(item, mapping)) : null;
      if (!occurrence) occurrence = input.occurrences.find((item) => item.source === SOURCE && item.ref === id);
      if (occurrence) removeOccurrences(props.keyboard, input, [occurrence]);
      props.model.mappings.delete(id);
      props.onRemoveAttachment(id);
    }

    function formatBytes(size) {
      if (!Number.isFinite(size) || size < 0) return '';
      if (size < 1024) return `${size} B`;
      if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
      return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    }

    function referencePath(occurrence, cwd = '') {
      let value = typeof occurrence?.ref === 'string' ? occurrence.ref : '';
      if (value.startsWith('@"')) {
        value = value.slice(2);
        if (value.endsWith('"')) value = value.slice(0, -1);
      } else if (value.startsWith('@')) value = value.slice(1);
      if (!value || !cwd || /^(?:\/|[A-Za-z]:[\\/]|\\\\)/.test(value)) return value;
      return `${cwd.replace(/[/\\]+$/, '')}/${value}`;
    }

    function hostPathFor(file) {
      try {
        return globalThis.__DSH_HOST_PATHS__?.pathFor(file) || '';
      } catch {
        return '';
      }
    }

    function draftAttachmentPath(attachment, mapping, cwd, t) {
      const file = attachment.file;
      const direct = file.path || hostPathFor(file) || file.webkitRelativePath || '';
      if (direct) return direct;
      if (mapping && mapping.source !== SOURCE && mapping.ref) return referencePath(mapping, cwd);
      if (attachment.kind === 'image' && (!file.name || file.name === 'image.png')) return translate(t, 'clipboardPath');
      return translate(t, 'unavailablePath');
    }

    function previewPlacement(anchor, image) {
      const above = Math.max(0, anchor.top - 20);
      const below = Math.max(0, window.innerHeight - anchor.bottom - 20);
      const openAbove = above >= 180 || above > below;
      const maxHeight = Math.max(120, Math.min(image ? 400 : 280, openAbove ? above : below));
      return { openAbove, maxHeight };
    }

    function AttachmentImage({ attachment, alt, ...props }) {
      const [objectUrl, setObjectUrl] = React.useState('');
      React.useEffect(() => {
        if (!attachment.file || typeof URL?.createObjectURL !== 'function') return undefined;
        const url = URL.createObjectURL(attachment.file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
      }, [attachment.file]);
      return h('img', { ...props, src: objectUrl || attachment.previewUrl || '', alt });
    }

    function DurableAttachmentImage({ reference, loadImage, alt, ...props }) {
      const [url, setUrl] = React.useState('');
      React.useEffect(() => {
        let alive = true;
        setUrl('');
        if (!reference || typeof loadImage !== 'function') return undefined;
        Promise.resolve(loadImage(reference)).then((resolved) => {
          if (alive) setUrl(typeof resolved === 'string' ? resolved : resolved?.url || resolved?.src || '');
        }, () => { if (alive) setUrl(''); });
        return () => { alive = false; };
      }, [reference, loadImage]);
      return url ? h('img', { ...props, src: url, alt }) : h('span', {
        className: 'dsh-ia-image-loading', role: 'img', 'aria-label': alt
      }, '…');
    }

    // New markers are intentionally readable to the model and carry the same
    // number as the Host attachment order. Keep accepting the original private
    // markers so messages sent before this version remain inline and clean.
    const POSITION_MARKER = /\uE000inline-attachment:([^\uE001]+)\uE001|【(图片|文件)(\d+)：([^】\r\n]+)】|【((?:image|file)\d+(?:\.[A-Za-z0-9]{1,10})?)】/gu;
    const READABLE_MARKER = /【(?:(?:图片|文件)\d+：[^】\r\n]+|(?:image|file)\d+(?:\.[A-Za-z0-9]{1,10})?)】/u;

    function positionMarker(ref, overrides = {}) {
      const metadata = { ...referenceMetadata.get(ref), ...overrides };
      const image = metadata.kind !== 'file';
      const number = Number.isSafeInteger(metadata.number) && metadata.number > 0 ? metadata.number : 1;
      const fallback = image ? '图片' : '文件';
      const name = String(metadata.name || fallback).replace(/[【】\r\n]+/gu, ' ').trim() || fallback;
      return `【${image ? '图片' : '文件'}${number}：${name}】`;
    }

    function contentParts(content) {
      const texts = [];
      const attachments = [];
      const rest = [];
      const ordered = [];
      for (const block of Array.isArray(content) ? content : []) {
        if (block?.type === 'text' && typeof block.text === 'string') {
          texts.push(block.text);
          if (block.text) ordered.push({ type: 'text', text: block.text });
        } else if (block?.type === 'image' && block.attachment !== undefined) {
          const attachment = { type: 'image', image: { attachment: block.attachment } };
          attachments.push(attachment);
          ordered.push({ type: 'attachment', attachment });
        } else if (block?.type === 'file' && block.attachment !== undefined) {
          const attachment = { type: 'file', file: block.attachment };
          attachments.push(attachment);
          ordered.push({ type: 'attachment', attachment });
        } else {
          rest.push(block);
          ordered.push({ type: 'extra', block });
        }
      }
      const originalText = texts.join('');
      if (!originalText.includes('\uE000inline-attachment:') && !READABLE_MARKER.test(originalText)) {
        return { text: originalText, attachments, rest, ordered };
      }

      // The Host stores draft attachments before the serialized text. Position
      // markers retain where each inline chip occurred in that text; consume the
      // durable attachments in their original order without rendering them twice.
      const positioned = [];
      const cleanTexts = [];
      const remaining = attachments.slice();
      const assigned = new Map();
      const appendText = (text) => {
        let cursor = 0;
        for (const match of text.matchAll(POSITION_MARKER)) {
          const plain = text.slice(cursor, match.index);
          if (plain) {
            cleanTexts.push(plain);
            positioned.push({ type: 'text', text: plain });
          }
          const ascii = match[5] !== undefined;
          const readable = match[2] !== undefined || ascii;
          const number = ascii ? Number(match[5].match(/\d+/)?.[0]) : Number(match[3]);
          const key = ascii ? `ascii:${match[5]}` : readable ? `readable:${match[3]}` : `legacy:${match[1]}`;
          let attachment = assigned.get(key);
          if (!attachment) {
            attachment = readable ? attachments[number - 1] || remaining.shift() : remaining.shift();
            if (attachment) {
              assigned.set(key, attachment);
              const remainingIndex = remaining.indexOf(attachment);
              if (remainingIndex >= 0) remaining.splice(remainingIndex, 1);
            }
          }
          if (attachment) positioned.push({ type: 'attachment', attachment });
          cursor = match.index + match[0].length;
        }
        const plain = text.slice(cursor);
        if (plain) {
          cleanTexts.push(plain);
          positioned.push({ type: 'text', text: plain });
        }
      };
      for (const block of Array.isArray(content) ? content : []) {
        if (block?.type === 'text' && typeof block.text === 'string') appendText(block.text);
        else if (block?.type !== 'image' && block?.type !== 'file') positioned.push({ type: 'extra', block });
      }
      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        positioned.unshift({ type: 'attachment', attachment: remaining[index] });
      }
      return { text: cleanTexts.join(''), attachments, rest, ordered: positioned };
    }

    function durableReference(attachment) {
      return attachment?.type === 'image' ? attachment.image?.attachment : attachment?.file;
    }

    function durableAttachmentId(attachment) {
      const reference = durableReference(attachment);
      return typeof reference === 'string' ? reference : reference?.attachmentId ?? reference?.id;
    }

    function encodePayload(value) {
      const bytes = new TextEncoder().encode(JSON.stringify(value));
      let binary = '';
      for (let index = 0; index < bytes.length; index += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)));
      }
      return btoa(binary);
    }

    function decodePayload(value) {
      try {
        const binary = atob(value);
        const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));
        if (payload?.version !== 1 || typeof payload.sourceSessionId !== 'string' || typeof payload.text !== 'string' || !Array.isArray(payload.attachments)) return null;
        const attachments = payload.attachments.filter((attachment) => attachment && (attachment.type === 'image' || attachment.type === 'file') && typeof durableAttachmentId(attachment) === 'string');
        if (!attachments.length) return null;
        const byId = new Map(attachments.map((attachment) => [durableAttachmentId(attachment), attachment]));
        const ordered = [];
        if (Array.isArray(payload.ordered)) {
          for (const item of payload.ordered) {
            if (item?.type === 'text' && typeof item.text === 'string' && item.text) ordered.push({ type: 'text', text: item.text });
            else if (item?.type === 'attachment') {
              const attachment = byId.get(durableAttachmentId(item.attachment));
              if (attachment) ordered.push({ type: 'attachment', attachment });
            }
          }
        }
        return {
          version: 1, sourceSessionId: payload.sourceSessionId, text: payload.text, attachments,
          ...(ordered.length ? { ordered } : {})
        };
      } catch {
        return null;
      }
    }

    function copySemanticReference(reference) {
      return {
        source: reference.source,
        ref: reference.ref,
        offset: reference.offset,
        length: reference.length,
        label: reference.label,
        clipboardText: reference.clipboardText,
        ...(reference.appearance === undefined ? {} : { appearance: reference.appearance }),
        ...(reference.invalid === undefined ? {} : { invalid: reference.invalid })
      };
    }

    function draftOffsetFromDetect(references, detectOffset) {
      let delta = 0;
      for (const reference of references) {
        const start = reference.offset + delta;
        if (detectOffset < start) return detectOffset - delta;
        const end = start + reference.label.length;
        if (detectOffset < end) return reference.offset;
        delta += reference.label.length - reference.clipboardText.length;
      }
      return detectOffset - delta;
    }

    function buildRestoredDraft(ordered, byId, keyboard, t) {
      let restoredText = '';
      const restoredReferences = [];
      for (const item of ordered) {
        if (item.type === 'text') {
          restoredText += item.text;
          continue;
        }
        if (item.type !== 'attachment') continue;
        const draft = byId.get(durableAttachmentId(item.attachment));
        if (!draft) throw new Error('Could not match a restored attachment to its new draft');
        const reference = customReference(draft, t);
        restoredReferences.push({
          ...reference,
          offset: restoredText.length,
          length: reference.label.length,
          clipboardText: reference.label
        });
        restoredText += reference.label;
      }

      const current = keyboard.snapshot || {};
      const base = keyboard.draftSnapshot || {
        text: current.draft || '',
        references: current.occurrences || []
      };
      const baseReferences = (base.references || []).map(copySemanticReference).sort((a, b) => a.offset - b.offset);
      const caret = keyboard.caretSpan?.() || { start: base.text.length, end: base.text.length };
      const start = Math.max(0, Math.min(base.text.length, draftOffsetFromDetect(baseReferences, caret.start)));
      const end = Math.max(start, Math.min(base.text.length, draftOffsetFromDetect(baseReferences, caret.end)));
      const references = [
        ...baseReferences.filter((reference) => reference.offset + reference.length <= start),
        ...restoredReferences.map((reference) => ({ ...reference, offset: reference.offset + start })),
        ...baseReferences.filter((reference) => reference.offset >= end).map((reference) => ({
          ...reference,
          offset: reference.offset + restoredText.length - (end - start)
        }))
      ].sort((a, b) => a.offset - b.offset);
      return {
        text: base.text.slice(0, start) + restoredText + base.text.slice(end),
        references,
        ...(base.command ? { command: base.command } : {})
      };
    }

    function restoreOrderedPayload(payload, drafts, keyboard, model, t) {
      const byId = new Map(payload.attachments.map((attachment, index) => [durableAttachmentId(attachment), drafts[index]]));
      const ordered = Array.isArray(payload.ordered) && payload.ordered.length ? payload.ordered : [
        ...(payload.text ? [{ type: 'text', text: payload.text }] : []),
        ...payload.attachments.map((attachment) => ({ type: 'attachment', attachment }))
      ];
      const restoredIds = [...(keyboard.snapshot?.attachmentIds || [])];
      for (const draft of drafts) if (!restoredIds.includes(draft.id)) restoredIds.push(draft.id);
      for (const draft of drafts) model.mappings.set(draft.id, {
        source: SOURCE, ref: draft.id, occurrenceId: null, pending: true
      });
      syncAttachmentNumbers(drafts, t, restoredIds);
      if (drafts.length && !keyboard.addAttachments(drafts.map((draft) => draft.id))) {
        for (const draft of drafts) model.mappings.delete(draft.id);
        throw new Error('Input is currently locked');
      }
      // Commit one complete semantic document. Sequential paste/insertReference
      // calls race Lexical reconciliation and can leave a visible chip without
      // its semantic occurrence, which then loses both number and submit marker.
      keyboard.setDraft(buildRestoredDraft(ordered, byId, keyboard, t));
      return drafts.length;
    }

    function rememberCopy(payload, cache) {
      cache.current = payload;
      try {
        globalThis.sessionStorage?.setItem(COPY_CACHE_KEY, encodePayload(payload));
      } catch {
        // Session storage can be disabled or full; the in-memory cache still
        // covers normal copying while this page remains mounted.
      }
    }

    function lastCopiedPayload(cache) {
      if (cache?.current) return cache.current;
      try {
        const encoded = globalThis.sessionStorage?.getItem(COPY_CACHE_KEY);
        return encoded ? decodePayload(encoded) : null;
      } catch {
        return null;
      }
    }

    function payloadFromClipboard(data, cache) {
      const html = data?.getData('text/html') || '';
      const match = html.match(new RegExp(`${PAYLOAD_ATTRIBUTE}="([A-Za-z0-9+/=]+)"`));
      if (match) {
        const payload = decodePayload(match[1]);
        if (payload) return payload;
      }
      const text = data?.getData('text/plain') || '';
      const cached = lastCopiedPayload(cache);
      if (cached && cached.attachments.length && cached.text === text) return cached;
      return null;
    }

    function clipboardHTML(payload) {
      const escaped = payload.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      // Keep the payload in the copied fragment but out of sight. Avoid
      // display:none because execCommand selection may omit hidden nodes.
      const hidden = 'position:absolute;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0';
      return `<div ${PAYLOAD_ATTRIBUTE}="${encodePayload(payload)}" style="${hidden}"></div><p>${escaped}</p>`;
    }

    function copyViaExecCommand(payload) {
      if (typeof document === 'undefined' || typeof document.execCommand !== 'function') return false;
      const holder = document.createElement('div');
      holder.contentEditable = 'true';
      holder.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0';
      holder.innerHTML = clipboardHTML(payload);
      document.body.appendChild(holder);
      const selection = document.getSelection?.();
      const previous = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const range = document.createRange();
      range.selectNodeContents(holder);
      selection?.removeAllRanges();
      selection?.addRange(range);
      let copied = false;
      try {
        copied = document.execCommand('copy') === true;
      } catch {
        copied = false;
      }
      selection?.removeAllRanges();
      if (previous) selection?.addRange(previous);
      holder.remove();
      return copied;
    }

    async function writeClipboard(payload, cache) {
      rememberCopy(payload, cache);
      if (typeof navigator !== 'undefined' && navigator.clipboard?.write && window.ClipboardItem) {
        try {
          const item = new ClipboardItem({
            'text/plain': new Blob([payload.text], { type: 'text/plain' }),
            'text/html': new Blob([clipboardHTML(payload)], { type: 'text/html' })
          });
          await navigator.clipboard.write([item]);
          return 'html';
        } catch {
          // Fall through to the legacy HTML copy path. Several Electron and
          // permission-policy combinations reject clipboard.write transiently.
        }
      }
      if (copyViaExecCommand(payload)) return 'html';
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload.text);
        return 'text';
      }
      throw new Error('Clipboard write is unavailable');
    }

    function SentAttachment({ attachment, number, t, preview, sessionId, loadImage }) {
      const reference = durableReference(attachment);
      const image = attachment.type === 'image';
      const name = reference?.name || translate(t, image ? 'unknownImage' : 'file');
      const displayName = Number.isSafeInteger(number) && number > 0 ? numberedAttachmentName(attachment.type, name, number) : name;
      const canPreview = Boolean(preview && sessionId);
      const showPreview = (event) => {
        if (!canPreview) return;
        const anchor = event.currentTarget.getBoundingClientRect();
        preview.hoverAttachment(sessionId, attachment, loadImage, {
          left: anchor.left, top: anchor.top, bottom: anchor.bottom
        });
      };
      const openImage = () => {
        if (image && canPreview) preview.lightboxAttachment(sessionId, attachment, loadImage);
      };
      return h('span', {
        className: `dsh-ia-sent-chip${image ? ' image' : ''}`,
        title: image ? translate(t, 'openImage') : name,
        role: image ? 'button' : undefined,
        tabIndex: image ? 0 : undefined,
        onMouseEnter: canPreview ? showPreview : undefined,
        onMouseLeave: canPreview ? preview.scheduleClose : undefined,
        onFocus: canPreview ? showPreview : undefined,
        onBlur: canPreview ? preview.scheduleClose : undefined,
        onClick: image ? openImage : undefined,
        onKeyDown: image ? (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openImage();
          }
        } : undefined
      },
        h(primitives.FileTypeIcon, { path: name, size: 18 }),
        h('span', { className: 'dsh-ia-sent-name' }, displayName));
    }

    function HistoryEditActions(props) {
      const { payload, restorePayload, keyboard, t } = props;
      const [busy, setBusy] = React.useState(false);
      const [status, setStatus] = React.useState(null);
      const failure = (error) => ({
        tone: 'error',
        text: translate(t, 'historyActionFailed', { message: error instanceof Error ? error.message : String(error) })
      });
      const edit = async () => {
        if (busy || !restorePayload) return;
        setBusy(true);
        setStatus(null);
        try {
          await restorePayload(payload);
          keyboard?.focus();
          setStatus({ text: translate(t, 'editRestored') });
        } catch (error) {
          setStatus(failure(error));
        } finally {
          setBusy(false);
        }
      };
      return h('div', {
        className: 'dsh-ia-history', role: 'group',
        'aria-label': translate(t, 'historyComponent'), 'data-component': 'history-edit'
      },
        h('button', {
          type: 'button', className: 'dsh-ia-icon', title: translate(t, 'editMessage'),
          'aria-label': translate(t, 'editMessage'), disabled: busy || !restorePayload,
          onClick: edit
        }, icon(busy || status?.text === translate(t, 'editRestored') ? 'check' : 'edit')),
        status ? h('span', {
          className: `dsh-ia-history-status${status.tone === 'error' ? ' error' : ''}`,
          role: 'status'
        }, status.text) : null);
    }

    function UserMessageView(props) {
      const { node, renderFactorySlot, sessionId, copyCache, t } = props;
      // Editing any historical message while the Session is active would race
      // the running Turn. Subscribe to the Session-wide flag, not this Node's
      // Turn location, so every history row follows the same rule.
      const sessionRunning = props.useSession?.((snapshot) => snapshot.running) === true;
      const [copyState, setCopyState] = React.useState('idle');
      const timer = React.useRef(null);
      React.useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);
      const content = node.data.content;
      const parts = React.useMemo(() => contentParts(content), [content]);
      const referenceLabels = node.data.referenceLabels;
      const skillNames = node.data.skillNames;
      const facts = React.useMemo(() => ({
        ...(referenceLabels === undefined ? {} : { sessionLabels: referenceLabels }),
        ...(skillNames === undefined ? {} : { skillNames })
      }), [referenceLabels, skillNames]);
      const payload = {
        version: 1,
        sourceSessionId: sessionId,
        text: parts.text,
        attachments: parts.attachments.map((attachment) => ({ ...attachment })),
        ordered: parts.ordered.flatMap((item) => {
          if (item.type === 'text') return [{ type: 'text', text: item.text }];
          if (item.type === 'attachment') return [{ type: 'attachment', attachment: { ...item.attachment } }];
          return [];
        })
      };
      const copy = async () => {
        try {
          await writeClipboard(payload, copyCache);
          setCopyState('done');
        } catch {
          setCopyState('error');
        }
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopyState('idle'), 2200);
      };
      const count = parts.attachments.length;
      const label = copyState === 'done' ? translate(t, 'copied') : translate(t, 'copy');
      const title = copyState === 'done' && count ? translate(t, 'copiedWithAttachments', { count }) : label;
      const time = node.data.time ? new Date(node.data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      const body = h('div', { className: 'dsh-ia-bubble' },
        parts.ordered.map((item, index) => {
          if (item.type === 'text') return h('span', { className: 'dsh-ia-message-text', key: `text:${index}` },
            renderFactorySlot('conversation.user.text', { text: item.text, facts, interactive: true }));
          if (item.type === 'attachment') return h(SentAttachment, {
            attachment: item.attachment, number: parts.attachments.indexOf(item.attachment) + 1,
            t, preview: props.preview, sessionId, loadImage: props.loadImage,
            key: `${durableAttachmentId(item.attachment) || 'attachment'}:${index}`
          });
          return h('div', { className: 'dsh-ia-sent-extra', key: `extra:${index}` }, h(primitives.JsonBlock, {
            label: translate(t, 'extraBlock'), payload: item.block,
            truncatedLabel: (total) => translate(t, 'jsonTruncated', { total })
          }));
        }));
      return h('div', { className: 'dsh-ia-user' },
        body,
        referenceLabels?.length ? h('div', { className: 'dsh-ia-reference-summary' }, translate(t, 'referenceSummary', { labels: referenceLabels.join('、') })) : null,
        h('div', { className: 'dsh-ia-actions' },
          time ? h('time', null, time) : null,
          h('button', { type: 'button', className: 'dsh-ia-icon', title, 'aria-label': title, onClick: copy }, icon(copyState === 'done' ? 'check' : 'copy')),
          sessionRunning ? null : h(HistoryEditActions, {
            payload, restorePayload: props.restorePayload,
            keyboard: props.keyboard, t
          })));
    }

    function portalize(node) {
      if (!node) return node;
      if (ReactDOM?.createPortal && typeof document !== 'undefined' && document.body) {
        return ReactDOM.createPortal(node, document.body);
      }
      return node;
    }

    function PreviewOverlay(props) {
      const { preview, keyboard, model, conversation, useInput, sessionId, cwd, t } = props;
      const state = React.useSyncExternalStore(preview.subscribe, preview.getSnapshot);
      const input = useInput((value) => value);
      const uploads = React.useSyncExternalStore(conversation.fileUploads.subscribe, conversation.fileUploads.getSnapshot);
      React.useEffect(() => {
        if (state?.kind !== 'lightbox') return undefined;
        const onKeyDown = (event) => { if (event.key === 'Escape') preview.close(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
      }, [state?.kind, preview]);
      if (!state || state.sessionId !== sessionId) return null;
      const reference = state.reference;
      const durable = state.attachment;
      const durableRef = durable ? durableReference(durable) : null;
      const attachment = durable ? {
        id: state.id,
        kind: durable.type,
        file: {
          name: durableRef?.name || translate(t, durable.type === 'image' ? 'unknownImage' : 'file'),
          path: '', size: durableRef?.bytes
        }
      } : reference ? {
        id: state.id,
        kind: 'file',
        file: { name: reference.label, path: referencePath(reference, cwd), size: Number.NaN }
      } : conversation.resolveDraftAttachments(input.attachmentIds).find((item) => item.id === state.id);
      if (!attachment) return null;
      const name = attachmentName(attachment, t);
      const openLightbox = () => {
        if (durable) preview.lightboxAttachment(sessionId, durable, state.loadImage);
        else preview.lightbox(sessionId, attachment.id);
      };
      if (state.kind === 'lightbox') {
        if (attachment.kind !== 'image') return null;
        return portalize(h('div', { className: 'dsh-ia-lightbox', role: 'dialog', 'aria-modal': true, 'aria-label': name, onClick: preview.close },
          h('div', { className: 'dsh-ia-lightbox-name' }, name),
          h('button', { type: 'button', className: 'dsh-ia-lightbox-close', title: translate(t, 'close'), 'aria-label': translate(t, 'close'), onClick: preview.close }, '×'),
          durable ? h(DurableAttachmentImage, {
            key: attachment.id, reference: durableRef, loadImage: state.loadImage, alt: name,
            onClick: (event) => event.stopPropagation()
          }) : h(AttachmentImage, { key: attachment.id, attachment, alt: name, onClick: (event) => event.stopPropagation() })));
      }
      const upload = reference || durable ? null : uploads[attachment.id];
      const failed = upload?.status === 'error';
      const uploading = upload?.status === 'uploading';
      const mapping = reference || durable ? null : model.mappings.get(attachment.id);
      const path = durable ? translate(t, 'unavailablePath') : reference ? attachment.file.path : draftAttachmentPath(attachment, mapping, cwd, t);
      const anchor = state.anchor || { left: window.innerWidth / 2 - 160, top: 80, bottom: window.innerHeight - 220 };
      const width = Math.min(320, window.innerWidth - 24);
      const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
      const placement = previewPlacement(anchor, attachment.kind === 'image');
      const style = placement.openAbove ? {
        left, top: anchor.top - 8, transform: 'translateY(-100%)', width, maxHeight: placement.maxHeight
      } : { left, top: anchor.bottom + 8, width, maxHeight: placement.maxHeight };
      return portalize(h('section', {
        className: 'dsh-ia-preview', style,
        onMouseEnter: preview.cancelClose, onMouseLeave: preview.scheduleClose
      },
        h('div', { className: 'dsh-ia-preview-head' },
          icon(attachment.kind === 'file' ? 'file' : 'check'),
          h('span', { className: 'dsh-ia-preview-name', title: name }, name),
          h('span', { className: 'dsh-ia-preview-kind' }, translate(t, attachment.kind === 'image' ? 'image' : 'file'))),
        attachment.kind === 'image' ? h('button', { type: 'button', className: 'dsh-ia-thumb', title: translate(t, 'openImage'), onClick: openLightbox },
          durable ? h(DurableAttachmentImage, {
            key: attachment.id, reference: durableRef, loadImage: state.loadImage, alt: name
          }) : h(AttachmentImage, { key: attachment.id, attachment, alt: name })) : h('div', { className: 'dsh-ia-file-glyph' }, icon('file')),
        h('dl', { className: 'dsh-ia-meta' },
          h('dt', null, translate(t, 'path')),
          h('dd', { className: 'dsh-ia-path', title: path }, path),
          Number.isFinite(attachment.file.size) ? h(React.Fragment, null,
            h('dt', null, translate(t, 'size')),
            h('dd', null, formatBytes(attachment.file.size))) : null),
        uploading ? h('div', { className: 'dsh-ia-status' }, `${translate(t, 'uploading')} · ${formatBytes(upload.loaded)}${upload.total ? ` / ${formatBytes(upload.total)}` : ''}`) : null,
        failed ? h('div', { className: 'dsh-ia-status error' }, `${translate(t, 'uploadFailed')}：${upload.message || ''}`) : null,
        reference || durable ? null : h('div', { className: 'dsh-ia-preview-actions' },
          failed ? h('button', { type: 'button', className: 'dsh-ia-button', onClick: () => conversation.retryFileUpload(sessionId, attachment.id) }, translate(t, 'retry')) : null,
          h('button', { type: 'button', className: 'dsh-ia-button danger', onClick: () => { removeAttachment({ ...props, onRemoveAttachment: props.inputActions.removeAttachment }, attachment.id, input); preview.close(); } }, translate(t, 'remove')))));
    }

    function PreviewHost({ preview, ctx, t }) {
      const state = React.useSyncExternalStore(preview.subscribe, preview.getSnapshot);
      if (!state || typeof state.sessionId !== 'string') return null;
      return h(SessionPreview, { key: state.sessionId, preview, ctx, t, sessionId: state.sessionId });
    }

    function SessionPreview({ preview, ctx, t, sessionId }) {
      const actx = ctx.sessions.scope(sessionId);
      const conversation = actx?.get('conversation');
      if (!actx || !conversation) return null;
      const keyboard = conversation.input.for(actx);
      return h(PreviewOverlay, {
        preview,
        keyboard,
        model: modelFor(keyboard),
        conversation,
        useInput: conversation.input.for(actx),
        sessionId,
        cwd: ctx.sessions.list?.getSnapshot()?.byId?.[sessionId]?.cwd || '',
        t
      });
    }

    function InlineAttachments(props) {
      const { attachments, keyboard, model, preview, useInput, inputActions, onAddFiles, onRemoveAttachment, canAcceptDrop, restorePayload, copyCache, t } = props;
      const input = useInput((value) => value);
      const [dragging, setDragging] = React.useState(false);
      const [notice, setNotice] = React.useState(null);
      const noticeTimer = React.useRef(null);
      const showNotice = React.useCallback((value) => {
        setNotice(value);
        if (noticeTimer.current !== null) clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setNotice(null), 3600);
      }, []);
      React.useEffect(() => () => { if (noticeTimer.current !== null) clearTimeout(noticeTimer.current); }, []);

      React.useLayoutEffect(() => {
        syncAttachmentNumbers(attachments, t, keyboard?.snapshot?.attachmentIds || input?.attachmentIds);
        if (!keyboard || !input || input.phase === 'adjudicating' || input.phase === 'submitting') return;
        const ids = new Set(attachments.map((attachment) => attachment.id));
        const used = new Set();
        for (const attachment of attachments) {
          let mapping = model.mappings.get(attachment.id);
          let occurrence = mapping ? input.occurrences.find((item) => sameOccurrence(item, mapping) && !used.has(item.occurrenceId)) : null;
          if (!mapping && !occurrence) {
            occurrence = input.occurrences.find((item) => nativeOccurrence(item, attachment, used));
            if (occurrence) {
              mapping = { source: occurrence.source, ref: occurrence.ref, occurrenceId: occurrence.occurrenceId, pending: false };
              model.mappings.set(attachment.id, mapping);
            }
          }
          if (occurrence && mapping) {
            used.add(occurrence.occurrenceId);
            mapping.occurrenceId = occurrence.occurrenceId;
            mapping.pending = false;
            continue;
          }
          if (mapping?.pending) continue;
          if (mapping && !occurrence) {
            model.mappings.delete(attachment.id);
            onRemoveAttachment(attachment.id);
            continue;
          }
          const reference = customReference(attachment, t);
          const nextMapping = { source: SOURCE, ref: attachment.id, occurrenceId: null, pending: true };
          model.mappings.set(attachment.id, nextMapping);
          const current = keyboard.snapshot || input;
          const caret = keyboard.caretSpan();
          const span = caret ? { ...caret, draftRev: current.draftRev } : null;
          const inserted = span ? keyboard.insertReference(reference, span) : false;
          if (!inserted) model.mappings.delete(attachment.id);
        }
        for (const id of model.mappings.keys()) if (!ids.has(id)) model.mappings.delete(id);
        const orphans = input.occurrences.filter((occurrence) => occurrence.source === SOURCE && !ids.has(occurrence.ref));
        if (orphans.length) removeOccurrences(keyboard, input, orphans);
      }, [attachments, input, keyboard, model, onRemoveAttachment, t]);

      React.useEffect(() => {
        let depth = 0;
        const hasFiles = (event) => Array.from(event.dataTransfer?.types || []).includes('Files');
        const onDragEnter = (event) => {
          if (!canAcceptDrop || !hasFiles(event)) return;
          event.preventDefault();
          depth += 1;
          setDragging(true);
        };
        const onDragOver = (event) => { if (canAcceptDrop && hasFiles(event)) event.preventDefault(); };
        const onDragLeave = (event) => {
          if (!hasFiles(event)) return;
          depth = Math.max(0, depth - 1);
          if (!depth) setDragging(false);
        };
        const onDrop = (event) => {
          if (!canAcceptDrop || !hasFiles(event)) return;
          event.preventDefault();
          depth = 0;
          setDragging(false);
          if (event.dataTransfer?.files?.length) onAddFiles(event.dataTransfer.files);
        };
        document.addEventListener('dragenter', onDragEnter);
        document.addEventListener('dragover', onDragOver);
        document.addEventListener('dragleave', onDragLeave);
        document.addEventListener('drop', onDrop);
        return () => {
          document.removeEventListener('dragenter', onDragEnter);
          document.removeEventListener('dragover', onDragOver);
          document.removeEventListener('dragleave', onDragLeave);
          document.removeEventListener('drop', onDrop);
        };
      }, [canAcceptDrop, onAddFiles]);

      React.useLayoutEffect(() => {
        const root = keyboard?.editor?.getRootElement();
        if (!root) return undefined;
        const stopWatchingNumbers = watchComposerChipNumbers(root, () => keyboard.snapshot || input, attachments);
        const resolve = (element) => {
          const chip = element.closest('span[title]');
          if (!chip || !root.contains(chip)) return null;
          const occurrences = input.occurrences.slice().sort((a, b) => a.offset - b.offset);
          const labels = new Set(occurrences.map((occurrence) => occurrence.label));
          const chips = Array.from(root.querySelectorAll('span[title]')).filter((item) => labels.has(item.getAttribute('title')));
          const occurrence = occurrences[chips.indexOf(chip)];
          if (!occurrence) return null;
          let id = null;
          for (const [attachmentId, mapping] of model.mappings) {
            if (sameOccurrence(occurrence, mapping)) { id = attachmentId; break; }
          }
          if (!id && occurrence.source === SOURCE) id = occurrence.ref;
          if (!id) {
            const attachment = attachments.find((item) => nativeOccurrence(occurrence, item, new Set()));
            id = attachment?.id || null;
          }
          if (id) return { chip, id, reference: null };
          if (occurrence.source !== SOURCE && (occurrence.appearance === 'file' || occurrence.appearance === 'folder')) {
            return { chip, id: `reference:${occurrence.occurrenceId}`, reference: occurrence };
          }
          return null;
        };
        const onMouseOver = (event) => {
          const resolved = resolve(event.target);
          if (!resolved) return;
          const rect = resolved.chip.getBoundingClientRect();
          preview.hover(props.sessionId, resolved.id, { left: rect.left, top: rect.top, bottom: rect.bottom }, false, resolved.reference);
        };
        const onMouseOut = (event) => {
          if (!resolve(event.target)) return;
          if (event.relatedTarget && resolve(event.relatedTarget)?.chip === resolve(event.target)?.chip) return;
          preview.scheduleClose();
        };
        const onPaste = async (event) => {
          const payload = payloadFromClipboard(event.clipboardData, copyCache);
          if (!payload) return;
          event.preventDefault();
          event.stopImmediatePropagation();
          showNotice({ text: translate(t, 'restoring') });
          try {
            const count = await restorePayload(payload);
            keyboard.focus();
            showNotice({ text: translate(t, 'restored', { count }) });
          } catch (error) {
            showNotice({ tone: 'error', text: translate(t, 'restoreFailed', { message: error instanceof Error ? error.message : String(error) }) });
          }
        };
        root.addEventListener('mouseover', onMouseOver);
        root.addEventListener('mouseout', onMouseOut);
        root.addEventListener('paste', onPaste, true);
        return () => {
          stopWatchingNumbers();
          root.removeEventListener('mouseover', onMouseOver);
          root.removeEventListener('mouseout', onMouseOut);
          root.removeEventListener('paste', onPaste, true);
          preview.scheduleClose();
        };
      }, [attachments, copyCache, input, keyboard, model, preview, props.sessionId, restorePayload, showNotice, t]);

      return h(React.Fragment, null,
        dragging && canAcceptDrop ? h('div', { className: 'dsh-ia-drop' }, h('span', null, translate(t, 'drop'))) : null,
        notice ? h('div', { className: `dsh-ia-notice${notice.tone === 'error' ? ' error' : ''}`, role: 'status' }, notice.text) : null);
    }

    return {
      inject: ['slots', 'sessions', 'locale', 'inputTriggers'],
      apply(ctx) {
        const preview = createPreviewStore();
        const copyCache = { current: null };
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'inline-attachments: dictionaries');
        ctx.effect(() => {
          const style = document.createElement('style');
          style.dataset.inlineAttachments = '';
          style.textContent = CSS;
          document.head.appendChild(style);
          return () => style.remove();
        }, 'inline-attachments: styles');

        const sessionInject = (sessionId) => {
          const actx = ctx.sessions.scope(sessionId);
          const conversation = actx?.get('conversation');
          if (!actx || !conversation) return { sessionId, preview, copyCache, cwd: '' };
          const keyboard = conversation.input.for(actx);
          const model = modelFor(keyboard);
          const cwd = ctx.sessions.list?.getSnapshot()?.byId?.[sessionId]?.cwd || '';
          const t = ctx.locale.bind(NS);
          const restorePayload = async (payload) => {
            const readFiles = async (binding) => {
              const files = [];
              for (const attachment of payload.attachments) {
                const reference = durableReference(attachment);
                const id = durableAttachmentId(attachment);
                const result = await binding.session.readAttachment(id);
                const name = reference?.name || result.value?.attachment?.name || translate(t, 'unknownImage');
                if (!result.ok) throw new Error(translate(t, 'readFailed', { name }));
                const data = result.value.data;
                const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
                const type = result.value.attachment.mediaType || '';
                files.push(new File([bytes], name, { type }));
              }
              return files;
            };
            const existing = ctx.sessions.binding(payload.sourceSessionId);
            const files = existing ? await readFiles(existing) : await ctx.sessions.using(payload.sourceSessionId, {
              source: 'inlineAttachmentsCopy'
            }, async (reference) => {
              const state = reference.binding.session.getSnapshot();
              if (state.openState !== 'open') throw state.openError || new Error(translate(t, 'sourceUnavailable'));
              return readFiles(reference.binding);
            });
            const drafts = files.length ? conversation.createDrafts(sessionId, files) : [];
            try {
              return restoreOrderedPayload(payload, drafts, keyboard, model, t);
            } catch (error) {
              conversation.releaseDraftAttachments(drafts);
              throw error;
            }
          };
          return { sessionId, preview, conversation, keyboard, model, restorePayload, copyCache, cwd };
        };

        ctx.effect(() => ctx.inputTriggers.registerSource({
          trigger: '@',
          name: SOURCE,
          showGroupTitle: false,
          async candidates() { return []; },
          openReference(session, reference) {
            if (reference.ref == null) return false;
            const rect = document.activeElement?.getBoundingClientRect?.();
            preview.hover(session.sessionId, reference.ref, rect ? { left: rect.left, top: rect.top, bottom: rect.bottom } : null, true);
            return true;
          },
          codec: {
            clipboardText: () => '',
            serialize: (ref) => Promise.resolve(positionMarker(ref))
          }
        }), 'inline-attachments: attachment references');

        ctx.slots.inject('conversation.input.attachments', () => ctx.slots.register({
          name: 'conversation.input.attachments', priority: -1000, locale: NS, inject: sessionInject
        }, InlineAttachments));
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay', id: 'inline-attachment-preview', order: 70
        }, (props) => h(PreviewHost, { ...props, preview, ctx, t: ctx.locale.bind(NS) })));
        ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
          name: 'conversation.chat.node', key: 'user', priority: -1000, locale: NS, inject: sessionInject
        }, (props) => h(UserMessageView, { ...props, copyCache, preview })));
      }
    };
  }
});
