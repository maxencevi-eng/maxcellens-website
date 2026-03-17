/**
 * Converts an admin-set px font size into a responsive clamp() value.
 * Ensures the vw coefficient governs on narrow mobile screens (~360px)
 * so titles shrink gracefully instead of overflowing or breaking mid-word.
 */
export function responsiveFontSize(fs: number): string {
  if (fs <= 48) return `${fs}px`;
  const vw = (fs / 8).toFixed(2);
  const min = Math.max(20, Math.round(fs * 0.32));
  return `clamp(${min}px, ${vw}vw, ${fs}px)`;
}
