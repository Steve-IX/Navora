// Voice guidance service using Web Speech API
export class VoiceGuidanceService {
  private synth: SpeechSynthesis | null = null;
  private isEnabled: boolean = false;

  constructor() {
    if ('speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.isEnabled = true;
    }
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
    if (!this.synth || !this.isEnabled) return;

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;

    this.synth.speak(utterance);
  }

  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  isSupported(): boolean {
    return this.isEnabled;
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }
}

export const voiceGuidanceService = new VoiceGuidanceService();

