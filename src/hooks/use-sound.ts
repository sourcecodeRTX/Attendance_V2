"use client";

import { useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

type SoundType = "present" | "absent" | "complete" | "error";

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

const SOUND_CONFIGS: Record<SoundType, SoundConfig> = {
  present: {
    frequency: 600,
    duration: 0.15,
    type: "sine",
    volume: 0.3,
  },
  absent: {
    frequency: 300,
    duration: 0.15,
    type: "sine",
    volume: 0.3,
  },
  complete: {
    frequency: 800,
    duration: 0.3,
    type: "sine",
    volume: 0.25,
  },
  error: {
    frequency: 200,
    duration: 0.2,
    type: "triangle",
    volume: 0.3,
  },
};

export function useSound() {
  const { preferences } = useAuthStore();
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playSound = useCallback(
    (type: SoundType) => {
      // Check if sound is enabled in preferences
      if (!preferences?.soundEnabled) return;

      try {
        const audioContext = getAudioContext();
        const config = SOUND_CONFIGS[type];

        // Create oscillator and gain nodes
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        // Configure oscillator
        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

        // Configure gain (volume) with fade out
        gainNode.gain.setValueAtTime(config.volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + config.duration
        );

        // Play sound
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + config.duration);
      } catch (error) {
        // Silently fail if audio context is not available
        console.warn("Audio playback failed:", error);
      }
    },
    [preferences?.soundEnabled, getAudioContext]
  );

  const playPresent = useCallback(() => playSound("present"), [playSound]);
  const playAbsent = useCallback(() => playSound("absent"), [playSound]);
  const playComplete = useCallback(() => playSound("complete"), [playSound]);
  const playError = useCallback(() => playSound("error"), [playSound]);

  const { updatePreferences } = useAuthStore();
  
  const toggle = useCallback(() => {
    const newValue = !(preferences?.soundEnabled ?? true);
    updatePreferences({ soundEnabled: newValue });
  }, [preferences?.soundEnabled, updatePreferences]);

  return {
    playSound,
    playPresent,
    playAbsent,
    playComplete,
    playError,
    isEnabled: preferences?.soundEnabled ?? true,
    toggle,
  };
}
