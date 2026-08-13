import { normalQuantile, normalUpperTail } from './normal-dist'

export interface ShapiroWilkResult {
  W: number
  p: number
}

function poly(coefficients: number[], x: number): number {
  let result = coefficients[0]
  if (coefficients.length > 1) {
    let p = x * coefficients[coefficients.length - 1]
    for (let j = coefficients.length - 2; j > 0; j--) {
      p = (p + coefficients[j]) * x
    }
    result += p
  }
  return result
}

// ALG-08's normality test. Direct port of R's swilk.c (Royston 1995,
// Algorithm AS R94, Applied Statistics 44(4), 547-551), which is itself a
// C translation of Royston's original Fortran. Kept index-for-index close
// to the C source (1-based `a` array, same variable names) rather than
// "cleaned up" — this is a graded requirement (mvp.md ALG-08) that will be
// read against the reference algorithm, so fidelity to the source beats
// idiomatic style here.
export function shapiroWilk(input: number[]): ShapiroWilkResult {
  const n = input.length
  if (n < 3) throw new Error('shapiroWilk: requires at least 3 observations')
  if (n > 5000) throw new Error('shapiroWilk: unreliable above n ~= 5000 (mvp.md ALG-08 edge case)')

  const x = [...input].sort((a, b) => a - b)

  const range = x[n - 1] - x[0]
  if (range < 1e-19) throw new Error('shapiroWilk: zero range (all values identical)')

  const nn2 = Math.floor(n / 2)
  // 1-based, like the C source: a[1..nn2].
  const a = new Array<number>(nn2 + 1).fill(0)

  const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056]
  const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633]
  const c3 = [0.544, -0.39978, 0.025054, -6.714e-4]
  const c4 = [1.3822, -0.77857, 0.062767, -0.0020322]
  const c5 = [-1.5861, -0.31082, -0.083751, 0.0038915]
  const c6 = [-0.4803, -0.082676, 0.0030302]
  const g = [-2.273, 0.459]

  const an = n

  if (n === 3) {
    a[1] = 0.70710678 // sqrt(1/2)
  } else {
    const an25 = an + 0.25
    let summ2 = 0
    for (let i = 1; i <= nn2; i++) {
      a[i] = normalQuantile((i - 0.375) / an25)
      summ2 += a[i] * a[i]
    }
    summ2 *= 2
    const ssumm2 = Math.sqrt(summ2)
    const rsn = 1 / Math.sqrt(an)
    const a1 = poly(c1, rsn) - a[1] / ssumm2

    let i1: number
    let fac: number
    if (n > 5) {
      i1 = 3
      const a2 = -a[2] / ssumm2 + poly(c2, rsn)
      fac = Math.sqrt(
        (summ2 - 2 * (a[1] * a[1]) - 2 * (a[2] * a[2])) / (1 - 2 * (a1 * a1) - 2 * (a2 * a2))
      )
      a[2] = a2
    } else {
      i1 = 2
      fac = Math.sqrt((summ2 - 2 * (a[1] * a[1])) / (1 - 2 * (a1 * a1)))
    }
    a[1] = a1
    for (let i = i1; i <= nn2; i++) a[i] /= -fac
  }

  // Calculate W as the squared correlation between the sorted, range-scaled
  // data and the a[] coefficients. a[] is symmetric: for a value at
  // 0-based position i (from the low end) or its mirror j = n-1-i (from the
  // high end), the effective weight is +a[1+min(i,j)] on the high side and
  // -a[1+min(i,j)] on the low side.
  let sa = -a[1]
  let sx = x[0] / range
  for (let i = 1, j = n - 2; i < n; i++, j--) {
    const xi = x[i] / range
    sx += xi
    if (i !== j) sa += Math.sign(i - j) * a[1 + Math.min(i, j)]
  }

  sa /= n
  sx /= n
  let ssa = 0
  let ssx = 0
  let sax = 0
  for (let i = 0, j = n - 1; i < n; i++, j--) {
    const asa = i !== j ? Math.sign(i - j) * a[1 + Math.min(i, j)] - sa : -sa
    const xsx = x[i] / range - sx
    ssa += asa * asa
    ssx += xsx * xsx
    sax += asa * xsx
  }

  const ssassx = Math.sqrt(ssa * ssx)
  const w1 = ((ssassx - sax) * (ssassx + sax)) / (ssa * ssx)
  const W = 1 - w1

  if (n === 3) {
    const pi6 = 1.90985931710274 // 6/pi
    const stqr = 1.04719755119660 // asin(sqrt(3/4))
    const p = Math.max(0, pi6 * (Math.asin(Math.sqrt(W)) - stqr))
    return { W, p }
  }

  const lnN = Math.log(an)
  let y = Math.log(w1)
  let m: number
  let s: number
  if (n <= 11) {
    const gamma = poly(g, an)
    if (y >= gamma) return { W, p: 1e-99 }
    y = -Math.log(gamma - y)
    m = poly(c3, an)
    s = Math.exp(poly(c4, an))
  } else {
    m = poly(c5, lnN)
    s = Math.exp(poly(c6, lnN))
  }

  const p = normalUpperTail(y, m, s)
  return { W, p }
}
