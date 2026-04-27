import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface UnreadBadgeProps {
  count: number;
  maxCount?: number;
  backgroundColor?: string;
  textColor?: string;
  minSize?: number;
}

export function UnreadBadge({
  count,
  maxCount = 99,
  backgroundColor = '#EF4444',
  textColor = '#FFFFFF',
  minSize = 20,
}: UnreadBadgeProps) {
  if (count <= 0) return null;

  const displayText = count > maxCount ? `${maxCount}+` : count.toString();
  const isLargeNumber = displayText.length > 2;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor,
          minWidth: minSize,
          minHeight: minSize,
          paddingHorizontal: isLargeNumber ? 6 : 0,
          borderRadius: isLargeNumber ? 10 : minSize / 2,
        },
      ]}
    >
      <Text style={[styles.text, { color: textColor }]}>{displayText}</Text>
    </View>
  );
}

export interface UnreadDotProps {
  hasUnread: boolean;
  size?: number;
  color?: string;
}

export function UnreadDot({
  hasUnread,
  size = 8,
  color = '#EF4444',
}: UnreadDotProps) {
  if (!hasUnread) return null;

  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  dot: {},
});

export default UnreadBadge;
