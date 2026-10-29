import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatScreen } from '../src/components/ChatScreen';
import { RiviumChatProvider } from '../src/state/RiviumChatProvider';
import { fakeClient, message } from './fakeClient';

afterEach(() => cleanup());

function renderScreen(client: ReturnType<typeof fakeClient>, props: Partial<React.ComponentProps<typeof ChatScreen>> = {}) {
  return render(
    <RiviumChatProvider client={client as any}>
      <ChatScreen roomId="room-1" currentUserId="user-42" {...props} />
    </RiviumChatProvider>,
  );
}

function typeAndSend(text: string) {
  fireEvent.change(screen.getByPlaceholderText('Type a message...'), { target: { value: text } });
  fireEvent.click(screen.getByText('↑'));
}

describe('ChatScreen props', () => {
  it('showTypingIndicator={false} hides "is typing"; default shows it', async () => {
    const client = fakeClient();
    const { unmount } = renderScreen(client);
    await screen.findByText(/Order #1001 update m3/);
    act(() => client.emit('typing', { roomId: 'room-1', userId: 'user-7', isTyping: true }));
    expect(await screen.findByText(/user-7 is typing/)).toBeTruthy();
    unmount();

    const quiet = fakeClient();
    renderScreen(quiet, { showTypingIndicator: false });
    await screen.findByText(/Order #1001 update m3/);
    act(() => quiet.emit('typing', { roomId: 'room-1', userId: 'user-7', isTyping: true }));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/is typing/)).toBeNull();
  });

  it('showReadReceipts={false} never shows a message as read', async () => {
    const mine = [message('m1', { senderUserId: 'user-42' })];
    const room = {
      id: 'room-1',
      participants: [{ id: 'p1', externalUserId: 'user-7', displayName: null, locale: null, role: 'member', lastReadAt: '2030-01-01T00:00:00Z', joinedAt: '' }],
    };
    const client = fakeClient(mine);
    client.getRoom.mockResolvedValue(room as any);
    const { unmount } = renderScreen(client);
    expect(await screen.findByText('✓✓')).toBeTruthy();
    unmount();

    const quiet = fakeClient(mine);
    quiet.getRoom.mockResolvedValue(room as any);
    renderScreen(quiet, { showReadReceipts: false });
    await screen.findByText(/Order #1001 update m1/);
    await waitFor(() => expect(quiet.getRoom).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText('✓✓')).toBeNull();
  });

  it('emptyStateTitle / emptyStateSubtitle replace the empty room text', async () => {
    renderScreen(fakeClient([]), { emptyStateTitle: 'Ask about Order #1001', emptyStateSubtitle: 'We usually answer within an hour' });
    expect(await screen.findByText('Ask about Order #1001')).toBeTruthy();
    expect(screen.getByText('We usually answer within an hour')).toBeTruthy();
    expect(screen.queryByText('No messages yet')).toBeNull();
  });

  it('onSendMessage is told about each message; the kit still sends it', async () => {
    const client = fakeClient();
    const onSendMessage = vi.fn();
    renderScreen(client, { onSendMessage });
    await screen.findByText(/Order #1001 update m3/);

    typeAndSend('Where is Order #1001?');
    expect(onSendMessage).toHaveBeenCalledWith('Where is Order #1001?');
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalledWith('room-1', 'Where is Order #1001?', expect.anything()));
  });

  it('onSendMessage returning false takes over: the kit does not send', async () => {
    const client = fakeClient();
    const onSendMessage = vi.fn(() => false);
    renderScreen(client, { onSendMessage });
    await screen.findByText(/Order #1001 update m3/);

    typeAndSend('/refund Order #1001');
    expect(onSendMessage).toHaveBeenCalledWith('/refund Order #1001');
    await new Promise((r) => setTimeout(r, 20));
    expect(client.sendMessage).not.toHaveBeenCalled();
  });
});
