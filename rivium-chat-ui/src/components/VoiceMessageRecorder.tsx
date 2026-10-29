import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
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
  /**
   * Records the audio (see `VoiceAudioRecorder`). Without it the recorder only
   * shows the UI and reports a placeholder URI.
   */
  audioRecorder?: VoiceAudioRecorder;
  /** Called when the recorder cannot start or stop (for example: no microphone permission). */
  onError?: (error: unknown) => void;
}

/**
 * Records audio for `VoiceMessageRecorder`. React Native has no built-in
 * audio recording: implement this with the recording library your app uses.
 */
export interface VoiceAudioRecorder {
  /** Start recording (ask for the microphone permission here if needed). */
  start(): void | Promise<void>;
  /** Stop recording and return the recorded file's URI. */
  stop(): string | Promise<string>;
  /** Stop recording and throw the recording away. */
  cancel(): void | Promise<void>;
}

/**
 * A voice message recorder with hold-to-record and slide-to-cancel.
 * Note: React Native has no built-in audio recording. Pass `audioRecorder`
 * (a `VoiceAudioRecorder` built on the recording library your app uses) to
 * record real audio; without it this component provides only the UI.
 */
export function VoiceMessageRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 60000,
  micIcon = '🎤',
  sendIcon = '➤',
  deleteIcon = '🗑️',
  audioRecorder,
  onError,
}: VoiceMessageRecorderProps) {
  const { colors } = useRiviumChatTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [slideToCancel, setSlideToCancel] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  // Refs, not state: the pan responder is created once and the timer runs
  // later, so both must see the current recording, duration and callbacks.
  const isRecordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onCancelRef = useRef(onCancel);
  onRecordingCompleteRef.current = onRecordingComplete;
  onCancelRef.current = onCancel;
  const audioRecorderRef = useRef(audioRecorder);
  const onErrorRef = useRef(onError);
  audioRecorderRef.current = audioRecorder;
  onErrorRef.current = onError;

  const fail = (error: unknown) => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setDuration(0);
    onErrorRef.current?.(error);
  };

  const elapsed = () => Math.min(Date.now() - startedAtRef.current, maxDuration);

  const startRecording = () => {
    if (isRecordingRef.current) return;
    isRecordingRef.current = true;
    startedAtRef.current = Date.now();
    setIsRecording(true);
    setDuration(0);
    const recorder = audioRecorderRef.current;
    if (!recorder) return;
    try {
      Promise.resolve(recorder.start()).catch(fail);
    } catch (error) {
      fail(error);
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    const durationMs = elapsed();
    setIsRecording(false);
    const recorder = audioRecorderRef.current;
    if (!recorder) {
      // No recorder given: the UI only, with a placeholder file.
      onRecordingCompleteRef.current('file://placeholder-recording.m4a', durationMs);
      return;
    }
    try {
      Promise.resolve(recorder.stop())
        .then((uri) => onRecordingCompleteRef.current(uri, durationMs))
        .catch(fail);
    } catch (error) {
      fail(error);
    }
  };

  const cancelRecording = () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setDuration(0);
    setSlideToCancel(false);
    onCancelRef.current?.();
    try {
      Promise.resolve(audioRecorderRef.current?.cancel()).catch(() => {});
    } catch {
      // ignore: the recording is thrown away either way
    }
  };

  const handlersRef = useRef({ startRecording, stopRecording, cancelRecording });
  handlersRef.current = { startRecording, stopRecording, cancelRecording };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        handlersRef.current.startRecording();
      },
      onPanResponderMove: (_, gestureState) => {
        const dx = Math.min(0, gestureState.dx);
        slideX.setValue(dx);
        setSlideToCancel(dx < -100);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) {
          handlersRef.current.cancelRecording();
        } else {
          handlersRef.current.stopRecording();
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
        const next = elapsed();
        setDuration(next);
        if (next >= maxDuration) {
          handlersRef.current.stopRecording();
        }
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
 * Plays audio for `VoiceMessagePlayer`. React Native has no built-in audio
 * playback: implement this with the audio library your app uses.
 */
export interface VoiceAudioPlayer {
  /** Start or resume playing `uri`; report the position while playing and call `onEnd` when done. */
  play(
    uri: string,
    callbacks: { onProgress: (positionMs: number, durationMs: number) => void; onEnd: () => void }
  ): void | Promise<void>;
  /** Pause playback. */
  pause(): void | Promise<void>;
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
  /** Plays the audio (see `VoiceAudioPlayer`). Without it the button only reports play / pause. */
  audioPlayer?: VoiceAudioPlayer;
}

export function VoiceMessagePlayer({
  uri,
  durationMs,
  isMe = false,
  onPlaybackStateChange,
  audioPlayer,
}: VoiceMessagePlayerProps) {
  const { colors } = useRiviumChatTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [positionMs, setPositionMs] = useState(0);
  const isPlayingRef = useRef(false);
  const audioPlayerRef = useRef(audioPlayer);
  audioPlayerRef.current = audioPlayer;
  // Fixed bar heights: random ones would jump on every progress update.
  const bars = useRef(Array.from({ length: 20 }, () => 8 + Math.random() * 16)).current;

  const setPlaying = (playing: boolean) => {
    isPlayingRef.current = playing;
    setIsPlaying(playing);
    onPlaybackStateChange?.(playing);
  };

  // Stop playing when the message leaves the screen
  useEffect(() => {
    return () => {
      if (isPlayingRef.current) {
        try {
          audioPlayerRef.current?.pause();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const togglePlayback = () => {
    if (isPlaying) {
      audioPlayer?.pause();
      setPlaying(false);
      return;
    }
    setPlaying(true);
    if (!audioPlayer) return;
    try {
      const started = audioPlayer.play(uri, {
        onProgress: (position, total) => {
          const length = total > 0 ? total : durationMs;
          setPositionMs(position);
          setProgress(length > 0 ? Math.min(1, position / length) : 0);
        },
        onEnd: () => {
          setPositionMs(0);
          setProgress(0);
          setPlaying(false);
        },
      });
      if (started && typeof (started as Promise<void>).catch === 'function') {
        (started as Promise<void>).catch(() => setPlaying(false));
      }
    } catch {
      setPlaying(false);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const shownMs = isPlaying || positionMs > 0 ? positionMs : durationMs;

  return (
    <View style={[styles.playerContainer]}>
      <TouchableOpacity
        style={[
          styles.playButton,
          { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : `${colors.linkText}20` },
        ]}
        onPress={togglePlayback}
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
      >
        <Text style={[styles.playIcon, { color: isMe ? '#fff' : colors.linkText }]}>
          {isPlaying ? '⏸' : '▶'}
        </Text>
      </TouchableOpacity>

      <View
        style={styles.waveformContainer}
        accessibilityLabel={`Played ${Math.round(progress * 100)}%`}
      >
        {/* Simplified waveform visualization */}
        {bars.map((height, i) => (
          <View
            key={i}
            style={[
              styles.waveformBar,
              {
                height,
                backgroundColor:
                  i / bars.length < progress
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
        {formatDuration(shownMs)}
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
