import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiviumChatClient } from '../src/RiviumChatClient';
import { RealtimeService } from '../src/services/RealtimeService';
import { normalizeConfig } from '../src/RiviumChatConfig';
import type { AuthErrorEvent } from '../src/events/events';

const BASE = 'https://chat.rivium.co/api/v1';

describe('routes and bodies match the API', () => {
  let calls: Array<{ method: string; url: string; body?: unknown }>;
  let answer: unknown;

  beforeEach(() => {
    calls = [];
    answer = {};
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ method: init.method!, url, body: init.body ? JSON.parse(init.body as string) : undefined });
        return new Response(JSON.stringify(answer), { status: 200 });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  const client = () => new RiviumChatClient({ apiKey: 'rv_live_test', userId: 'alice' });
  const last = () => calls[calls.length - 1];

  it('getRoomByExternalId', async () => {
    await client().getRoomByExternalId('order/42');
    expect(last()).toMatchObject({ method: 'GET', url: `${BASE}/rooms/by-external-id/order%2F42` });
  });

  it('createRoom and addParticipant send externalUserId', async () => {
    await client().createRoom('Order 42', { participants: [{ userId: 'alice' }, { userId: 'bob', role: 'admin' }] });
    expect(last().body).toEqual({
      name: 'Order 42',
      participants: [{ externalUserId: 'alice' }, { externalUserId: 'bob', role: 'admin' }],
    });

    await client().addParticipant('r1', 'carol', { displayName: 'Carol' });
    expect(last()).toMatchObject({
      method: 'POST',
      url: `${BASE}/rooms/r1/participants`,
      body: { externalUserId: 'carol', displayName: 'Carol' },
    });
  });

  it('message actions use /messages/:id', async () => {
    const c = client();
    await c.deleteMessage('r1', 'm1');
    expect(last()).toMatchObject({ method: 'DELETE', url: `${BASE}/messages/m1?userId=alice` });

    await c.editMessage('r1', 'm1', 'fixed');
    expect(last()).toMatchObject({ method: 'PUT', url: `${BASE}/messages/m1`, body: { userId: 'alice', content: 'fixed' } });

    answer = [];
    await c.getReactions('r1', 'm1');
    expect(last()).toMatchObject({ method: 'GET', url: `${BASE}/messages/m1/reactions` });

    answer = {};
    await c.pinMessage('r1', 'm1');
    expect(last()).toMatchObject({ method: 'POST', url: `${BASE}/messages/m1/pin`, body: { userId: 'alice' } });

    await c.unpinMessage('r1', 'm1');
    expect(last()).toMatchObject({ method: 'DELETE', url: `${BASE}/messages/m1/pin`, body: { userId: 'alice' } });
  });

  it('markAsRead sends only userId', async () => {
    await client().markAsRead('r1', 'm9');
    expect(last()).toMatchObject({ method: 'POST', url: `${BASE}/rooms/r1/read` });
    expect(last().body).toEqual({ userId: 'alice' });
  });

  it('getMessages, searchMessages and getMentions send userId', async () => {
    const c = client();
    answer = { messages: [], hasMore: false };
    await c.getMessages('r1');
    expect(last().url).toBe(`${BASE}/rooms/r1/messages?userId=alice&limit=50`);

    answer = { messages: [{ id: 'm1' }], total: 3 };
    const found = await c.searchMessages('r1', 'hi', { limit: 1 });
    expect(last().url).toBe(`${BASE}/rooms/r1/messages/search?userId=alice&q=hi&limit=1`);
    expect(found).toMatchObject({ total: 3, totalCount: 3, hasMore: true });

    answer = [{ id: 'x', messageId: 'm1', roomId: 'r1', mentionedUserId: 'alice', createdAt: 't', message: { id: 'm1' } }];
    const [mention] = await c.getMentions('r1');
    expect(last().url).toBe(`${BASE}/rooms/r1/mentions?userId=alice`);
    expect(mention).toMatchObject({ userId: 'alice', mentionedAt: 't' });
  });

  it('uploadFile and updateRoom fail clearly without a network call', async () => {
    const c = client();
    await expect(c.uploadFile('r1', new Blob(['x']), 'x.txt')).rejects.toThrow(/not supported.*send its URL as an attachment/);
    await expect(c.updateRoom('r1', { name: 'x' })).rejects.toThrow(/not supported/);
    expect(calls).toHaveLength(0);
  });
});

/** Minimal stand-in for a centrifuge Subscription. */
function fakeSub() {
  const handlers: Record<string, Array<(ctx: any) => void>> = {};
  return {
    published: [] as unknown[],
    on(event: string, cb: (ctx: any) => void) {
      (handlers[event] ??= []).push(cb);
      return this;
    },
    fire(event: string, ctx: unknown) {
      (handlers[event] ?? []).forEach((cb) => cb(ctx));
    },
    subscribe() {},
    async publish(data: unknown) {
      this.published.push(data);
    },
    presence: async () => ({ clients: {} }),
  };
}

describe('realtime', () => {
  const service = () => new RealtimeService(normalizeConfig({ apiKey: 'rv_live_test', userId: 'alice' }), async () => 'token');

  it("live deletions published as 'deleted' arrive (and the old name still works)", () => {
    const s = service();
    const got: string[] = [];
    s.on('messageDeleted', (e) => got.push(e.messageId));

    (s as any).handleChatPublication('r1', { event: 'deleted', data: { messageId: 'm1', roomId: 'r1', deletedBy: 'bob' } });
    (s as any).handleChatPublication('r1', { event: 'message_deleted', data: { messageId: 'm2' } });

    expect(got).toEqual(['m1', 'm2']);
  });

  it('a failed catch-up after reconnect fires recoveryFailed', () => {
    const s = service();
    const subs: Record<string, ReturnType<typeof fakeSub> & { options?: any }> = {};
    (s as any).client = {
      newSubscription: (channel: string, options?: unknown) => {
        subs[channel] = Object.assign(fakeSub(), { options });
        return subs[channel];
      },
    };
    const failed: string[] = [];
    s.on('recoveryFailed', (e) => failed.push(e.roomId));

    s.observeRoom('r1');
    const chat = subs['chat:room_r1'];
    expect(chat.options).toMatchObject({ recoverable: true });

    chat.fire('subscribed', { wasRecovering: true, recovered: true });
    expect(failed).toEqual([]);
    chat.fire('subscribed', { wasRecovering: true, recovered: false });
    expect(failed).toEqual(['r1']);
  });

  it('typing is throttled per room, not across rooms', async () => {
    const s = service();
    const published: string[] = [];
    const subs = (s as any).subscriptions as Map<string, unknown>;
    for (const room of ['r1', 'r2']) {
      subs.set(`typing:room_${room}`, { publish: async () => published.push(room) });
    }

    await s.publishTyping('r1');
    await s.publishTyping('r2');
    await s.publishTyping('r1'); // within 2 s of the first: dropped

    expect(published).toEqual(['r1', 'r2']);
  });

  it('sendTypingIndicator goes over the realtime channel, not HTTP', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const c = new RiviumChatClient({ apiKey: 'rv_live_test', userId: 'alice' });
    const sub = fakeSub();
    ((c as any).realtimeService.subscriptions as Map<string, unknown>).set('typing:room_r1', sub);

    await c.sendTypingIndicator('r1', false);

    expect(sub.published).toEqual([{ userId: 'alice', isTyping: false }]);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('a failing tokenProvider during connect() is reported as token_provider_failed', async () => {
    const authErrors: AuthErrorEvent[] = [];
    const c = new RiviumChatClient({
      apiKey: 'rv_live_test',
      userId: 'alice',
      tokenProvider: async () => {
        throw new Error('your server is down');
      },
    });
    c.on('authError', (e) => authErrors.push(e));

    await expect(c.connect()).rejects.toThrow('your server is down');
    expect(authErrors.map((e) => e.code)).toEqual(['token_provider_failed']);
  });
});
