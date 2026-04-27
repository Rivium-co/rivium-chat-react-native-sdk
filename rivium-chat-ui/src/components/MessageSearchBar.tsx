import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface SearchResult {
  /** Unique identifier for the message. */
  messageId: string;
  /** Message content. */
  content: string;
  /** Sender display name. */
  senderName?: string;
  /** Message timestamp. */
  timestamp: Date;
  /** Highlighted ranges in the content. */
  highlights?: Array<{ start: number; end: number }>;
}

export interface MessageSearchBarProps {
  /** Called when the search query changes. */
  onSearch: (query: string) => void;
  /** Called when a search result is selected. */
  onResultSelected?: (result: SearchResult) => void;
  /** Called when the search bar is closed. */
  onClose?: () => void;
  /** Search results to display. */
  results?: SearchResult[];
  /** Current result index (for navigation). */
  currentIndex?: number;
  /** Total number of results. */
  totalResults?: number;
  /** Whether search is in progress. */
  isLoading?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Called when navigating to previous result. */
  onPrevious?: () => void;
  /** Called when navigating to next result. */
  onNext?: () => void;
}

/**
 * A search bar for searching through chat messages.
 */
export function MessageSearchBar({
  onSearch,
  onResultSelected,
  onClose,
  results = [],
  currentIndex = 0,
  totalResults = 0,
  isLoading = false,
  placeholder = 'Search messages...',
  onPrevious,
  onNext,
}: MessageSearchBarProps) {
  const { colors } = useRiviumChatTheme();
  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 10,
    }).start();

    inputRef.current?.focus();
  }, []);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: -60,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose?.());
  };

  const handleChangeText = (text: string) => {
    setQuery(text);
    onSearch(text);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.otherMessageBubble, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.inputRow}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Text style={[styles.closeIcon, { color: colors.otherMessageText }]}>✕</Text>
        </TouchableOpacity>

        <View style={[styles.inputContainer, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.otherMessageText }]}
            placeholder={placeholder}
            placeholderTextColor={colors.timestampText}
            value={query}
            onChangeText={handleChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Text style={[styles.clearIcon, { color: colors.timestampText }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {query.length > 0 && (
        <View style={styles.resultsRow}>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.linkText} />
          ) : totalResults > 0 ? (
            <>
              <Text style={[styles.resultsText, { color: colors.timestampText }]}>
                {currentIndex + 1} of {totalResults}
              </Text>

              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  onPress={onPrevious}
                  disabled={currentIndex === 0}
                  style={[
                    styles.navButton,
                    currentIndex === 0 && styles.navButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.navIcon,
                      { color: currentIndex === 0 ? colors.timestampText : colors.linkText },
                    ]}
                  >
                    ▲
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onNext}
                  disabled={currentIndex >= totalResults - 1}
                  style={[
                    styles.navButton,
                    currentIndex >= totalResults - 1 && styles.navButtonDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.navIcon,
                      {
                        color:
                          currentIndex >= totalResults - 1
                            ? colors.timestampText
                            : colors.linkText,
                      },
                    ]}
                  >
                    ▼
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={[styles.noResultsText, { color: colors.timestampText }]}>
              No results found
            </Text>
          )}
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Highlighted text component for search results.
 */
export interface HighlightedTextProps {
  /** The full text content. */
  text: string;
  /** The search query to highlight. */
  query: string;
  /** Text style. */
  style?: object;
  /** Highlight style. */
  highlightStyle?: object;
}

export function HighlightedText({
  text,
  query,
  style,
  highlightStyle,
}: HighlightedTextProps) {
  const { colors } = useRiviumChatTheme();

  if (!query.trim()) {
    return <Text style={style}>{text}</Text>;
  }

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <Text style={style}>
      {parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text
            key={index}
            style={[
              { backgroundColor: `${colors.linkText}30`, fontWeight: '600' },
              highlightStyle,
            ]}
          >
            {part}
          </Text>
        ) : (
          part
        )
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  clearIcon: {
    fontSize: 12,
  },
  resultsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  resultsText: {
    fontSize: 12,
  },
  noResultsText: {
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  navigationButtons: {
    flexDirection: 'row',
  },
  navButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MessageSearchBar;
