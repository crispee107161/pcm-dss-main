import { describe, it, expect } from 'vitest'
import { shapiroWilk } from './shapiro-wilk'

// Reference W/p values generated independently via Python's
// scipy.stats.shapiro (v1.17.1, itself a wrapper around the Fortran
// Royston/AS R94 reference implementation) — not hand-transcribed from a
// textbook, to avoid compounding two independent transcription risks in a
// graded requirement (mvp.md ALG-08). See lib/stats/normal-dist.ts's header
// for why this level of rigor: the docs' pseudocode says "shapiro_wilk(X)"
// but doesn't specify a numeric implementation, and no vetted npm package
// exists, so this port is validated against scipy directly.
describe('shapiroWilk', () => {
  it('matches scipy on a visibly right-skewed n=11 sample (rejects normality)', () => {
    const data = [148, 154, 158, 160, 161, 162, 166, 170, 182, 195, 236]
    const { W, p } = shapiroWilk(data)
    expect(W).toBeCloseTo(0.7888146948631716, 6)
    expect(p).toBeCloseTo(0.006703814061898823, 5)
  })

  it('matches scipy on a near-normal n=30 sample (does not reject normality)', () => {
    const data = [54.9671, 48.6174, 56.4769, 65.2303, 47.6585, 47.6586, 65.7921, 57.6743, 45.3053, 55.4256, 45.3658, 45.3427, 52.4196, 30.8672, 32.7508, 44.3771, 39.8717, 53.1425, 40.9198, 35.877, 64.6565, 47.7422, 50.6753, 35.7525, 44.5562, 51.1092, 38.4901, 53.757, 43.9936, 47.0831]
    const { W, p } = shapiroWilk(data)
    expect(W).toBeCloseTo(0.975138188447815, 6)
    expect(p).toBeCloseTo(0.6868018980875705, 5)
  })

  it('matches scipy at n=187 — the exact sample size ALG-08 runs against (ad_engagement_rate/cost_per_inquiry)', () => {
    const data = [16.9915, 29.2614, 19.9325, 14.7114, 24.1127, 13.8958, 21.0443, 10.2016, 13.3591, 20.9843, 23.6923, 20.8568, 19.4218, 18.4945, 12.6074, 16.4008, 17.6968, 25.2856, 21.7181, 11.1848, 21.6204, 18.0746, 16.6154, 23.0584, 25.155, 24.6564, 15.8039, 18.4539, 21.6563, 24.8777, 17.6041, 19.0717, 14.4683, 14.019, 24.0626, 26.7812, 19.6399, 25.0177, 21.8082, 16.7744, 21.807, 27.6902, 19.8209, 27.8232, 6.9013, 24.1095, 20.4352, 18.505, 20.4588, 10.0622, 18.9016, 21.7856, 27.3895, 17.4086, 15.9575, 17.4912, 24.577, 21.6438, 17.3512, 22.5663, 20.4854, 24.8432, 16.4897, 18.3617, 18.0395, 12.6824, 21.4806, 21.3053, 20.0256, 18.8271, 12.9231, 17.8968, 18.2864, 15.9886, 19.1936, 22.0203, 29.4309, 20.8729, 21.2878, 19.6278, 10.4061, 19.8674, 20.3012, 32.3162, 19.0382, 21.5077, 19.8264, 14.1566, 25.7141, 23.7597, 23.9552, 15.4531, 27.014, 12.9907, 22.9343, 30.9523, 15.0473, 17.1685, 20.4983, 17.4826, 12.2467, 20.3428, 14.6885, 22.368, 15.4029, 27.7497, 16.0837, 18.3897, 24.0676, 13.8457, 21.1373, 26.5357, 11.9626, 20.9232, 21.2994, 23.9091, 13.8152, 13.3977, 22.6097, 21.4849, 21.2525, 21.7322, 16.5999, 21.1613, 21.4654, 16.4282, 29.3289, 22.3692, 14.0435, 23.2828, 15.1266, 23.9354, 25.793, 15.8966, 24.8169, 22.0639, 24.1103, 29.484, 18.7731, 16.2313, 15.5524, 15.9209, 19.6145, 21.7058, 21.3835, 24.1359, 20.065, 27.2677, 18.6767, 33.6008, 23.1283, 15.7142, 14.6455, 22.4124, 18.8827, 23.57, 22.3662, 19.6359, 15.766, 12.4258, 17.7674, 24.282, 21.0705, 13.7713, 20.8659, 21.9266, 15.5807, 20.7686, 20.291, 14.2851, 21.7889, 22.8039, 25.4153, 25.269, 13.1117, 15.3109, 22.5752, 22.5689, 22.5752, 39.2637, 22.8545, 25.6778, 24.77, 23.257, 18.4237, 23.7948, 16.1359]
    const { W, p } = shapiroWilk(data)
    expect(W).toBeCloseTo(0.9873556364925379, 6)
    expect(p).toBeCloseTo(0.09319692279115263, 5)
  })

  it('matches scipy at n=5 — the i1 branch boundary (n<=5 vs n>5)', () => {
    const data = [2.1, 3.4, 3.9, 4.2, 9.8]
    const { W, p } = shapiroWilk(data)
    expect(W).toBeCloseTo(0.7979151912573852, 6)
    expect(p).toBeCloseTo(0.07791688509678601, 5)
  })

  it('matches scipy at n=12 — the p-value branch boundary (n<=11 vs n>=12)', () => {
    const data = [-0.2368, -0.4854, 0.0819, 2.3147, -1.8673, 0.6863, -1.6127, -0.4719, 1.089, 0.0643, -1.0777, -0.7153]
    const { W, p } = shapiroWilk(data)
    expect(W).toBeCloseTo(0.9630134678507234, 6)
    expect(p).toBeCloseTo(0.8258280794880877, 5)
  })

  it('is invariant under a positive linear transform (a*x+b), a mathematical property of W', () => {
    const data = [5, 2, 9, 3, 7, 1, 8, 4, 6, 10, 12]
    const transformed = data.map(v => v * 3.7 + 12)
    const original = shapiroWilk(data)
    const scaled = shapiroWilk(transformed)
    expect(scaled.W).toBeCloseTo(original.W, 8)
    expect(scaled.p).toBeCloseTo(original.p, 8)
  })

  it('does not accept fewer than 3 observations', () => {
    expect(() => shapiroWilk([1, 2])).toThrow()
  })

  it('rejects a zero-range (all-identical) sample rather than dividing by zero', () => {
    expect(() => shapiroWilk([5, 5, 5, 5, 5])).toThrow()
  })
})
