/**
 * Sound notification utility
 * Uses Web Audio API to play notification sounds
 * 
 * Sound Types:
 * - success: Pleasant upward chime (for reporting lost/found items)
 * - notification: Gentle ding (for new notifications arriving)
 * - match: Exciting celebration chord (for item matches found)
 * - complete: Triumphant ascending notes (for handoff completion, item resolution)
 * - error: Descending tone (for errors)
 */

type SoundType = 'success' | 'notification' | 'match' | 'complete' | 'error';

class SoundManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      // Check if user has sound enabled in localStorage
      const soundPref = localStorage.getItem('soundEnabled');
      this.enabled = soundPref !== 'false';
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a sound based on the type of notification
   */
  play(type: SoundType) {
    if (!this.enabled || typeof window === 'undefined') return;

    try {
      const ctx = this.getAudioContext();
      
      switch (type) {
        case 'success':
          this.playSuccess(ctx);
          break;
        case 'notification':
          this.playNotification(ctx);
          break;
        case 'match':
          this.playMatch(ctx);
          break;
        case 'complete':
          this.playComplete(ctx);
          break;
        case 'error':
          this.playError(ctx);
          break;
      }
    } catch (error) {
      console.warn('Failed to play sound:', error);
    }
  }

  /**
   * Success sound - pleasant upward chime (for reporting items)
   */
  private playSuccess(ctx: AudioContext) {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, now); // C5
    oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5

    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    oscillator.start(now);
    oscillator.stop(now + 0.4);
  }

  /**
   * Notification sound - gentle ding (for new notifications)
   */
  private playNotification(ctx: AudioContext) {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, now);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  /**
   * Match sound - exciting celebration (for finding matches)
   */
  private playMatch(ctx: AudioContext) {
    const now = ctx.currentTime;
    
    // Play a celebratory chord
    const frequencies = [523.25, 659.25, 783.99]; // C-E-G major chord
    
    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      gainNode.gain.setValueAtTime(0.15, now + index * 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);

      oscillator.start(now + index * 0.05);
      oscillator.stop(now + 0.6);
    });
  }

  /**
   * Complete sound - triumphant completion (for handoff complete)
   */
  private playComplete(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C-E-G-C ascending

    notes.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now + index * 0.1);

      gainNode.gain.setValueAtTime(0.2, now + index * 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + index * 0.1 + 0.3);

      oscillator.start(now + index * 0.1);
      oscillator.stop(now + index * 0.1 + 0.3);
    });
  }

  /**
   * Error sound - descending tone (for errors)
   */
  private playError(ctx: AudioContext) {
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.3);

    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  /**
   * Toggle sound on/off
   */
  toggleSound(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEnabled', String(enabled));
    }
  }

  /**
   * Check if sound is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const soundManager = new SoundManager();

// Convenience functions
export const playSuccessSound = () => soundManager.play('success');
export const playNotificationSound = () => soundManager.play('notification');
export const playMatchSound = () => soundManager.play('match');
export const playCompleteSound = () => soundManager.play('complete');
export const playErrorSound = () => soundManager.play('error');
