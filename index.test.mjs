import assert from 'node:assert/strict';
import { apply, interleaveContent, interleaveUserMessage } from './index.js';

const image1 = { type: 'image', attachment: { attachmentId: 'image-1', name: '第一张.png', mediaType: 'image/png' } };
const image2 = { type: 'image', attachment: { attachmentId: 'image-2', name: '第二张.png', mediaType: 'image/png' } };
const markedText = { type: 'text', text: '你好【图片1：第一张.png】，你好【图片2：第二张.png】' };
const content = interleaveContent([image1, image2, markedText]);
assert.deepEqual(content.map((block) => block.type), ['text', 'text', 'image', 'text', 'text', 'image']);
assert.equal(content[2], image1, 'the first numbered caption must sit beside the first real image');
assert.equal(content[5], image2, 'the second numbered caption must sit beside the second real image');
assert.deepEqual(content.filter((block) => block.type === 'text').map((block) => block.text), [
  '你好', '【image1.png】', '，你好', '【image2.png】'
]);

const legacy = interleaveContent([image1, { type: 'text', text: '前\uE000inline-attachment:draft-0\uE001后' }]);
assert.deepEqual(legacy.map((block) => block.type), ['text', 'text', 'image', 'text'], 'legacy private markers must remain supported');
assert.equal(legacy[1].text, '【image1.png】', 'legacy markers must also gain a short ASCII name');
assert.equal(legacy[2], image1);

const plain = [{ type: 'text', text: '用户手写的【图片1：不是附件】' }];
assert.equal(interleaveContent(plain), plain, 'marker-like text without attachments must remain untouched');

const message = { role: 'user', id: 'message-1', source: { kind: 'user' }, content: [image1, image2, markedText] };
const transformed = interleaveUserMessage(message);
assert.equal(transformed.id, message.id);
assert.equal(transformed.source, message.source);
assert.equal(message.content[2], markedText, 'the source message must not be mutated');
assert.deepEqual(transformed.content.map((block) => block.type), ['text', 'text', 'image', 'text', 'text', 'image']);

let listener;
apply({
  on(name, callback) {
    assert.equal(name, 'agent/pre-step');
    listener = callback;
  }
});
assert.equal(typeof listener, 'function');
const decision = await listener({}, async () => ({ kind: 'enter', messages: [message], startsRequestSeries: true }));
assert.equal(decision.kind, 'enter');
assert.equal(decision.startsRequestSeries, true, 'other pre-step decision fields must be preserved');
assert.deepEqual(decision.messages[0].content.map((block) => block.type), ['text', 'text', 'image', 'text', 'text', 'image']);
const rejected = { kind: 'reject' };
assert.equal(await listener({}, async () => rejected), rejected, 'a downstream rejection must pass through unchanged');

console.log('Host numbered interleaving tests OK');
