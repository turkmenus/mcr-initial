/**
 * Production-Grade Web Audio Engine for multi-track timeline playback,
 * per-track Gain & Panner nodes, real-time Analyser VU meters, and canvas stream mixing.
 */
class TimelineAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private mediaDest: MediaStreamAudioDestinationNode | null = null;
  private isInitialized = false;

  // Track & Clip nodes
  private trackGains: Map<string, GainNode> = new Map();
  private trackPanners: Map<string, StereoPannerNode> = new Map();
  private trackAnalysers: Map<string, AnalyserNode> = new Map();

  private activeAudioElements: Map<string, HTMLAudioElement> = new Map();
  private activeMediaSources: Map<string, MediaElementAudioSourceNode> = new Map();
  private clipVolumeOverrides: Map<string, number> = new Map();

  public init() {
    if (this.isInitialized && this.ctx) return;
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);

      // Master Analyser for VU Meter
      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 128;
      this.masterAnalyser.smoothingTimeConstant = 0.8;

      // Stream Destination for Client-Side Master Recording
      this.mediaDest = this.ctx.createMediaStreamDestination();

      this.masterGain.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);
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

  private getOrCreateTrackChain(trackId: string) {
    if (!this.ctx || !this.masterGain) return null;

    let gain = this.trackGains.get(trackId);
    let panner = this.trackPanners.get(trackId);
    let analyser = this.trackAnalysers.get(trackId);

    if (!gain || !panner || !analyser) {
      gain = this.ctx.createGain();
      gain.gain.setValueAtTime(1.0, this.ctx.currentTime);

      panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(0.0, this.ctx.currentTime);

      analyser = this.ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;

      gain.connect(panner);
      panner.connect(analyser);
      analyser.connect(this.masterGain);

      this.trackGains.set(trackId, gain);
      this.trackPanners.set(trackId, panner);
      this.trackAnalysers.set(trackId, analyser);
    }

    return { gain, panner, analyser };
  }

  public setTrackVolume(trackId: string, volume: number) {
    if (!this.isInitialized) this.init();
    const chain = this.getOrCreateTrackChain(trackId);
    if (chain && this.ctx) {
      const targetVol = Math.max(0, Math.min(2.0, volume));
      chain.gain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.02);
    }
  }

  public setTrackPan(trackId: string, pan: number) {
    if (!this.isInitialized) this.init();
    const chain = this.getOrCreateTrackChain(trackId);
    if (chain && this.ctx) {
      const targetPan = Math.max(-1.0, Math.min(1.0, pan));
      chain.panner.pan.setTargetAtTime(targetPan, this.ctx.currentTime, 0.02);
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

    if (!project || !project.tracks) return;
    const audioTracks = project.tracks.filter((t: any) => t.type === "audio" || t.type === "video");

    audioTracks.forEach((track: any) => {
      const trackChain = this.getOrCreateTrackChain(track.id);
      if (!trackChain) return;

      // Update track mute state
      const isMuted = track.muted === true;
      trackChain.gain.gain.setValueAtTime(isMuted ? 0 : 1.0, this.ctx!.currentTime);

      track.clips.forEach((clip: any) => {
        const clipStart = clip.start || 0;
        const clipDuration = clip.duration || 0;
        const clipEnd = clipStart + clipDuration;

        if (currentTime >= clipStart && currentTime <= clipEnd && !isMuted) {
          const localTime = currentTime - clipStart + (clip.offset || 0);

          if (clip.src && (clip.src.startsWith("/") || clip.src.startsWith("blob:") || clip.src.startsWith("http"))) {
            let audioEl = this.activeAudioElements.get(clip.id);
            if (!audioEl) {
              audioEl = new Audio(clip.src);
              audioEl.crossOrigin = "anonymous";
              audioEl.preload = "auto";
              this.activeAudioElements.set(clip.id, audioEl);

              // Connect to Web Audio Graph
              try {
                const sourceNode = this.ctx!.createMediaElementSource(audioEl);
                sourceNode.connect(trackChain.gain);
                this.activeMediaSources.set(clip.id, sourceNode);
              } catch {}
            }

            // Sync playback position
            if (Math.abs(audioEl.currentTime - localTime) > 0.15) {
              audioEl.currentTime = localTime;
            }

            // Calculate Volume with Fade In / Fade Out curves
            let calculatedVol = clip.volume !== undefined ? clip.volume : 1.0;
            const timeSinceStart = currentTime - clipStart;
            const timeUntilEnd = clipEnd - currentTime;

            if (clip.fadeIn && clip.fadeIn > 0 && timeSinceStart < clip.fadeIn) {
              calculatedVol *= timeSinceStart / clip.fadeIn;
            }
            if (clip.fadeOut && clip.fadeOut > 0 && timeUntilEnd < clip.fadeOut) {
              calculatedVol *= timeUntilEnd / clip.fadeOut;
            }

            audioEl.volume = Math.max(0, Math.min(1.0, calculatedVol));

            if (audioEl.paused) {
              audioEl.play().catch(() => {});
            }
          }
        } else {
          // Pause if active
          const audioEl = this.activeAudioElements.get(clip.id);
          if (audioEl && !audioEl.paused) {
            audioEl.pause();
          }
        }
      });
    });
  }

  public stopAllPlayback() {
    this.activeAudioElements.forEach((audioEl) => {
      try {
        if (!audioEl.paused) audioEl.pause();
      } catch {}
    });
  }

  /**
   * Reads real-time frequency/amplitude data from Master Analyser for VU meters
   */
  public getMasterLevel(): { left: number; right: number; peak: number } {
    if (!this.masterAnalyser) return { left: 0, right: 0, peak: 0 };
    const bufferLength = this.masterAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.masterAnalyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    let max = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
      if (Math.abs(val) > max) max = Math.abs(val);
    }
    const rms = Math.sqrt(sum / bufferLength);
    const normalized = Math.min(1.0, rms * 3.5);

    return {
      left: normalized * 0.95,
      right: normalized * 1.05,
      peak: max,
    };
  }

  /**
   * Reads real-time frequency/amplitude data for a specific track channel
   */
  public getTrackLevel(trackId: string): { left: number; right: number } {
    const analyser = this.trackAnalysers.get(trackId);
    if (!analyser) return { left: 0, right: 0 };

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = (dataArray[i] - 128) / 128;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const normalized = Math.min(1.0, rms * 3.5);

    return {
      left: normalized * 0.95,
      right: normalized * 1.05,
    };
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
