/**
 * Audio feedback for POS thermal receipt printer interactions.
 * Synthesized using Web Audio API (zero external assets, low latency, 100% offline).
 */

class PosAudioEngine {
  private ctx: AudioContext | null = null;
  private currentPrintSource: AudioBufferSourceNode | null = null;
  private currentPrintGain: GainNode | null = null;
  private cachedPrintBuffer: AudioBuffer | null = null;
  private cachedLineBuffer: AudioBuffer | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Synthesize gentle thermal printer paper feeding sound ("rè rè nhẹ nhàng... tách").
   * Synchronized precisely with the 2.0s CSS paper feed animation:
   * - 0.0s -> 2.0s: gentle paper feed stepper purr & soft glide
   * - Exact 2.0s mark: crisp paper cut & mechanical latch click ("tách!")
   */
  private createThermalPrinterBuffer(ctx: AudioContext, feedDuration = 2.0): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const cutterDuration = 0.18;
    const totalDuration = feedDuration + cutterDuration;
    const totalSamples = Math.floor(sampleRate * totalDuration);
    const audioBuffer = ctx.createBuffer(1, totalSamples, sampleRate);
    const output = audioBuffer.getChannelData(0);

    let phase = 0;
    let noiseState = 0x2468ace0;

    function nextNoise() {
      noiseState = (noiseState * 1664525 + 1013904223) | 0;
      return noiseState / 0x7fffffff;
    }

    let bpPrev = 0;
    let lpPrev = 0;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      if (t < feedDuration) {
        // 1. GENTLE PRINTING FEED STAGE (0.0s to 2.0s):
        const feedProgress = t / feedDuration;

        // Soft rhythmic line cadence (~26 Hz)
        const linePulse = 0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 26);

        // Warm stepper frequency (~185Hz to 215Hz - low-mid purr)
        const motorFreq = 185 + 25 * Math.sin(feedProgress * Math.PI * 0.85);

        phase += (2 * Math.PI * motorFreq) / sampleRate;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

        // Warm rounded waveform
        const sin1 = Math.sin(phase);
        const sin2 = Math.sin(phase * 2);
        const warmTone = (sin1 * 0.7 + sin2 * 0.25 + Math.sin(phase * 3) * 0.05);

        // Soft paper glide noise (~1.2kHz - 2.2kHz)
        const rawNoise = nextNoise();
        lpPrev += 0.22 * (rawNoise - lpPrev);
        bpPrev += 0.16 * (lpPrev - bpPrev);
        const softPaper = (lpPrev - bpPrev) * 1.5;

        const sample = (warmTone * 0.65 + softPaper * 0.35) * linePulse;

        // Envelope: 35ms fade in, gentle fade at 2.0s
        const fadeIn = Math.min(1, t / 0.035);
        const fadeOut = Math.min(1, (feedDuration - t) / 0.03);

        output[i] = sample * fadeIn * fadeOut * 0.22;
      } else {
        // 2. CUTTER "TÁCH" STAGE (triggers at exactly 2.0s when bill stops emerging)
        const ct = t - feedDuration; // 0 to 0.18s
        let cutterSample = 0;

        // Part A: Crisp blade shear snip ("xoẹt" at 0.002s - 0.045s)
        if (ct >= 0.002 && ct < 0.045) {
          const tSlice = ct - 0.002;
          const shearNoise = nextNoise() * Math.exp(-tSlice * 120);
          const shearChirp = Math.sin(tSlice * 2 * Math.PI * 2400) * Math.exp(-tSlice * 150);
          cutterSample += (shearNoise * 0.6 + shearChirp * 0.4) * 0.22;
        }

        // Part B: Crisp mechanical latch click ("tách" at 0.035s - 0.12s)
        if (ct >= 0.035 && ct < 0.12) {
          const tClick = ct - 0.035;
          const snap = Math.sin(tClick * 2 * Math.PI * 1250) * Math.exp(-tClick * 95);
          const body = Math.sin(tClick * 2 * Math.PI * 260) * Math.exp(-tClick * 75);
          const transient = nextNoise() * Math.exp(-tClick * 160) * 0.35;
          cutterSample += (snap * 0.55 + body * 0.3 + transient * 0.15) * 0.28;
        }

        output[i] = cutterSample;
      }
    }

    return audioBuffer;
  }

  /**
   * Play continuous thermal printer mechanical buzz ("rè rè nhẹ nhàng... tách").
   * Automatically stops any currently playing print sound.
   */
  public playPrintingBuzz(feedDuration = 2.0): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      this.stopPrintingBuzz();

      // Regenerate or use cached buffer with matching duration
      if (!this.cachedPrintBuffer) {
        this.cachedPrintBuffer = this.createThermalPrinterBuffer(ctx, feedDuration);
      }

      const source = ctx.createBufferSource();
      source.buffer = this.cachedPrintBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.55, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      this.currentPrintSource = source;
      this.currentPrintGain = gain;

      source.onended = () => {
        if (this.currentPrintSource === source) {
          this.currentPrintSource = null;
          this.currentPrintGain = null;
        }
      };

      source.start();
    } catch {
      // Audio autoplay policy or hardware muted
    }
  }

  /**
   * Smoothly stop the printing sound (e.g. if modal closed early or restarted).
   */
  public stopPrintingBuzz(): void {
    if (this.currentPrintGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.currentPrintGain.gain.setValueAtTime(this.currentPrintGain.gain.value, now);
        this.currentPrintGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        const src = this.currentPrintSource;
        setTimeout(() => {
          try {
            src?.stop();
          } catch {}
        }, 40);
      } catch {}
    }
    this.currentPrintSource = null;
    this.currentPrintGain = null;
  }

  /**
   * Sound of a single line feeding through a thermal printer stepper motor ("rẹt nhẹ").
   * Used when items are added to the cart.
   */
  public playLineTick(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      if (!this.cachedLineBuffer) {
        const sampleRate = ctx.sampleRate;
        const duration = 0.045;
        const total = Math.floor(sampleRate * duration);
        const buf = ctx.createBuffer(1, total, sampleRate);
        const data = buf.getChannelData(0);
        let phase = 0;
        let noiseState = 0x51423;
        let bp = 0;
        let lp = 0;

        for (let i = 0; i < total; i++) {
          const t = i / sampleRate;
          const rawNoise =
            ((noiseState = (noiseState * 1664525 + 1013904223) | 0) / 0x7fffffff);
          lp += 0.25 * (rawNoise - lp);
          bp += 0.18 * (lp - bp);
          const noise = (lp - bp) * 1.2;

          phase += (2 * Math.PI * 220) / sampleRate;
          const tone = Math.sin(phase) * 0.7 + Math.sin(phase * 2) * 0.3;

          const env = Math.exp(-t * 60);
          data[i] = (tone * 0.65 + noise * 0.35) * env * 0.18;
        }
        this.cachedLineBuffer = buf;
      }

      const src = ctx.createBufferSource();
      src.buffer = this.cachedLineBuffer;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      // Audio autoplay policy or hardware muted
    }
  }

  /**
   * Sound of a rubber stamp hitting paper ("ĐÃ THANH TOÁN" / "PAID").
   */
  public playStampThud(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio autoplay policy or hardware muted
    }
  }

  /**
   * Sound of a supermarket POS barcode scanner beep.
   */
  public playScanBeep(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio autoplay policy or hardware muted
    }
  }

  /**
   * Sound of an item dropping into the shopping cart / receipt bay.
   * Cheerful two-tone marimba pop.
   */
  public playCartDrop(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.06);
      osc.frequency.exponentialRampToValueAtTime(460, ctx.currentTime + 0.14);

      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {
      // Audio autoplay policy or hardware muted
    }
  }
}

export const posAudio = new PosAudioEngine();
