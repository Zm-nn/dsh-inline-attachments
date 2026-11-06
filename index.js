const POSITION_MARKER = /\uE000inline-attachment:([^\uE001]+)\uE001|【\s*(图片|文件)\s*(\d+)\s*：([^】\n]+)】/gu;
const READABLE_MARKER = /【\s*(?:图片|文件)\s*\d+\s*：[^】\n]+】/u;

function hasPositionMarker(text) {
  return text.includes('\uE000inline-attachment:') || READABLE_MARKER.test(text);
}

function numberedAttachmentName(attachment, number) {
  const rawName = String(attachment.attachment?.name || '');
  const extension = rawName.match(/\.[A-Za-z0-9]{1,10}$/)?.[0] || (attachment.type === 'image' ? '.png' : '');
  return `${attachment.type === 'image' ? 'image' : 'file'}${number}${extension}`;
}

/**
 * Rebuild the user's content blocks from the markers emitted by the composer.
 * The Host initially places durable attachments before the serialized text;
 * numbered markers identify their positions in attachment-list order.
 */
export function interleaveContent(content) {
  if (!Array.isArray(content)) return content;
  const attachments = content.filter((block) => block?.type === 'image' || block?.type === 'file');
  if (!attachments.length || !content.some((block) => block?.type === 'text' && hasPositionMarker(block.text))) return content;

  const remaining = attachments.slice();
  const assigned = new Map();
  const output = [];
  const attachmentFor = (match) => {
    const readable = match[2] !== undefined;
    const key = readable ? `readable:${match[3]}` : `legacy:${match[1]}`;
    if (assigned.has(key)) return assigned.get(key);
    let attachment;
    if (readable) {
      const candidate = attachments[Number(match[3]) - 1];
      if (candidate && remaining.includes(candidate)) attachment = candidate;
    }
    if (attachment) remaining.splice(remaining.indexOf(attachment), 1);
    else attachment = remaining.shift();
    if (attachment) assigned.set(key, attachment);
    return attachment;
  };

  for (const block of content) {
    if (block?.type === 'image' || block?.type === 'file') continue;
    if (block?.type !== 'text' || typeof block.text !== 'string' || !hasPositionMarker(block.text)) {
      output.push(block);
      continue;
    }
    let cursor = 0;
    for (const match of block.text.matchAll(POSITION_MARKER)) {
      const plain = block.text.slice(cursor, match.index);
      if (plain) output.push({ type: 'text', text: plain });
      const attachment = attachmentFor(match);
      if (attachment) {
        const number = attachments.indexOf(attachment) + 1;
        const name = numberedAttachmentName(attachment, number);
        // Keep a short ASCII caption beside the real attachment. The Client
        // recognizes it and renders only the compact chip with the same name.
        output.push({ type: 'text', text: `【${name}】` }, attachment);
      }
      cursor = match.index + match[0].length;
    }
    const plain = block.text.slice(cursor);
    if (plain) output.push({ type: 'text', text: plain });
  }
  for (let index = remaining.length - 1; index >= 0; index -= 1) output.unshift(remaining[index]);
  return output;
}

export function interleaveUserMessage(message) {
  if (message?.role !== 'user' || !Array.isArray(message.content)) return message;
  const content = interleaveContent(message.content);
  return content === message.content ? message : { ...message, content };
}

/** Host half: turn the composer's markers into real content blocks before admission. */
export function apply(ctx) {
  ctx.on('agent/pre-step', async (_payload, next) => {
    const decision = await next();
    if (decision?.kind !== 'enter' || !Array.isArray(decision.messages)) return decision;
    return { ...decision, messages: decision.messages.map(interleaveUserMessage) };
  });
}
