// Deterministic PRNG and fold assignment for FR-31's 10-fold cross-validation
// (spec §5.1: "fix the seed; it must be reproducible"). mulberry32 is pure
// 32-bit integer arithmetic (Math.imul / >>>), so it is bit-identical across
// V8 versions, Node versions, and platforms — unlike Math.random(), which
// carries no such guarantee.
//
// This will NOT byte-match Python's
// `sklearn.model_selection.KFold(n_splits=10, shuffle=True, random_state=42)`.
// sklearn routes the seed through NumPy's MT19937 plus NumPy's specific
// bounded-integer rejection-sampling permutation algorithm — reproducing
// that exactly means porting MT19937 and matching NumPy's draw scheme bit
// for bit, for zero methodological benefit. FR-31's amendment already
// accepts this (CV R² 0.39-0.41, MAPE 19-20% as a tolerance band rather
// than an exact match). To keep the *only* remaining difference the
// permutation itself, seededKFoldIndices mirrors sklearn's fold-size rule
// exactly: n // k observations per fold, with the first (n % k) folds
// getting one extra, sliced contiguously from the shuffled index order.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Fisher-Yates shuffle, driven by a seeded generator so the result is
// reproducible across runs and environments.
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Partitions indices [0, n) into `k` folds. Sizes mirror sklearn's KFold
// rule: n // k per fold, with the first (n % k) folds getting one extra
// observation, sliced contiguously out of the seeded-shuffled order.
export function seededKFoldIndices(n: number, k: number, seed: number): number[][] {
  if (k < 2 || k > n) throw new Error('seededKFoldIndices: k must be between 2 and n')
  const order = seededShuffle(
    Array.from({ length: n }, (_, i) => i),
    seed
  )
  const base = Math.floor(n / k)
  const remainder = n % k
  const folds: number[][] = []
  let offset = 0
  for (let f = 0; f < k; f++) {
    const size = base + (f < remainder ? 1 : 0)
    folds.push(order.slice(offset, offset + size))
    offset += size
  }
  return folds
}
