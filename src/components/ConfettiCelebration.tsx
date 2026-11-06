'use client';

import confetti from 'canvas-confetti';

export function fireConfetti() {
  try {
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#38bdf8', '#facc15', '#f472b6', '#4ade80', '#c084fc', '#fb923c'],
    });
  } catch {
    // ignore
  }
}

export function fireBigConfetti() {
  try {
    const end = Date.now() + 1000;
    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        colors: ['#38bdf8', '#facc15', '#f472b6', '#4ade80', '#c084fc'],
      });
    }, 200);
  } catch {
    // ignore
  }
}
