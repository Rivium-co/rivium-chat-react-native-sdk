import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { useRiviumChatTheme } from '../theme/RiviumChatTheme';

export interface VoiceMessageRecorderProps {
  /** Called when recording is completed with the audio file URI. */
  onRecordingComplete: (uri: string, durationMs: number) => void;
  /** Called when recording is cancelled. */
  onCancel?: () => void;
  /** Maximum recording duration in milliseconds. */
  maxDuration?: number;
  /** Custom mic icon. */
  micIcon?: string;
  /** Custom send icon. */
  sendIcon?: string;
  /** Custom delete icon. */
  deleteIcon?: string;
}

/**
 * A voice message recorder with hold-to-record and slide-to-cancel.
 * Note: This component provides the UI - you need to integrate with
 * a native audio recording module (e.g., react-native-audio-recorder-player).
 */
export function VoiceMessageRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 60000,
  micIcon = '🎤',
  sendIcon = '➤',
  deleteIcon = '🗑️',
}: VoiceMessageRecorderProps) {
  const { colors } = useRiviumChatTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [slideToCancel, setSlideToCancel] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRecording();
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = Math.min(0, gestureState.dx);
        slideX.setValue(dx);
        setSlideToCancel(dx < -100);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          cancelRecording();
        } else {
          stopRecording();
        }
        Animated.spring(slideX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (isRecording) {
      // Start pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 100;
          if (next >= maxDuration) {
            stopRecording();
          }
          return next;
        });
      }, 100);
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [isRecording, maxDuration]);

  const startRecording = () => {
    setIsRecording(true);
    setDuration(0);
    // TODO: Start actual audio recording using native module
  };

  const stopRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      // TODO: Stop actual recording and get file URI
      // For now, simulate with a placeholder
      onRecordingComplete('file://placeholder-recording.m4a', duration);
    }
  };

  const cancelRecording = () => {
    setIsRecording(false);
    setDuration(0);
    setSlideToCancel(false);
    onCancel?.();
    // TODO: Cancel actual recording
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {isRecording && (
        <Animated.View
          style={[
            styles.recordingIndicator,
            {
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <View style={styles.recordingDot} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>

          <Animated.Text
            style={[
              styles.slideToCancel,
              {
                color: slideToCancel ? colors.failedMessage : colors.timestampText,
              },
            ]}
          >
            {slideToCancel ? `${deleteIcon} Release to cancel` : '← Slide to cancel'}
          </Animated.Text>
        </Animated.View>
      )}

      <Animated.View
        style={[
          styles.micButton,
          {
            backgroundColor: isRecording
              ? colors.failedMessage
              : colors.linkText,
            transform: [{ scale: pulseAnim }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <Text style={styles.micIcon}>
          {isRecording ? (slideToCancel ? deleteIcon : sendIcon) : micIcon}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Voice message playback component.
 */
export interface VoiceMessagePlayerProps {
  /** URI of the audio file. */
  uri: string;
  /** Duration of the audio in milliseconds. */
  durationMs: number;
  /** Whether this is the current user's message. */
  isMe?: boolean;
  /** Called when playback state changes. */
  onPlaybackStateChange?: (isPlaying: boolean) => void;
}

export function VoiceMessagePlayer({
  uri,
  durationMs,
  isMe = false,
  onPlaybackStateChange,
}: VoiceMessagePlayerProps) {
  const { colors } = useRiviumChatTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlayback = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    onPlaybackStateChange?.(newState);
    // TODO: Implement actual audio playback
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.playerContainer]}>
      <TouchableOpacity
        style={[
          styles.playButton,
          { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : `${colors.linkText}20` },
        ]}
        onPress={togglePlayback}
      >
        <Text style={[styles.playIcon, { color: isMe ? '#fff' : colors.linkText }]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      <View style={styles.waveformContainer}>
        {/* Simplified waveform visualization */}
        {Array.from({ length: 20 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.waveformBar,
              {
                height: 8 + Math.random() * 16,
                backgroundColor:
                  i / 20 < progress
                    ? colors.linkText
                    : isMe
                    ? 'rgba(255,255,255,0.3)'
                    : 'rgba(0,0,0,0.1)',
              },
            ]}
          />
        ))}
      </View>

      <Text
        style={[
          styles.playerDuration,
          { color: isMe ? 'rgba(255,255,255,0.7)' : colors.timestampText },
        ]}
      >
        {formatDuration(durationMs)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  micIcon: {
    fontSize: 24,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 16,
    minWidth: 40,
  },
  slideToCancel: {
    fontSize: 12,
    flex: 1,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 16,
  },
  waveformContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    marginHorizontal: 8,
  },
  waveformBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 2,
  },
  playerDuration: {
    fontSize: 11,
    minWidth: 32,
    textAlign: 'right',
  },
});

export default VoiceMessageRecorder;
