import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceMessageRecorder } from '../src/components/VoiceMessageRecorder';
// @ts-expect-error test-only export of the stub
import { lastPanResponder } from 'react-native';

describe('VoiceMessageRecorder (hold to record)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('releasing reports the recording with its real duration', () => {
    const onRecordingComplete = vi.fn();
    render(<VoiceMessageRecorder onRecordingComplete={onRecordingComplete} />);

    act(() => lastPanResponder.config.onPanResponderGrant());
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    act(() => lastPanResponder.config.onPanResponderRelease({}, { dx: 0 }));

    expect(onRecordingComplete).toHaveBeenCalledTimes(1);
    const durationMs = onRecordingComplete.mock.calls[0][1];
    expect(durationMs).toBeGreaterThanOrEqual(2900);
    expect(durationMs).toBeLessThanOrEqual(3100);
  });

  it('sliding left cancels without reporting', () => {
    const onRecordingComplete = vi.fn();
    const onCancel = vi.fn();
    render(<VoiceMessageRecorder onRecordingComplete={onRecordingComplete} onCancel={onCancel} />);

    act(() => lastPanResponder.config.onPanResponderGrant());
    act(() => lastPanResponder.config.onPanResponderRelease({}, { dx: -150 }));

    expect(onRecordingComplete).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('stops by itself at maxDuration', () => {
    const onRecordingComplete = vi.fn();
    render(<VoiceMessageRecorder onRecordingComplete={onRecordingComplete} maxDuration={2000} />);

    act(() => lastPanResponder.config.onPanResponderGrant());
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onRecordingComplete).toHaveBeenCalledTimes(1);
    expect(onRecordingComplete.mock.calls[0][1]).toBe(2000);
  });
});

describe('VoiceMessageRecorder with an audio recorder', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('records through the given recorder and reports its file', async () => {
    const audioRecorder = {
      start: vi.fn(async () => {}),
      stop: vi.fn(async () => 'file:///recordings/voice-1.m4a'),
      cancel: vi.fn(),
    };
    const onRecordingComplete = vi.fn();
    render(<VoiceMessageRecorder onRecordingComplete={onRecordingComplete} audioRecorder={audioRecorder} />);

    act(() => lastPanResponder.config.onPanResponderGrant());
    expect(audioRecorder.start).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    await act(async () => {
      lastPanResponder.config.onPanResponderRelease({}, { dx: 0 });
    });

    expect(audioRecorder.stop).toHaveBeenCalledTimes(1);
    expect(onRecordingComplete).toHaveBeenCalledWith('file:///recordings/voice-1.m4a', 2000);
  });

  it('sliding left cancels the recorder', () => {
    const audioRecorder = { start: vi.fn(), stop: vi.fn(async () => 'x'), cancel: vi.fn() };
    const onRecordingComplete = vi.fn();
    render(<VoiceMessageRecorder onRecordingComplete={onRecordingComplete} audioRecorder={audioRecorder} />);

    act(() => lastPanResponder.config.onPanResponderGrant());
    act(() => lastPanResponder.config.onPanResponderRelease({}, { dx: -150 }));
    expect(audioRecorder.cancel).toHaveBeenCalledTimes(1);
    expect(audioRecorder.stop).not.toHaveBeenCalled();
    expect(onRecordingComplete).not.toHaveBeenCalled();
  });

  it('a recorder that cannot start (no microphone permission) reports onError', async () => {
    const audioRecorder = { start: vi.fn(async () => { throw new Error('permission denied'); }), stop: vi.fn(), cancel: vi.fn() };
    const onError = vi.fn();
    render(<VoiceMessageRecorder onRecordingComplete={vi.fn()} audioRecorder={audioRecorder} onError={onError} />);

    await act(async () => {
      lastPanResponder.config.onPanResponderGrant();
    });
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
