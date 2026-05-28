/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SMA,
  EMA,
  RSI,
  MACD,
  ADX
} from 'technicalindicators';

export interface OhlcData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function calculateSMA(data: OhlcData[], period: number) {
  const values = data.map(d => d.close);
  const result = SMA.calculate({ period, values });
  return data.slice(period - 1).map((d, i) => ({
    time: d.time,
    value: result[i]
  }));
}

export function calculateEMA(data: OhlcData[], period: number) {
  const values = data.map(d => d.close);
  const result = EMA.calculate({ period, values });
  return data.slice(period - 1).map((d, i) => ({
    time: d.time,
    value: result[i]
  }));
}

export function calculateRSI(data: OhlcData[], period: number) {
  const values = data.map(d => d.close);
  const result = RSI.calculate({ period, values });
  return data.slice(period).map((d, i) => ({
    time: d.time,
    value: result[i]
  }));
}

export function calculateMACD(data: OhlcData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
  const values = data.map(d => d.close);
  const result = MACD.calculate({
    fastPeriod,
    slowPeriod,
    signalPeriod,
    values,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
  
  // result starts from slowPeriod - 1
  return data.slice(slowPeriod - 1).map((d, i) => ({
    time: d.time,
    ...result[i]
  }));
}

export function calculateADX(data: OhlcData[], period: number) {
  const result = ADX.calculate({
    high: data.map(d => d.high),
    low: data.map(d => d.low),
    close: data.map(d => d.close),
    period
  });
  
  return data.slice(period * 2 - 1).map((d, i) => ({
    time: d.time,
    ...result[i]
  }));
}

export interface FractalPoint {
  time: number;
  highFractal: number | null; // Resistance peak
  lowFractal: number | null;  // Support trough
}

/**
 * Calculates Bill Williams Fractals (Fractal Model Indicator)
 * @param data OHLC history
 * @param period standard is 2 (represents a 5-candle pattern: 2 preceding, 1 signal candle, 2 succeeding)
 */
export function calculateFractals(data: OhlcData[], period: number = 2): FractalPoint[] {
  const results: FractalPoint[] = [];
  
  for (let i = 0; i < data.length; i++) {
    // Edge cases or boundaries: we need at least 'period' candles on both sides of candle 'i'
    if (i < period || i >= data.length - period) {
      results.push({
        time: data[i].time,
        highFractal: null,
        lowFractal: null
      });
      continue;
    }
    
    const currentHigh = data[i].high;
    const currentLow = data[i].low;
    
    let isHighFractal = true;
    let isLowFractal = true;
    
    // Check preceding 'period' candles and succeeding 'period' candles
    for (let j = i - period; j <= i + period; j++) {
      if (j === i) continue;
      
      // Bearish/Up Fractal: high is greater than surrounding highs
      if (data[j].high > currentHigh) {
        isHighFractal = false;
      }
      // Bullish/Down Fractal: low is less than surrounding lows
      if (data[j].low < currentLow) {
        isLowFractal = false;
      }
    }
    
    results.push({
      time: data[i].time,
      highFractal: isHighFractal ? currentHigh : null,
      lowFractal: isLowFractal ? currentLow : null
    });
  }
  
  return results;
}

/**
 * Technical indicators mathematical implementations for all TradingView indicator listings
 */

export function calculateATR(data: OhlcData[], period: number = 14) {
  if (data.length === 0) return [];
  const results: { time: number; value: number }[] = [];
  let trSum = 0;
  
  // First True Ranges
  const trs: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trs.push(data[i].high - data[i].low);
    } else {
      const h_l = data[i].high - data[i].low;
      const h_pc = Math.abs(data[i].high - data[i - 1].close);
      const l_pc = Math.abs(data[i].low - data[i - 1].close);
      trs.push(Math.max(h_l, h_pc, l_pc));
    }
  }

  // Calculate Wilder's ATR
  let prevAtr = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, value: trs[i] });
    } else if (i === period - 1) {
      const sum = trs.slice(0, period).reduce((a, b) => a + b, 0);
      prevAtr = sum / period;
      results.push({ time: data[i].time, value: prevAtr });
    } else {
      prevAtr = (prevAtr * (period - 1) + trs[i]) / period;
      results.push({ time: data[i].time, value: prevAtr });
    }
  }
  return results;
}

export function calculateCCI(data: OhlcData[], period: number = 20) {
  if (data.length < period) return [];
  const results: { time: number; value: number }[] = [];
  
  const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, value: 0 });
      continue;
    }
    const chunk = typicalPrices.slice(i - period + 1, i + 1);
    const sma = chunk.reduce((sum, val) => sum + val, 0) / period;
    
    const meanDev = chunk.reduce((sum, val) => sum + Math.abs(val - sma), 0) / period;
    const cci = meanDev === 0 ? 0 : (typicalPrices[i] - sma) / (0.015 * meanDev);
    results.push({ time: data[i].time, value: cci });
  }
  return results;
}

export function calculateStochastic(data: OhlcData[], period: number = 14, smoothK: number = 3, dPeriod: number = 3) {
  if (data.length < period) return [];
  const results: { time: number; k: number; d: number }[] = [];
  const rawKs: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      rawKs.push(50);
      continue;
    }
    const chunk = data.slice(i - period + 1, i + 1);
    const lows = chunk.map(d => d.low);
    const highs = chunk.map(d => d.high);
    const minLow = Math.min(...lows);
    const maxHigh = Math.max(...highs);
    
    const rawK = maxHigh === minLow ? 50 : ((data[i].close - minLow) / (maxHigh - minLow)) * 100;
    rawKs.push(rawK);
  }

  // Smooth K
  const smoothedKs: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < smoothK - 1) {
      smoothedKs.push(rawKs[i]);
      continue;
    }
    const chunk = rawKs.slice(i - smoothK + 1, i + 1);
    const avgK = chunk.reduce((sum, val) => sum + val, 0) / smoothK;
    smoothedKs.push(avgK);
  }

  // Smooth D
  for (let i = 0; i < data.length; i++) {
    if (i < dPeriod - 1) {
      results.push({ time: data[i].time, k: smoothedKs[i], d: 50 });
      continue;
    }
    const chunk = smoothedKs.slice(i - dPeriod + 1, i + 1);
    const avgD = chunk.reduce((sum, val) => sum + val, 0) / dPeriod;
    results.push({ time: data[i].time, k: smoothedKs[i], d: avgD });
  }
  return results;
}

export function calculateStochasticRSI(data: OhlcData[], rsiPeriod: number = 14, stochPeriod: number = 14, kPeriod: number = 3, dPeriod: number = 3) {
  const rsiVals = calculateRSI(data, rsiPeriod);
  if (rsiVals.length < stochPeriod) return [];
  
  // Format rsiVals into a mapped list by time
  const rsiByTime = new Map(rsiVals.map(r => [r.time, r.value]));
  const results: { time: number; k: number; d: number }[] = [];
  
  const rawStochRsis: { time: number; value: number }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const t = data[i].time;
    if (i < rsiPeriod + stochPeriod) {
      rawStochRsis.push({ time: t, value: 50 });
      continue;
    }
    
    // Get historical RSIs for stochPeriod
    const subHistory = data.slice(i - stochPeriod + 1, i + 1);
    const rsis: number[] = [];
    subHistory.forEach(d => {
      const val = rsiByTime.get(d.time);
      if (val !== undefined) rsis.push(val);
    });
    
    if (rsis.length === 0) {
      rawStochRsis.push({ time: t, value: 50 });
      continue;
    }
    
    const minRsi = Math.min(...rsis);
    const maxRsi = Math.max(...rsis);
    const rawStochRsi = maxRsi === minRsi ? 50 : ((rsiByTime.get(t) || 50) - minRsi) / (maxRsi - minRsi) * 100;
    rawStochRsis.push({ time: t, value: rawStochRsi });
  }

  // Smooth K and D
  const ks: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < kPeriod - 1) {
      ks.push(rawStochRsis[i].value);
      continue;
    }
    const chunk = rawStochRsis.slice(i - kPeriod + 1, i + 1).map(x => x.value);
    ks.push(chunk.reduce((a, b) => a + b, 0) / kPeriod);
  }

  for (let i = 0; i < data.length; i++) {
    if (i < dPeriod - 1) {
      results.push({ time: data[i].time, k: ks[i], d: 50 });
      continue;
    }
    const chunk = ks.slice(i - dPeriod + 1, i + 1);
    results.push({
      time: data[i].time,
      k: ks[i],
      d: chunk.reduce((a, b) => a + b, 0) / dPeriod
    });
  }
  return results;
}

export function calculateOBV(data: OhlcData[]) {
  if (data.length === 0) return [];
  const results: { time: number; value: number }[] = [];
  let currentObv = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      results.push({ time: data[i].time, value: currentObv });
      continue;
    }
    const diff = data[i].close - data[i - 1].close;
    if (diff > 0) {
      currentObv += data[i].volume;
    } else if (diff < 0) {
      currentObv -= data[i].volume;
    }
    results.push({ time: data[i].time, value: currentObv });
  }
  return results;
}

export function calculateMFI(data: OhlcData[], period: number = 14) {
  if (data.length < period + 1) return [];
  const results: { time: number; value: number }[] = [];
  
  const typicalPrices = data.map(d => (d.high + d.low + d.close) / 3);
  const moneyFlows = typicalPrices.map((tp, i) => tp * data[i].volume);
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ time: data[i].time, value: 50 });
      continue;
    }
    let posFlow = 0;
    let negFlow = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      if (j === 0) continue;
      const prevPrice = typicalPrices[j - 1];
      const curPrice = typicalPrices[j];
      if (curPrice > prevPrice) {
        posFlow += moneyFlows[j];
      } else if (curPrice < prevPrice) {
        negFlow += moneyFlows[j];
      }
    }
    
    const mRatio = negFlow === 0 ? 100 : posFlow / negFlow;
    const mfi = 100 - (100 / (1 + mRatio));
    results.push({ time: data[i].time, value: mfi });
  }
  return results;
}

export function calculateROC(data: OhlcData[], period: number = 9) {
  const results: { time: number; value: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ time: data[i].time, value: 0 });
      continue;
    }
    const prevClose = data[i - period].close;
    const roc = prevClose === 0 ? 0 : ((data[i].close - prevClose) / prevClose) * 100;
    results.push({ time: data[i].time, value: roc });
  }
  return results;
}

export function calculateWilliamsR(data: OhlcData[], period: number = 14) {
  if (data.length < period) return [];
  const results: { time: number; value: number }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, value: -50 });
      continue;
    }
    const chunk = data.slice(i - period + 1, i + 1);
    const highs = chunk.map(d => d.high);
    const lows = chunk.map(d => d.low);
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    
    const wr = highestHigh === lowestLow ? -50 : ((highestHigh - data[i].close) / (highestHigh - lowestLow)) * -100;
    results.push({ time: data[i].time, value: wr });
  }
  return results;
}

export function calculateSuperTrend(data: OhlcData[], period: number = 10, multiplier: number = 3) {
  const atrs = calculateATR(data, period);
  const results: { time: number; value: number; direction: number }[] = [];
  if (data.length === 0) return [];
  
  let trend = 1; // 1 for long, -1 for short
  let prevUpperBand = 0;
  let prevLowerBand = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ time: data[i].time, value: data[i].close, direction: 1 });
      continue;
    }
    const atrObj = atrs.find(a => a.time === data[i].time);
    const atr = atrObj ? atrObj.value : 0;
    const src = (data[i].high + data[i].low) / 2;
    
    let basicUpper = src + multiplier * atr;
    let basicLower = src - multiplier * atr;
    
    let upperBand = (basicUpper < prevUpperBand || data[i - 1].close > prevUpperBand) ? basicUpper : prevUpperBand;
    let lowerBand = (basicLower > prevLowerBand || data[i - 1].close < prevLowerBand) ? basicLower : prevLowerBand;
    
    if (data[i].close > prevUpperBand) {
      trend = 1;
    } else if (data[i].close < prevLowerBand) {
      trend = -1;
    }
    
    prevUpperBand = upperBand;
    prevLowerBand = lowerBand;
    
    results.push({
      time: data[i].time,
      value: trend === 1 ? lowerBand : upperBand,
      direction: trend
    });
  }
  return results;
}

export function calculateVWAP(data: OhlcData[]) {
  const results: { time: number; value: number }[] = [];
  let cumTPVol = 0;
  let cumVol = 0;
  
  // Calculate day session cumulatives
  for (let i = 0; i < data.length; i++) {
    const tp = (data[i].high + data[i].low + data[i].close) / 3;
    cumTPVol += tp * data[i].volume;
    cumVol += data[i].volume;
    
    const vwap = cumVol === 0 ? data[i].close : cumTPVol / cumVol;
    results.push({ time: data[i].time, value: vwap });
  }
  return results;
}

export function calculateAwesomeOscillator(data: OhlcData[]) {
  const tp = data.map(d => (d.high + d.low) / 2);
  const results: { time: number; value: number }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < 34) {
      results.push({ time: data[i].time, value: 0 });
      continue;
    }
    const chunk5 = tp.slice(i - 4, i + 1);
    const chunk34 = tp.slice(i - 33, i + 1);
    
    const sma5 = chunk5.reduce((a, b) => a + b, 0) / 5;
    const sma34 = chunk34.reduce((a, b) => a + b, 0) / 34;
    
    results.push({ time: data[i].time, value: sma5 - sma34 });
  }
  return results;
}

export function calculateChaikinMoneyFlow(data: OhlcData[], period: number = 20) {
  if (data.length < period) return [];
  const results: { time: number; value: number }[] = [];
  
  const mfvs = data.map(d => {
    const range = d.high - d.low;
    const mfm = range === 0 ? 0 : (((d.close - d.low) - (d.high - d.close)) / range);
    return mfm * d.volume;
  });
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      results.push({ time: data[i].time, value: 0 });
      continue;
    }
    const chunkMFV = mfvs.slice(i - period + 1, i + 1);
    const chunkVol = data.slice(i - period + 1, i + 1).map(x => x.volume);
    
    const sumMFV = chunkMFV.reduce((a, b) => a + b, 0);
    const sumVol = chunkVol.reduce((a, b) => a + b, 0);
    
    const cmf = sumVol === 0 ? 0 : sumMFV / sumVol;
    results.push({ time: data[i].time, value: cmf });
  }
  return results;
}

export function calculateCMO(data: OhlcData[], period: number = 14) {
  if (data.length < period) return [];
  const results: { time: number; value: number }[] = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      results.push({ time: data[i].time, value: 0 });
      continue;
    }
    let sumGain = 0;
    let sumLoss = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const diff = data[j].close - data[j - 1].close;
      if (diff > 0) sumGain += diff;
      else if (diff < 0) sumLoss += Math.abs(diff);
    }
    
    const sumDiff = sumGain - sumLoss;
    const sumTotal = sumGain + sumLoss;
    const cmo = sumTotal === 0 ? 0 : (sumDiff / sumTotal) * 100;
    results.push({ time: data[i].time, value: cmo });
  }
  return results;
}

export function calculatePivotPoints(data: OhlcData[]) {
  // Classic Pivot Points calculated using the previous candle
  return data.map((d, i) => {
    if (i === 0) {
      return { time: d.time, pivot: d.close, s1: d.close, r1: d.close };
    }
    const prev = data[i - 1];
    const pp = (prev.high + prev.low + prev.close) / 3;
    const r1 = 2 * pp - prev.low;
    const s1 = 2 * pp - prev.high;
    return { time: d.time, pivot: pp, s1, r1 };
  });
}

