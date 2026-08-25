/**
 * Web Audio Engine for timeline playback, synthetic audio tracks, and canvas capture mixing
 */
class TimelineAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private isInitialized = false;
  private activeOscillators: OscillatorNode[] = [];
  private activeAudioElements: Map<string, HTMLAudioElement> = new Map();

  public init() {
    if (this.isInitialized && this.ctx) return;
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);

      this.mediaDest = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.mediaDest);

      this.isInitialized = true;
    } catch {}
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaDest ? this.mediaDest.stream : null;
  }

  public resume() {
    if (!this.isInitialized) this.init();
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public syncTimelineAudio(project: any, currentTime: number, isPlaying: boolean) {
    if (!this.isInitialized) this.init();
    if (!this.ctx || !this.masterGain) return;

    if (!isPlaying) {
      this.stopAllPlayback();
      return;
    }

    this.resume();

    // Find active audio tracks
    if (!project || !project.tracks) return;
    const audioTracks = project.tracks.filter((t: any) => t.type === "audio" && !t.muted);

    audioTracks.forEach((track: any) => {
      track.clips.forEach((clip: any) => {
        const clipStart = clip.start || 0;
        const clipEnd = clipStart + (clip.duration || 0);

        if (currentTime >= clipStart && currentTime <= clipEnd) {
          const localTime = (currentTime - clipStart) + (clip.offset || 0);

          // Handle real audio files
          if (clip.src && (clip.src.startsWith("/") || clip.src.startsWith("blob:") || clip.src.startsWith("http"))) {
            let audioEl = this.activeAudioElements.get(clip.id);
            if (!audioEl) {
              audioEl = new Audio(clip.src);
              audioEl.crossOrigin = "anonymous";
              this.activeAudioElements.set(clip.id, audioEl);
            }

            if (Math.abs(audioEl.currentTime - localTime) > 0.2) {
              audioEl.currentTime = localTime;
            }
            if (audioEl.paused) {
              audioEl.volume = Math.max(0, Math.min(1, clip.volume ?? 1));
              audioEl.play().catch(() => {});
            }
          }
        } else {
          // Clip is not active, pause if running
          const audioEl = this.activeAudioElements.get(clip.id);
          if (audioEl && !audioEl.paused) {
            audioEl.pause();
          }
        }
      });
    });
  }

  public stopAllPlayback() {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators = [];

    this.activeAudioElements.forEach((audioEl) => {
      try {
        audioEl.pause();
      } catch {}
    });
  }

  public playSoundEffect(type: "hit" | "jingle" | "click" | "beep") {
    this.init();
    this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (type === "hit") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.6);

      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === "jingle") {
      const freqs = [349.23, 440.0, 523.25, 698.46];
      freqs.forEach((f, i) => {
        if (!this.ctx || !this.masterGain) return;
        const noteOsc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();
        const noteTime = now + i * 0.14;

        noteOsc.type = "triangle";
        noteOsc.frequency.setValueAtTime(f, noteTime);

        noteGain.gain.setValueAtTime(0, noteTime);
        noteGain.gain.linearRampToValueAtTime(0.4, noteTime + 0.04);
        noteGain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.5);

        noteOsc.connect(noteGain);
        noteGain.connect(this.masterGain);
        noteOsc.start(noteTime);
        noteOsc.stop(noteTime + 0.5);
      });
    } else if (type === "click") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === "beep") {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  public setMasterVolume(vol: number) {
    if (!this.isInitialized) this.init();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(2, vol)), this.ctx.currentTime);
    }
  }
}

export const audioEngine = new TimelineAudioEngine();
