import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface PresenceIndicatorProps {
  isOnline: boolean;
  size?: number;
  showBorder?: boolean;
  borderColor?: string;
}

export function PresenceIndicator({
  isOnline,
  size = 12,
  showBorder = true,
  borderColor = '#FFFFFF',
}: PresenceIndicatorProps) {
  const { colors } = useRiviumChatTheme();

  return (
    <View
      style={[
        styles.indicator,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isOnline ? colors.onlineIndicator : colors.offlineIndicator,
          borderWidth: showBorder ? 2 : 0,
          borderColor,
        },
      ]}
    />
  );
}

export interface PresenceStatusProps {
  isOnline: boolean;
}

export function PresenceStatus({ isOnline }: PresenceStatusProps) {
  const { colors } = useRiviumChatTheme();

  return (
    <View style={styles.statusContainer}>
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: isOnline ? colors.onlineIndicator : colors.offlineIndicator,
          },
        ]}
      />
      <Text
        style={[
          styles.statusText,
          {
            color: isOnline ? colors.onlineIndicator : colors.offlineIndicator,
          },
        ]}
      >
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {},
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
});

export default PresenceIndicator;
