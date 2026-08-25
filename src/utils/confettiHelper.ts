import type { Options } from 'canvas-confetti';

export async function triggerCelebrationConfetti(options?: Options) {
  try {
    const { default: confetti } = await import('canvas-confetti');
    confetti(
      options || {
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      }
    );
  } catch (err) {
    console.warn('Confetti animation failed to load:', err);
  }
}
