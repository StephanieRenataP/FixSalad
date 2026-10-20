// RNG ber-seed supaya test acak tetap reproducible (mulberry32).
export function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1)),
    pick: <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)],
  };
}

/** Semua angka di dalam objek (rekursif). */
export function allNumbers(x: unknown, out: number[] = []): number[] {
  if (typeof x === 'number') out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => allNumbers(v, out));
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => allNumbers(v, out));
  return out;
}
