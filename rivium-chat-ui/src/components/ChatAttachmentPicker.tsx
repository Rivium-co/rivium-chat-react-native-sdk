import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Image,
  FlatList,
  Platform,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface AttachmentOption {
  /** Unique identifier for the option. */
  id: string;
  /** Display label. */
  label: string;
  /** Icon (emoji or text). */
  icon: string;
  /** Called when this option is selected. */
  onPress: () => void;
}

export interface SelectedAttachment {
  /** Unique identifier. */
  id: string;
  /** File URI. */
  uri: string;
  /** File name. */
  name: string;
  /** MIME type. */
  mimeType?: string;
  /** File size in bytes. */
  size?: number;
  /** Thumbnail URI (for images/videos). */
  thumbnailUri?: string;
}

export interface ChatAttachmentPickerProps {
  /** Whether the picker is visible. */
  visible: boolean;
  /** Called when the picker is closed. */
  onClose: () => void;
  /** Called when attachments are selected. */
  onAttachmentsSelected: (attachments: SelectedAttachment[]) => void;
  /** Custom attachment options. */
  options?: AttachmentOption[];
  /** Maximum number of attachments allowed. */
  maxAttachments?: number;
  /** Maximum file size in bytes. */
  maxFileSize?: number;
  /** Allowed file types (MIME types). */
  allowedTypes?: string[];
}

const DEFAULT_OPTIONS: AttachmentOption[] = [
  {
    id: 'camera',
    label: 'Camera',
    icon: '📷',
    onPress: () => {},
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: '🖼️',
    onPress: () => {},
  },
  {
    id: 'document',
    label: 'Document',
    icon: '📄',
    onPress: () => {},
  },
  {
    id: 'location',
    label: 'Location',
    icon: '📍',
    onPress: () => {},
  },
];

/**
 * An attachment picker for selecting files, images, and other media.
 * Note: This component provides the UI - you need to integrate with
 * native modules for actual file picking (e.g., react-native-image-picker,
 * react-native-document-picker).
 */
export function ChatAttachmentPicker({
  visible,
  onClose,
  onAttachmentsSelected,
  options,
  maxAttachments = 10,
  maxFileSize = 25 * 1024 * 1024, // 25MB
  allowedTypes,
}: ChatAttachmentPickerProps) {
  const { colors } = useRiviumChatTheme();
  const [selectedAttachments, setSelectedAttachments] = useState<SelectedAttachment[]>([]);

  const attachmentOptions = options || DEFAULT_OPTIONS.map((opt) => ({
    ...opt,
    onPress: () => handleOptionPress(opt.id),
  }));

  const handleOptionPress = (optionId: string) => {
    // Placeholder - integrate with native pickers
    console.log(`Selected option: ${optionId}`);

    // Example of how attachments would be added:
    // const newAttachment: SelectedAttachment = {
    //   id: Date.now().toString(),
    //   uri: 'file://...',
    //   name: 'image.jpg',
    //   mimeType: 'image/jpeg',
    // };
    // setSelectedAttachments([...selectedAttachments, newAttachment]);
  };

  const handleRemoveAttachment = (id: string) => {
    setSelectedAttachments(selectedAttachments.filter((a) => a.id !== id));
  };

  const handleSend = () => {
    if (selectedAttachments.length > 0) {
      onAttachmentsSelected(selectedAttachments);
      setSelectedAttachments([]);
    }
    onClose();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.container, { backgroundColor: colors.otherMessageBubble }]}>
          <View style={styles.handle} />

          <Text style={[styles.title, { color: colors.otherMessageText }]}>
            Add Attachment
          </Text>

          {/* Attachment options grid */}
          <View style={styles.optionsGrid}>
            {attachmentOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionButton}
                onPress={option.onPress}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: `${colors.linkText}15` }]}>
                  <Text style={styles.optionIcon}>{option.icon}</Text>
                </View>
                <Text style={[styles.optionLabel, { color: colors.otherMessageText }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected attachments preview */}
          {selectedAttachments.length > 0 && (
            <View style={styles.selectedSection}>
              <Text style={[styles.selectedTitle, { color: colors.timestampText }]}>
                Selected ({selectedAttachments.length}/{maxAttachments})
              </Text>

              <FlatList
                horizontal
                data={selectedAttachments}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.selectedItem}>
                    {item.mimeType?.startsWith('image/') ? (
                      <Image
                        source={{ uri: item.thumbnailUri || item.uri }}
                        style={styles.selectedImage}
                      />
                    ) : (
                      <View style={[styles.selectedFile, { backgroundColor: `${colors.linkText}20` }]}>
                        <Text style={styles.selectedFileIcon}>📄</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveAttachment(item.id)}
                    >
                      <Text style={styles.removeIcon}>✕</Text>
                    </TouchableOpacity>
                    <Text
                      style={[styles.selectedName, { color: colors.timestampText }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.size && (
                      <Text style={[styles.selectedSize, { color: colors.timestampText }]}>
                        {formatFileSize(item.size)}
                      </Text>
                    )}
                  </View>
                )}
              />

              <TouchableOpacity
                style={[styles.sendButton, { backgroundColor: colors.linkText }]}
                onPress={handleSend}
              >
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

/**
 * Inline attachment preview for the input field.
 */
export interface AttachmentPreviewProps {
  /** The attachment to preview. */
  attachment: SelectedAttachment;
  /** Called when the remove button is pressed. */
  onRemove: () => void;
}

export function AttachmentPreview({ attachment, onRemove }: AttachmentPreviewProps) {
  const { colors } = useRiviumChatTheme();

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = attachment.mimeType?.startsWith('image/');

  return (
    <View style={[styles.inlinePreview, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
      {isImage ? (
        <Image
          source={{ uri: attachment.thumbnailUri || attachment.uri }}
          style={styles.inlineImage}
        />
      ) : (
        <View style={[styles.inlineFileIcon, { backgroundColor: `${colors.linkText}20` }]}>
          <Text>📄</Text>
        </View>
      )}

      <View style={styles.inlineInfo}>
        <Text style={[styles.inlineName, { color: colors.otherMessageText }]} numberOfLines={1}>
          {attachment.name}
        </Text>
        {attachment.size && (
          <Text style={[styles.inlineSize, { color: colors.timestampText }]}>
            {formatFileSize(attachment.size)}
          </Text>
        )}
      </View>

      <TouchableOpacity style={styles.inlineRemove} onPress={onRemove}>
        <Text style={[styles.inlineRemoveIcon, { color: colors.timestampText }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  optionButton: {
    alignItems: 'center',
    width: 80,
    marginBottom: 20,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionIcon: {
    fontSize: 28,
  },
  optionLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  selectedSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  selectedTitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  selectedItem: {
    marginRight: 12,
    width: 72,
    alignItems: 'center',
  },
  selectedImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  selectedFile: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFileIcon: {
    fontSize: 24,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedName: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 64,
  },
  selectedSize: {
    fontSize: 9,
    marginTop: 2,
  },
  sendButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inlinePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  inlineImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  inlineFileIcon: {
    width: 40,
    height: 40,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineInfo: {
    flex: 1,
    marginLeft: 10,
  },
  inlineName: {
    fontSize: 13,
    fontWeight: '500',
  },
  inlineSize: {
    fontSize: 11,
    marginTop: 2,
  },
  inlineRemove: {
    padding: 8,
  },
  inlineRemoveIcon: {
    fontSize: 16,
  },
});

export default ChatAttachmentPicker;
