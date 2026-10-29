import React from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useChatChannel } from '../src/hooks/useChatChannel';
import { ChatMessageBubble } from '../src/components/ChatMessageBubble';
import { RiviumChatProvider, type Message } from '../src/state/RiviumChatProvider';
import { fakeClient, history, message } from './fakeClient';

afterEach(() => cleanup());

const CMID = '0b6d1c1e-8a3f-4f7e-9c1d-2a5b6c7d8e9f';

/** What the core client returns for a send it queued offline (no attachments key, like the core). */
function queued(content: string, clientMessageId = CMID): Message {
  const m = message('q1', {
    id: `local_${clientMessageId}`,
    senderUserId: 'user-42',
    content,
    clientMessageId,
    isPending: true,
  });
  delete (m as any).attachments;
  return m;
}

/** The stored message the server answers / publishes. */
function stored(content: string, clientMessageId = CMID, id = 'm99'): Message {
  return message(id, { senderUserId: 'user-42', content, clientMessageId });
}

function setup(client: ReturnType<typeof fakeClient>) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RiviumChatProvider client={client as any}>{children}</RiviumChatProvider>
  );
  return renderHook(() => useChatChannel('room-1', 'user-42'), { wrapper });
}

const withText = (hook: ReturnType<typeof setup>, text: string) =>
  hook.result.current.messages.filter((m) => m.content === text);

describe('useChatChannel with queueOfflineMessages on', () => {
  it('a queued send is shown as waiting (not failed) and replaced on messageSent; the live event later adds nothing', async () => {
    const client = fakeClient(history(3), { queueOfflineMessages: true });
    client.sendMessage.mockImplementation(async () => queued('Order #1001 is ready') as any);
    const hook = setup(client);
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));

    await act(async () => hook.result.current.sendMessage('Order #1001 is ready'));
    const [waiting] = withText(hook, 'Order #1001 is ready');
    expect(waiting).toMatchObject({ id: `local_${CMID}`, isPending: true, isQueued: true, isFailed: false });

    act(() => client.emit('messageSent', { localId: `local_${CMID}`, clientMessageId: CMID, message: stored('Order #1001 is ready') }));
    expect(withText(hook, 'Order #1001 is ready')).toHaveLength(1);
    expect(withText(hook, 'Order #1001 is ready')[0].id).toBe('m99');

    act(() => client.emit('message', { message: stored('Order #1001 is ready') }));
    expect(withText(hook, 'Order #1001 is ready')).toHaveLength(1);
  });

  it('the live message event before messageSent: shown once', async () => {
    const client = fakeClient(history(3), { queueOfflineMessages: true });
    client.sendMessage.mockImplementation(async () => queued('Order #1001 is ready') as any);
    const hook = setup(client);
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));
    await act(async () => hook.result.current.sendMessage('Order #1001 is ready'));

    act(() => client.emit('message', { message: stored('Order #1001 is ready') }));
    act(() => client.emit('messageSent', { localId: `local_${CMID}`, clientMessageId: CMID, message: stored('Order #1001 is ready') }));
    expect(withText(hook, 'Order #1001 is ready').map((m) => m.id)).toEqual(['m99']);
  });

  it('online: the live event comes before sendMessage resolves: shown once', async () => {
    const client = fakeClient(history(3), { queueOfflineMessages: true });
    let resolve!: (m: Message) => void;
    client.sendMessage.mockImplementation(() => new Promise<any>((r) => (resolve = r)));
    const hook = setup(client);
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));
    let sending!: Promise<void>;
    act(() => {
      sending = hook.result.current.sendMessage('Order #1001 is ready');
    });
    act(() => client.emit('message', { message: stored('Order #1001 is ready') }));
    await act(async () => {
      resolve(stored('Order #1001 is ready'));
      await sending;
    });
    expect(withText(hook, 'Order #1001 is ready')).toHaveLength(1);
  });

  it('two queued messages with the same text are matched by clientMessageId', async () => {
    const client = fakeClient(history(3), { queueOfflineMessages: true });
    const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
    let n = 0;
    client.sendMessage.mockImplementation(async () => queued('ok', ids[n++]) as any);
    const hook = setup(client);
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));
    await act(async () => hook.result.current.sendMessage('ok'));
    await act(async () => hook.result.current.sendMessage('ok'));

    act(() => client.emit('message', { message: stored('ok', ids[0], 'm50') }));
    const oks = withText(hook, 'ok');
    expect(oks).toHaveLength(2);
    expect(oks.find((m) => m.clientMessageId === ids[0])?.id).toBe('m50');
    expect(oks.find((m) => m.clientMessageId === ids[1])?.isQueued).toBe(true);
  });

  it('messageFailed marks it failed; retry sends it again', async () => {
    const client = fakeClient(history(3), { queueOfflineMessages: true });
    client.sendMessage.mockImplementationOnce(async () => queued('Order #1001 is ready') as any);
    const hook = setup(client);
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));
    await act(async () => hook.result.current.sendMessage('Order #1001 is ready'));

    act(() =>
      client.emit('messageFailed', {
        localId: `local_${CMID}`, clientMessageId: CMID, roomId: 'room-1', error: new Error('HTTP error 403'), reason: 'rejected',
      }),
    );
    expect(withText(hook, 'Order #1001 is ready')[0]).toMatchObject({ isFailed: true, isPending: false, isQueued: false });

    client.sendMessage.mockImplementationOnce(async () => stored('Order #1001 is ready', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') as any);
    await act(async () => hook.result.current.retryMessage(`local_${CMID}`));
    expect(withText(hook, 'Order #1001 is ready').map((m) => m.id)).toEqual(['m99']);
  });

  it('shows messages still waiting in the outbox when the screen opens; a reload with the stored copy drops it', async () => {
    const client = fakeClient(history(3), { queueOfflineMessages: true });
    (client as any).pending = [queued('Order #1001 is ready')];
    const hook = setup(client);
    await waitFor(() => expect(withText(hook, 'Order #1001 is ready')).toHaveLength(1));
    expect(withText(hook, 'Order #1001 is ready')[0].isQueued).toBe(true);

    client.store = [...client.store, stored('Order #1001 is ready')];
    await act(async () => hook.result.current.refresh());
    expect(withText(hook, 'Order #1001 is ready').map((m) => m.id)).toEqual(['m99']);
  });
});

describe('ChatMessageBubble', () => {
  it('a queued message reads "Waiting for network…"; a failed one shows Retry', () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ChatMessageBubble message={{ ...queued('Order #1001 is ready'), isQueued: true }} isMe onRetry={onRetry} />,
    );
    expect(screen.getByText('Waiting for network…')).toBeTruthy();
    expect(screen.queryByText('Retry')).toBeNull();

    rerender(
      <ChatMessageBubble
        message={{ ...queued('Order #1001 is ready'), isPending: false, isFailed: true, isQueued: false }}
        isMe
        onRetry={onRetry}
      />,
    );
    expect(screen.queryByText('Waiting for network…')).toBeNull();
    fireEvent.click(screen.getByText('Retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('queueOfflineMessages off: unchanged', () => {
  it('a send that rejects is marked failed, never waiting', async () => {
    const client = fakeClient();
    client.sendMessage.mockImplementation(async () => {
      throw new TypeError('Network request failed');
    });
    const hook = setup(client);
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));
    await act(async () => hook.result.current.sendMessage('Order #1001 is ready'));
    expect(withText(hook, 'Order #1001 is ready')[0]).toMatchObject({ isFailed: true, isPending: false });
    expect(withText(hook, 'Order #1001 is ready')[0].isQueued).toBeUndefined();
  });
});
