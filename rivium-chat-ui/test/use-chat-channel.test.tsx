import React from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useChatChannel } from '../src/hooks/useChatChannel';
import { RiviumChatProvider } from '../src/state/RiviumChatProvider';
import { fakeClient, message } from './fakeClient';

afterEach(() => cleanup());

function setup(client = fakeClient()) {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RiviumChatProvider client={client as any}>{children}</RiviumChatProvider>
  );
  const hook = renderHook(() => useChatChannel('room-1', 'user-42'), { wrapper });
  return { client, hook };
}
const followed = (client: ReturnType<typeof fakeClient>) =>
  client.subscribeToRoom.mock.results.filter((r) => r.type === 'return').length;

describe('useChatChannel inside RiviumChatProvider (autoConnect)', () => {
  it('loads the messages and follows the room once connected (no "Not connected" error)', async () => {
    const { client, hook } = setup();
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));
    await waitFor(() => expect(followed(client)).toBe(1));
    expect(hook.result.current.error).toBeNull();
  });

  it('follows the room again after a reconnect and reloads what was missed', async () => {
    const { client, hook } = setup();
    await waitFor(() => expect(followed(client)).toBe(1));

    client.store = [...client.store, message('m4')];
    act(() => client.disconnect());
    await act(async () => {
      await client.connect();
    });

    await waitFor(() => expect(followed(client)).toBe(2));
    await waitFor(() => expect(hook.result.current.messages[0].id).toBe('m4'));
  });

  it('recoveryFailed for the room reloads its history', async () => {
    const { client, hook } = setup();
    await waitFor(() => expect(hook.result.current.messages).toHaveLength(3));

    client.store = [...client.store, message('m4')];
    act(() => client.emit('recoveryFailed', { roomId: 'room-1' }));
    await waitFor(() => expect(hook.result.current.messages[0].id).toBe('m4'));
  });

  it('exposes the participants display names', async () => {
    const client = fakeClient();
    client.getRoom.mockResolvedValue({
      id: 'room-1',
      participants: [
        { id: 'p1', externalUserId: 'user-7', displayName: 'Jordan', locale: null, role: 'member', lastReadAt: null, joinedAt: '' },
      ],
    } as any);
    const { hook } = setup(client);
    await waitFor(() => expect(hook.result.current.displayNames).toEqual({ 'user-7': 'Jordan' }));
  });
});
