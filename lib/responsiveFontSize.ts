/**
 * Converts an admin-set px font size into a responsive clamp() value.
 *
 * Rules:
 * - ≤ 24px  → fixed (body text / small labels, no overflow risk)
 * - > 24px  → clamp(min, Nvw, fs) where vw is capped at 9vw.
 *
 * The 9vw cap ensures that even on a 320px phone (content ≈ 240px after
 * padding), the longest common French words (13–14 chars) never break:
 *   9vw × 320 = 28.8px  →  28.8 × 0.6 × 13 ≈ 225px  <  240px  ✓
 *   9vw × 360 = 32.4px  →  32.4 × 0.6 × 13 ≈ 253px  <  280px  ✓
 *   9vw × 390 = 35.1px  →  35.1 × 0.6 × 13 ≈ 274px  <  340px  ✓
 */
export function responsiveFontSize(fs: number): string {
  if (fs <= 24) return `${fs}px`;
  // Cap the vw coefficient at 9 to prevent overflow on narrow phones
  const vw = Math.min(fs / 8, 9).toFixed(2);
  const min = Math.max(14, Math.round(fs * 0.22));
  return `clamp(${min}px, ${vw}vw, ${fs}px)`;
}
