// Audio context primer - fixes first-play audio cutoff issue
let audioContextPrimed = false;

function primeAudioContext() {
  if (audioContextPrimed) return;
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const buffer = audioContext.createBuffer(1, 1, 22050);
  const source = audioContext.createBufferSource();
  source.buffer = buffer;
  source.connect(audioContext.destination);
  source.start(0);
  audioContextPrimed = true;
}

// Prime audio on first user interaction
export function initAudioPrimer() {
  if (typeof window === 'undefined') return;

  const primeOnInteraction = () => {
    primeAudioContext();
    document.removeEventListener('click', primeOnInteraction);
    document.removeEventListener('touchstart', primeOnInteraction);
    document.removeEventListener('keydown', primeOnInteraction);
  };
  document.addEventListener('click', primeOnInteraction);
  document.addEventListener('touchstart', primeOnInteraction);
  document.addEventListener('keydown', primeOnInteraction);
}

// Initialize on module load
initAudioPrimer();
