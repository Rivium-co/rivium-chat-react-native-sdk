import React, { useRef } from 'react';
import {
  View,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
  Text,
  Platform,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SwipeableMessageProps {
  /** The message content to wrap. */
  children: React.ReactNode;
  /** Whether this message is from the current user. */
  isMe: boolean;
  /** Called when the user completes a swipe-to-reply gesture. */
  onReply?: () => void;
  /** The threshold (0.0 to 1.0) at which the reply action is triggered. */
  replyThreshold?: number;
  /** Whether swipe-to-reply is enabled. */
  enabled?: boolean;
  /** Custom reply icon text/emoji. */
  replyIcon?: string;
}

/**
 * A swipeable message wrapper that enables swipe-to-reply gesture.
 * Similar to WhatsApp and Telegram swipe-to-reply functionality.
 */
export function SwipeableMessage({
  children,
  isMe,
  onReply,
  replyThreshold = 0.2,
  enabled = true,
  replyIcon = '↩',
}: SwipeableMessageProps) {
  const { colors } = useRiviumChatTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const hasTriggered = useRef(false);

  const maxDrag = SCREEN_WIDTH * 0.3;
  const threshold = SCREEN_WIDTH * replyThreshold;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!enabled || !onReply) return false;
        // Only respond to horizontal gestures
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
      },
      onPanResponderGrant: () => {
        hasTriggered.current = false;
      },
      onPanResponderMove: (_, gestureState) => {
        let dx = gestureState.dx;

        // For own messages (right side), only allow swipe left
        // For other messages (left side), only allow swipe right
        if (isMe) {
          dx = Math.min(0, Math.max(-maxDrag, dx));
        } else {
          dx = Math.max(0, Math.min(maxDrag, dx));
        }

        translateX.setValue(dx);

        // Trigger haptic feedback when crossing threshold
        if (Math.abs(dx) >= threshold && !hasTriggered.current) {
          hasTriggered.current = true;
          // Haptic feedback (if available)
          if (Platform.OS === 'ios') {
            // Use native module for haptic if needed
          }
        } else if (Math.abs(dx) < threshold && hasTriggered.current) {
          hasTriggered.current = false;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const dx = isMe ? gestureState.dx : gestureState.dx;

        if (Math.abs(dx) >= threshold && onReply) {
          onReply();
        }

        // Animate back to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 10,
        }).start();
      },
    })
  ).current;

  if (!enabled || !onReply) {
    return <>{children}</>;
  }

  // Calculate icon opacity based on drag progress
  const iconOpacity = translateX.interpolate({
    inputRange: isMe ? [-threshold, 0] : [0, threshold],
    outputRange: isMe ? [1, 0] : [0, 1],
    extrapolate: 'clamp',
  });

  const iconScale = translateX.interpolate({
    inputRange: isMe ? [-threshold, 0] : [0, threshold],
    outputRange: [1, 0.5],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Reply icon indicator */}
      <Animated.View
        style={[
          styles.replyIconContainer,
          isMe ? styles.replyIconLeft : styles.replyIconRight,
          {
            opacity: iconOpacity,
            transform: [{ scale: iconScale }],
            backgroundColor: colors.linkText,
          },
        ]}
      >
        <Text style={styles.replyIconText}>{replyIcon}</Text>
      </Animated.View>

      {/* Message content */}
      <Animated.View
        style={[styles.messageContainer, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  messageContainer: {
    zIndex: 1,
  },
  replyIconContainer: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
    top: '50%',
    marginTop: -18,
  },
  replyIconLeft: {
    left: 16,
  },
  replyIconRight: {
    right: 16,
  },
  replyIconText: {
    fontSize: 18,
    color: '#FFFFFF',
  },
});

export default SwipeableMessage;
