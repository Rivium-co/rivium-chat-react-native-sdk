import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface TypingIndicatorProps {
  typingUsers: string[];
  userDisplayNames?: Record<string, string>;
}

export function TypingIndicator({
  typingUsers,
  userDisplayNames = {},
}: TypingIndicatorProps) {
  const { colors, dimensions } = useRiviumChatTheme();

  if (typingUsers.length === 0) return null;

  const getDisplayText = () => {
    if (typingUsers.length === 1) {
      const name = userDisplayNames[typingUsers[0]] || typingUsers[0];
      return `${name} is typing...`;
    }
    if (typingUsers.length === 2) {
      const name1 = userDisplayNames[typingUsers[0]] || typingUsers[0];
      const name2 = userDisplayNames[typingUsers[1]] || typingUsers[1];
      return `${name1} and ${name2} are typing...`;
    }
    return `${typingUsers.length} people are typing...`;
  };

  return (
    <View style={[styles.container, { paddingLeft: dimensions.smallAvatarSize + 16 }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: colors.otherMessageBubble,
            borderRadius: dimensions.messageBubbleRadius,
          },
        ]}
      >
        <TypingDots color={colors.typingIndicator} />
        <Text style={[styles.text, { color: colors.typingIndicator }]}>
          {getDisplayText()}
        </Text>
      </View>
    </View>
  );
}

export interface TypingDotsProps {
  color?: string;
  dotSize?: number;
  dotCount?: number;
}

export function TypingDots({
  color = '#8E8E93',
  dotSize = 8,
  dotCount = 3,
}: TypingDotsProps) {
  const animations = useRef(
    Array.from({ length: dotCount }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animate = () => {
      const sequences = animations.map((anim, index) =>
        Animated.sequence([
          Animated.delay(index * 150),
          Animated.timing(anim, {
            toValue: 1,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 300,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      );

      Animated.loop(Animated.parallel(sequences)).start();
    };

    animate();

    return () => {
      animations.forEach((anim) => anim.stopAnimation());
    };
  }, [animations]);

  return (
    <View style={styles.dotsContainer}>
      {animations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              backgroundColor: color,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.4, 1],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
}

export interface CompactTypingIndicatorProps {
  isTyping: boolean;
}

export function CompactTypingIndicator({ isTyping }: CompactTypingIndicatorProps) {
  const { colors } = useRiviumChatTheme();

  if (!isTyping) return null;

  return (
    <View
      style={[
        styles.compactContainer,
        { backgroundColor: colors.otherMessageBubble },
      ]}
    >
      <TypingDots color={colors.typingIndicator} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    fontSize: 12,
    marginLeft: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    borderRadius: 4,
    marginHorizontal: 2,
  },
  compactContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

export default TypingIndicator;
