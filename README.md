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
