# RiviumChat React Native SDK

Real-time messaging SDK for React Native. Add chat to your app with pre-built UI components, real-time messaging, read receipts, typing indicators, reactions, and push notifications.

## Features

- Real-time messaging via WebSocket (<50ms latency)
- Pre-built React Native UI components (chat screen, message bubbles, input field, typing indicator, etc.)
- Read receipts with delivery status (sent, delivered, read)
- Emoji reactions and message pinning
- Typing and presence indicators
- Threaded replies
- File and image sharing with inline previews
- Full-text message search
- Unread message counts
- Push notifications via [Rivium Push](https://rivium.co/cloud/rivium-push) for offline users
- Customizable theming
- TypeScript declarations included

## Installation

```bash
npm install @rivium/react-native-chat
# or
yarn add @rivium/react-native-chat
```

For UI components:

```bash
npm install @rivium/react-native-chat-ui
```

## Quick Start

```typescript
import { RiviumChatClient } from '@rivium/react-native-chat';

const client = new RiviumChatClient({
  apiKey: 'your_api_key',
  userId: 'user-123',
  userInfo: { displayName: 'John' },
});

await client.connect();
```

### Secure user identity (recommended)

Your API key ships inside the app, so on its own it cannot prove who the user
is. Add a `tokenProvider` that asks **your server** for a user token:

```typescript
const client = new RiviumChatClient({
  apiKey: 'your_api_key',
  userId: 'user-123',
  tokenProvider: async () => {
    const res = await fetch('https://your-api.example.com/chat-token', {
      headers: { Authorization: `Bearer ${yourSessionToken}` },
    });
    return (await res.json()).token;
  },
});

client.on('authError', () => signOut()); // revoked or invalid token
```

Your server mints it with the Node SDK (never put the server secret in the app):

```typescript
const { token } = await riviumChat.users.createToken({ userId: 'user-123' });
```

Tokens last 1 hour. The SDK refreshes them before they expire and retries a
request once if the server reports an expired token, so users never notice.

### Create a Room

```typescript
const room = await client.findOrCreateRoom({
  externalId: 'order-123',
  participants: [
    { externalUserId: 'user-123', displayName: 'John', role: 'member' },
    { externalUserId: 'user-456', displayName: 'Jane', role: 'member' },
  ],
});
```

### Send a Message

```typescript
const message = await client.sendMessage(room.id, 'Hello!');
```

### Listen for Real-Time Events

```typescript
client.on('message', (event) => {
  console.log('New message:', event.message.content);
});

client.on('typing', (event) => {
  console.log(`${event.userId} is typing`);
});

client.on('presence', (event) => {
  console.log(`${event.userId} is online: ${event.isOnline}`);
});
```

### Sending while offline

Messages written without network can wait in an outbox and be sent when the connection is back, in the order they were written and never twice. It is off by default: without it, `sendMessage()` without network rejects as before.

```typescript
const client = new RiviumChatClient({
  apiKey: 'rv_live_...',
  userId: 'user-42',
  tokenProvider,
  queueOfflineMessages: true,
});
```

With the option on:

- Every message is sent with a `clientMessageId`, so a send that is retried is stored only once.
- When the message cannot be sent now (no network, timeout, 408, 429, 5xx), `sendMessage()` does not reject: it returns the message as pending (`isPending: true`, `id: "local_<clientMessageId>"`). It is sent when the connection comes back, or earlier on a retry (after 2 s, 4 s, 8 s … at most every 60 s).
- When the Chat API refuses the message (400, 401, 403, 404, 413, for example the user is not a member of the room), `sendMessage()` rejects as before.
- A message that waits longer than 24 hours is dropped as failed.
- Attachments are sent as they are: upload the file first and send its URL.
- `queueOfflineMessages` needs the current Chat API.

```typescript
const pending = await client.sendMessage(roomId, 'Order #1001 is ready');

client.onMessageSent(({ localId, clientMessageId, message }) => {
  // the queued message was stored: replace the pending copy (localId) with message
});

client.onMessageFailed(({ localId, roomId, reason, error }) => {
  // reason 'rejected' (the Chat API refused it) or 'expired' (waited over 24 hours)
});

await client.getPendingMessages(roomId); // messages still waiting, oldest first
await client.retryPendingMessages();     // send them now
await client.cancelPendingMessage(pending.id); // remove one (no event)
await client.clearPendingMessages();     // remove all, also from the store: call it on sign-out
```

The live `message` event for a queued message still arrives and carries the same `clientMessageId`, so a screen can match it to its pending copy and show it once. `on('messageSent', ...)` and `on('messageFailed', ...)` work too.

**Storage.** The outbox lives in memory by default: it survives a lost network, not an app restart. To keep it across restarts, pass an `outboxStore`: an object with `load()` and `save(items)` (both may be async). The SDK adds no dependency; with AsyncStorage, for example:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RiviumChatClient, type OutboxStore } from '@rivium/react-native-chat';

function asyncStorageOutbox(userId: string): OutboxStore {
  const key = `chat_outbox:${userId}`; // one key per user
  return {
    load: async () => JSON.parse((await AsyncStorage.getItem(key)) ?? '[]'),
    save: async (items) => {
      if (items.length === 0) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, JSON.stringify(items));
    },
  };
}

const client = new RiviumChatClient({
  apiKey: 'rv_live_...',
  userId: 'user-42',
  tokenProvider,
  queueOfflineMessages: true,
  outboxStore: asyncStorageOutbox('user-42'),
});
```

Errors from the store are caught: a store that fails keeps the outbox in memory.

**UI kit.** With `queueOfflineMessages` on, `ChatScreen` shows a queued message with "Waiting for network…", replaces it when it is sent, and shows Retry when it fails. Without the option, a message that cannot be sent shows Retry as before.

## Packages

| Package | Description |
|---------|-------------|
| `@rivium/react-native-chat` | Core SDK — API client, real-time messaging, models |
| `@rivium/react-native-chat-ui` | Pre-built React Native UI components with theming |

## UI Components

`@rivium/react-native-chat-ui` includes ready-to-use React Native components:

- `ChatScreen` - Full chat screen with messages, input, and state management
- `ChatMessageBubble` - Message bubble with read receipts, reactions, and reply preview
- `ChatInputField` - Text input with attachment and typing indicator support
- `TypingIndicator` - Animated typing dots
- `PresenceIndicator` - Online/offline status dot
- `UnreadBadge` - Unread message count badge
- `MessageReactionPicker` - Emoji reaction selector
- `ChatRoomListTile` - Room list item with last message preview
- `ReadReceipts` - Delivery status indicators (sent, delivered, read)
- `MessageSearchBar` - Full-text message search

### Files and voice messages

The UI kit has no native dependencies, so picking files and recording or
playing audio use the libraries your app already has. Connect them like this:

```tsx
import { ChatScreen, VoiceMessageRecorder, VoiceMessagePlayer } from '@rivium/react-native-chat-ui';

// Attachments: your picker returns the files, the kit checks the limits,
// uploads them with your fileUploader and sends them.
<ChatScreen
  roomId={roomId}
  currentUserId="user-42"
  fileUploader={{ uploadFile: (uri, mimeType, name) => uploadToYourStorage(uri, mimeType, name) }}
  maxFileSize={10 * 1024 * 1024}
  allowedTypes={['image/*', 'application/pdf']}
  attachmentOptions={[
    {
      id: 'gallery',
      label: 'Gallery',
      icon: '🖼️',
      onPress: async (addAttachments) => {
        const files = await pickFromYourGallery(); // [{ id, uri, name, mimeType, size }]
        addAttachments?.(files);
      },
    },
  ]}
/>

// Voice: wrap your recording / playback library.
<VoiceMessageRecorder
  audioRecorder={{ start: () => recorder.start(), stop: () => recorder.stop() /* returns the file URI */, cancel: () => recorder.cancel() }}
  onRecordingComplete={(uri, durationMs) => sendVoiceMessage(uri, durationMs)}
/>
<VoiceMessagePlayer
  uri={voiceUrl}
  durationMs={durationMs}
  audioPlayer={{
    play: (uri, { onProgress, onEnd }) => player.play(uri, onProgress, onEnd),
    pause: () => player.pause(),
  }}
/>
```

Without these, the attachment sheet's built-in Camera, Gallery, Document and
Location options do nothing, the recorder shows only the UI and reports a
placeholder file, and the player only toggles play / pause.

## Example App

The `react_native_ecommerce/` directory contains a complete e-commerce chat example.

### Running the Example

```bash
cd react_native_ecommerce
npm install
```

**Android:**

```bash
npx react-native run-android
```

**iOS:**

```bash
cd ios && pod install && cd ..
npx react-native run-ios --scheme RiviumChatTemp
```

### iOS Troubleshooting

**`Subclasses must implement a valid getBundleURL method`**

React Native 0.77+ renamed `getBundleURL` to `bundleURL`. Update your `AppDelegate.mm`:

```objc
- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];  // not getBundleURL
}

- (NSURL *)bundleURL  // not getBundleURL
{
  // ...
}
```

**`PlatformConstants could not be found` / `Bridgeless mode: true`**

Bridge-based native modules (like RiviumChat and RiviumPush) require bridgeless mode to be disabled. Add this to your `AppDelegate.mm`:

```objc
- (BOOL)bridgelessEnabled
{
  return NO;
}
```

On Android, update `MainApplication.kt`:

```kotlin
if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
  load(bridgelessEnabled = false)
}
```

**`fmt` compilation error with Xcode 26+**

Add this to your Podfile `post_install` block:

```ruby
# Fix fmt consteval compilation error with Xcode 26+
fmt_base_h = File.join(__dir__, 'Pods', 'fmt', 'include', 'fmt', 'base.h')
if File.exist?(fmt_base_h)
  content = File.read(fmt_base_h)
  unless content.include?('FMT_USE_CONSTEVAL_PATCHED')
    content.gsub!(
      '#elif defined(__cpp_consteval)',
      "#elif 1 // FMT_USE_CONSTEVAL_PATCHED\n#  define FMT_USE_CONSTEVAL 0\n#elif defined(__cpp_consteval)"
    )
    File.write(fmt_base_h, content)
  end
end
```

Then run `pod install` again.

## Push Notifications

RiviumChat integrates with [Rivium Push](https://rivium.co/cloud/rivium-push) for offline push notifications.

## Links

- [Rivium Chat](https://rivium.co/cloud/rivium-chat) - Learn more about Rivium Chat
- [Documentation](https://rivium.co/cloud/rivium-chat/docs/quick-start) - Full documentation and guides
- [Rivium Console](https://console.rivium.co) - Manage your chat rooms

## License

MIT
