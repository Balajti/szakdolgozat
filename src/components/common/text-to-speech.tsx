'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

interface TextToSpeechProps {
  text: string;
  language?: string;
  /** Optional button label shown next to the icon. */
  label?: string;
  size?: 'default' | 'sm' | 'icon';
}

export function TextToSpeech({ text, language = 'en-US', label, size = 'icon' }: TextToSpeechProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if browser supports speech synthesis
    setIsSupported('speechSynthesis' in window);
    return () => {
      // Stop any ongoing speech when the button unmounts (e.g. dialog closes)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSpeak = () => {
    if (!isSupported || !text) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9; // Slightly slower for learning
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleSpeak}
      title={isSpeaking ? 'Felolvasás leállítása' : 'Felolvasás'}
      className={label ? 'gap-1.5' : undefined}
    >
      {isSpeaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      {label}
    </Button>
  );
}
