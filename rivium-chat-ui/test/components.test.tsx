import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatAttachmentPicker, type SelectedAttachment } from '../src/components/ChatAttachmentPicker';
import { ChatInputField } from '../src/components/ChatInputField';
import { MessageSearchBar, HighlightedText } from '../src/components/MessageSearchBar';
import { VoiceMessagePlayer } from '../src/components/VoiceMessageRecorder';
import { ChatScreen } from '../src/components/ChatScreen';
import { RiviumChatProvider } from '../src/state/RiviumChatProvider';
import { fakeClient, message } from './fakeClient';

afterEach(() => cleanup());

const file = (name: string, mimeType: string, size: number): SelectedAttachment => ({
  id: name, uri: `file:///tmp/${name}`, name, mimeType, size,
});

describe('ChatAttachmentPicker limits', () => {
  function setup(props: Partial<React.ComponentProps<typeof ChatAttachmentPicker>>, files: SelectedAttachment[]) {
    const onAttachmentsSelected = vi.fn();
    const onError = vi.fn();
    render(
      <ChatAttachmentPicker
        visible
        onClose={() => {}}
        onAttachmentsSelected={onAttachmentsSelected}
        onError={onError}
        options={[{ id: 'files', label: 'Files', icon: '📄', onPress: (add) => add?.(files) }]}
        {...props}
      />,
    );
    fireEvent.click(screen.getByText('Files'));
    return { onAttachmentsSelected, onError };
  }

  it('refuses a file over maxFileSize and tells the user', () => {
    const { onAttachmentsSelected, onError } = setup({ maxFileSize: 1000 }, [
      file('invoice.pdf', 'application/pdf', 5000),
      file('photo.jpg', 'image/jpeg', 500),
    ]);
    expect(screen.getByText(/"invoice.pdf" is larger than the maximum of 1000 B/)).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('invoice.pdf'));

    fireEvent.click(screen.getByText('Send'));
    expect(onAttachmentsSelected).toHaveBeenCalledWith([expect.objectContaining({ name: 'photo.jpg' })]);
  });

  it('refuses a type not in allowedTypes (wildcards like image/* work)', () => {
    const { onAttachmentsSelected, onError } = setup({ allowedTypes: ['image/*', 'application/pdf'] }, [
      file('song.mp3', 'audio/mpeg', 10),
      file('photo.png', 'image/png', 10),
      file('invoice.pdf', 'application/pdf', 10),
    ]);
    expect(screen.getByText(/song.mp3.*not allowed/)).toBeTruthy();
    expect(onError).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Send'));
    expect(onAttachmentsSelected.mock.calls[0][0].map((a: SelectedAttachment) => a.name)).toEqual(['photo.png', 'invoice.pdf']);
  });

  it('refuses more than maxAttachments', () => {
    const { onAttachmentsSelected } = setup({ maxAttachments: 1 }, [file('a.jpg', 'image/jpeg', 1), file('b.jpg', 'image/jpeg', 1)]);
    expect(screen.getByText(/at most 1 attachment/i)).toBeTruthy();
    fireEvent.click(screen.getByText('Send'));
    expect(onAttachmentsSelected.mock.calls[0][0]).toHaveLength(1);
  });
});

describe('ChatInputField emoji button', () => {
  it('shows an emoji button only when onEmojiPress is given, and calls it', () => {
    const onEmojiPress = vi.fn();
    const { rerender } = render(<ChatInputField onSendMessage={() => {}} />);
    expect(screen.queryByLabelText('Emoji')).toBeNull();

    rerender(<ChatInputField onSendMessage={() => {}} onEmojiPress={onEmojiPress} />);
    fireEvent.click(screen.getByLabelText('Emoji'));
    expect(onEmojiPress).toHaveBeenCalledTimes(1);
  });
});

describe('MessageSearchBar results', () => {
  const results = [
    { messageId: 'm1', content: 'Order #1001 shipped', senderName: 'Jordan', timestamp: new Date(2026, 0, 1, 9, 5) },
    { messageId: 'm2', content: 'Order #1001 delivered', timestamp: new Date(2026, 0, 2, 10, 0) },
  ];

  it('lists the results and calls onResultSelected on tap', () => {
    const onResultSelected = vi.fn();
    render(<MessageSearchBar onSearch={() => {}} results={results} onResultSelected={onResultSelected} />);
    fireEvent.change(screen.getByPlaceholderText('Search messages...'), { target: { value: 'Order' } });

    expect(screen.getByText('1 of 2')).toBeTruthy();
    expect(screen.getByText('Jordan')).toBeTruthy();
    fireEvent.click(screen.getByText(/delivered/).closest('button')!);
    expect(onResultSelected).toHaveBeenCalledWith(results[1]);
  });

  it('a query with regex characters does not crash the highlight', () => {
    render(<HighlightedText text="Order #1001 (paid)" query="(paid" />);
    expect(screen.getByText('(paid')).toBeTruthy();
  });
});

describe('VoiceMessagePlayer with an audio player', () => {
  it('plays the uri through the given player and shows the progress', async () => {
    let progress: ((positionMs: number, durationMs: number) => void) | undefined;
    let ended: (() => void) | undefined;
    const audioPlayer = {
      play: vi.fn((_uri: string, callbacks: { onProgress: typeof progress; onEnd: typeof ended }) => {
        progress = callbacks.onProgress;
        ended = callbacks.onEnd;
      }),
      pause: vi.fn(),
    };
    render(<VoiceMessagePlayer uri="https://cdn.example.com/voice/1.m4a" durationMs={3000} audioPlayer={audioPlayer} />);

    fireEvent.click(screen.getByLabelText('Play'));
    expect(audioPlayer.play).toHaveBeenCalledWith('https://cdn.example.com/voice/1.m4a', expect.any(Object));

    act(() => progress!(1500, 3000));
    expect(screen.getByText('0:01')).toBeTruthy();
    expect(screen.getByLabelText('Played 50%')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Pause'));
    expect(audioPlayer.pause).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Play'));
    act(() => ended!());
    expect(screen.getByText('0:03')).toBeTruthy();
    expect(screen.getByLabelText('Play')).toBeTruthy();
  });
});

describe('ChatScreen attachments', () => {
  it('uploads picked files with fileUploader, shows the upload, then sends them', async () => {
    const client = fakeClient([message('m1')]);
    let finish!: (a: any) => void;
    const fileUploader = {
      uploadFile: vi.fn(() => new Promise<any>((r) => (finish = r))),
    };
    render(
      <RiviumChatProvider client={client as any}>
        <ChatScreen
          roomId="room-1"
          currentUserId="user-42"
          fileUploader={fileUploader}
          attachmentOptions={[{ id: 'files', label: 'Files', icon: '📄', onPress: (add) => add?.([file('receipt.jpg', 'image/jpeg', 10)]) }]}
        />
      </RiviumChatProvider>,
    );
    await screen.findByText(/Order #1001 update m1/);

    fireEvent.click(screen.getByText('📎'));
    fireEvent.click(screen.getByText('Files'));
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => expect(fileUploader.uploadFile).toHaveBeenCalledWith('file:///tmp/receipt.jpg', 'image/jpeg', 'receipt.jpg'));
    expect(screen.getByText('Uploading...')).toBeTruthy();
    expect((screen.getByPlaceholderText('Type a message...') as HTMLInputElement).disabled).toBe(true);

    await act(async () => finish({ url: 'https://cdn.example.com/receipt.jpg', mimeType: 'image/jpeg', name: 'receipt.jpg', size: 10 }));
    await waitFor(() => expect(client.sendMessage).toHaveBeenCalled());
    const [, , options] = client.sendMessage.mock.calls[0] as any[];
    expect(options.attachments[0].url).toBe('https://cdn.example.com/receipt.jpg');
    await waitFor(() => expect(screen.queryByText('Uploading...')).toBeNull());
  });
});
