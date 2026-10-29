## [0.2.0] - 2026-10-30

- Fixed: a request that times out now rejects with `RiviumChatError` code `timeout` in browsers too (it could reject with the browser's `AbortError`).
- Fixed (UI kit): scrolling up quickly no longer loads the same older page twice.

- Added: sending while offline (opt-in). With `queueOfflineMessages: true`, a message that cannot be sent now (no network, timeout, 408, 429, 5xx) is kept and sent when the connection is back, in order and never twice; `sendMessage()` returns it as pending (`isPending: true`, `id: "local_<clientMessageId>"`) instead of rejecting. A message the Chat API refuses still rejects. New events `messageSent` and `messageFailed` (`reason` `'rejected'` or `'expired'` after 24 hours), helpers `onMessageSent()` / `onMessageFailed()`, and `getPendingMessages()`, `retryPendingMessages()`, `cancelPendingMessage()` and `clearPendingMessages()`. Messages carry `clientMessageId`. Needs the current Chat API. Without the option nothing changes.
- Added: `outboxStore` keeps the offline outbox across app restarts: pass an object with `load()` / `save(items)`, for example backed by AsyncStorage (see the README). The SDK adds no dependency.
- UI kit: with `queueOfflineMessages` on, a queued message shows "Waiting for network…" instead of failing, is replaced when it is sent (shown once, also when the live message arrives first), and shows Retry when it fails. Messages still waiting are shown when the chat opens.
- Fixed: `getRoomByExternalId()`, `deleteMessage()`, `editMessage()`, `getReactions()`, `pinMessage()` and `unpinMessage()` called addresses the API does not have and always failed. They now work; their `roomId` argument is kept so existing code compiles.
- Fixed: `createRoom()` and `addParticipant()` were rejected by the API; participants are now sent as `externalUserId`. `createRoom()` still accepts `userId` in each participant.
- Fixed: `markAsRead()` was rejected by the API when given a `messageId`. It marks the whole room read; `messageId` is ignored.
- Fixed: `getMessages()`, `searchMessages()` and `getMentions()` were refused for apps without a `tokenProvider`; they now send the user id.
- Fixed: messages deleted by another user now arrive on the `messageDeleted` event.
- Fixed: after a reconnect, missed messages are replayed, and `recoveryFailed` fires when they cannot be, so the app knows to reload the room.
- Fixed: `sendTypingIndicator()` always failed; it now sends over the realtime connection, like `publishTyping()`. Call `subscribeToRoom()` first.
- Fixed: `searchMessages()` returns `total`, the number of matching messages. `totalCount` (same value) and `hasMore` still work but are deprecated.
- Fixed: `getMentions()` results carry `mentionedUserId` and `createdAt`; the older `userId` and `mentionedAt` fields are filled from them and deprecated. The `before` option is ignored.
- Changed: `uploadFile()` is not supported and now rejects with a clear `RiviumChatError` instead of an HTTP 404. Rivium Chat does not store files: upload the file to your own storage and send its URL as an attachment with `sendMessage()`.
- Changed: `updateRoom()` is not supported and now rejects with a clear `RiviumChatError` instead of an HTTP 404. Set the name and metadata when you create the room.
- Changed: `connect()` returns a promise you can await to handle a failed connection (calling it without `await` works as before).
- Fixed: when `tokenProvider` fails during `connect()`, the `authError` event now reports `token_provider_failed`, as it already did for other calls.
- Fixed: `publishTyping()` is throttled per room, so typing in one room no longer hides typing in another for 2 seconds.
- Fixed: `removeParticipant()` works with user ids that contain characters such as `/` or spaces.
- Fixed: `connect()` now emits `connectionState` `error` when it cannot get a connection token (unknown API key, project requires a user token, API unreachable, failing `tokenProvider`), as well as rejecting. `authError` with `token_provider_failed` is unchanged.
- Fixed: a room subscription the server refuses (for example `Not a participant in this room`) is now reported: `recoveryFailed` fires with `code` and `reason`, and `subscriptionState` `unsubscribed` carries `roomId`, `code` and `reason`. A later `subscribeToRoom()` for that room tries again.
- Added: requests to the Chat API time out after 30 seconds (as in the Android and iOS SDKs) and reject with a `RiviumChatError` whose `code` is `'timeout'`. Change the limit with the `requestTimeoutMs` option.
- UI kit: `ChatScreen` inside `RiviumChatProvider` no longer fails with "Not connected": messages load right away and the room is followed once the connection is up, and again after a reconnect (missed messages are reloaded).
- UI kit: when a room's live updates are lost after a long offline gap (`recoveryFailed`), the chat screen reloads its messages. `useChatChannel()` adds `refresh()`.
- UI kit: `VoiceMessageRecorder` reports the recording when you release and its real length (release did nothing and the length was 0).
- UI kit: typing indicators and "Replying to" show the participant's display name from the room, falling back to the user id. Names passed in `userDisplayNames` still win.
- UI kit: `RiviumChatProvider` no longer reconnects when `onConnected` / `onConnectionError` are new functions on each render.
- UI kit: `ChatAttachmentPicker` enforces `maxAttachments`, `maxFileSize` and `allowedTypes` (wildcards such as `image/*` work): a refused file is not added and the sheet says why. New `onError` prop. Each option's `onPress` now receives `addAttachments`: pass it the files your picker returned.
- UI kit: `ChatScreen` with a `fileUploader` opens the attachment sheet from the 📎 button, uploads the picked files, shows "Uploading..." with the input disabled, then sends them. New props `attachmentOptions`, `maxFileSize` and `allowedTypes`; `enableAttachments={false}` hides the button.
- UI kit: `ChatInputField` shows an emoji button when `onEmojiPress` is given.
- UI kit: `MessageSearchBar` lists `results` (sender, time, highlighted text) and calls `onResultSelected` on tap. `totalResults` defaults to the number of results.
- UI kit: `HighlightedText` (search highlight) no longer crashes on queries with characters such as `(` or `*`.
- UI kit: `VoiceMessagePlayer` plays its `uri` and shows progress through a new `audioPlayer` prop (`VoiceAudioPlayer`: connect the audio library your app uses; React Native has no built-in audio playback). Without it, behaviour is unchanged.
- UI kit: `ChatScreen` now honours `showTypingIndicator`, `showReadReceipts`, `emptyStateTitle` and `emptyStateSubtitle` (they were ignored).
- UI kit: `ChatScreen` calls `onSendMessage(content)` before sending a text message; return `false` to send it yourself (or not at all). Without it, sending is unchanged.
- UI kit: `VoiceMessageRecorder` records real audio through a new `audioRecorder` prop (`VoiceAudioRecorder`: connect the recording library your app uses) and reports problems such as a missing microphone permission to the new `onError`. Without it, behaviour is unchanged.

## [0.1.3] - 2026-10-05

- Added: requests send an `X-Rivium-SDK` header (`react-native/<version>`); `SDK_NAME` and `SDK_VERSION` are exported.

## [0.1.2] - 2026-09-26

- Added: `lastMessage` and `unreadCount` on `Room`. A chat list can show the
  latest message and an unread badge from `listRooms()` alone, with no extra
  calls.

## [0.1.1] - 2026-09-12

- Added: `tokenProvider` for secure user identity. Tokens are refreshed automatically before they expire and after an expired-token response.
- Added: `authError` event for identity errors a refresh cannot fix.

## [0.1.0] - 2026-04-26

- Initial release
