import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface LinkMetadata {
  /** The original URL. */
  url: string;
  /** Page title. */
  title?: string;
  /** Page description. */
  description?: string;
  /** Preview image URL. */
  imageUrl?: string;
  /** Site name or domain. */
  siteName?: string;
  /** Favicon URL. */
  faviconUrl?: string;
}

export interface LinkPreviewProps {
  /** The URL to preview. */
  url: string;
  /** Pre-loaded metadata (if available). */
  metadata?: LinkMetadata;
  /** Called to fetch metadata for a URL. */
  onFetchMetadata?: (url: string) => Promise<LinkMetadata>;
  /** Whether this is in a message from the current user. */
  isMe?: boolean;
  /** Whether to show the preview in compact mode. */
  compact?: boolean;
  /** Called when the preview is pressed. */
  onPress?: () => void;
}

/**
 * A rich link preview component for URLs in messages.
 */
export function LinkPreview({
  url,
  metadata: initialMetadata,
  onFetchMetadata,
  isMe = false,
  compact = false,
  onPress,
}: LinkPreviewProps) {
  const { colors } = useRiviumChatTheme();
  const [metadata, setMetadata] = useState<LinkMetadata | undefined>(initialMetadata);
  const [isLoading, setIsLoading] = useState(!initialMetadata);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!initialMetadata && onFetchMetadata) {
      setIsLoading(true);
      onFetchMetadata(url)
        .then((data) => {
          setMetadata(data);
          setIsLoading(false);
        })
        .catch(() => {
          setError(true);
          setIsLoading(false);
        });
    }
  }, [url, initialMetadata, onFetchMetadata]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(url);
    }
  };

  const getDomain = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return urlString;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={colors.linkText} />
      </View>
    );
  }

  if (error || !metadata) {
    // Fallback to simple link
    return (
      <TouchableOpacity onPress={handlePress}>
        <Text style={[styles.fallbackLink, { color: colors.linkText }]}>{url}</Text>
      </TouchableOpacity>
    );
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          {
            backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderLeftColor: colors.linkText,
          },
        ]}
        onPress={handlePress}
      >
        <Text
          style={[
            styles.compactTitle,
            { color: isMe ? '#fff' : colors.otherMessageText },
          ]}
          numberOfLines={1}
        >
          {metadata.title || getDomain(url)}
        </Text>
        <Text
          style={[
            styles.compactUrl,
            { color: isMe ? 'rgba(255,255,255,0.7)' : colors.timestampText },
          ]}
          numberOfLines={1}
        >
          {getDomain(url)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isMe ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
          borderColor: isMe ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
        },
      ]}
      onPress={handlePress}
    >
      {metadata.imageUrl && (
        <Image
          source={{ uri: metadata.imageUrl }}
          style={styles.previewImage}
          resizeMode="cover"
        />
      )}

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          {metadata.faviconUrl && (
            <Image source={{ uri: metadata.faviconUrl }} style={styles.favicon} />
          )}
          <Text
            style={[
              styles.siteName,
              { color: isMe ? 'rgba(255,255,255,0.6)' : colors.timestampText },
            ]}
            numberOfLines={1}
          >
            {metadata.siteName || getDomain(url)}
          </Text>
        </View>

        {metadata.title && (
          <Text
            style={[
              styles.title,
              { color: isMe ? '#fff' : colors.otherMessageText },
            ]}
            numberOfLines={2}
          >
            {metadata.title}
          </Text>
        )}

        {metadata.description && (
          <Text
            style={[
              styles.description,
              { color: isMe ? 'rgba(255,255,255,0.8)' : colors.timestampText },
            ]}
            numberOfLines={3}
          >
            {metadata.description}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

/**
 * Extracts URLs from text content.
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Checks if a string is a valid URL.
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
    maxWidth: 280,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 140,
  },
  contentContainer: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  favicon: {
    width: 14,
    height: 14,
    borderRadius: 2,
    marginRight: 6,
  },
  siteName: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 4,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  compactContainer: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactUrl: {
    fontSize: 11,
    marginTop: 2,
  },
  fallbackLink: {
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});

export default LinkPreview;
