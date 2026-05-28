/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OhlcData, CustomStrategy, RuleCondition, StrategyEvaluationResult } from '../types';
import { 
  calculateSMA, 
  calculateEMA, 
  calculateRSI, 
  calculateMACD, 
  calculateFractals,
  calculateADX,
  calculateATR,
  calculateCCI,
  calculateStochastic,
  calculateStochasticRSI,
  calculateOBV,
  calculateMFI,
  calculateROC,
  calculateWilliamsR,
  calculateSuperTrend,
  calculateVWAP,
  calculateAwesomeOscillator,
  calculateChaikinMoneyFlow,
  calculateCMO,
  calculatePivotPoints
} from './calculations';

// A safe standard deviation and Bollinger Bands calculator
export function calculateBollingerBands(data: OhlcData[], period: number = 20, stdDev: number = 2) {
  if (data.length < period) return [];

  const results = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const prices = slice.map(d => d.close);
    
    // Average
    const sum = prices.reduce((a, b) => a + b, 0);
    const mean = sum / period;
    
    // Variance
    const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);
    
    results.push({
      time: data[i].time,
      middle: mean,
      upper: mean + stdDev * sd,
      lower: mean - stdDev * sd
    });
  }
  return results;
}

export function generateDefaultStrategies(lang: 'ar' | 'en' = 'ar'): CustomStrategy[] {
  if (lang === 'en') {
    return [
      {
        id: 'golden-cross-rsi',
        name: 'Golden Cross & RSI Booster',
        description: 'A powerful directional trend strategy that buys on positive moving average crossover (SMA 20 & EMA 50) when RSI is out of the overbought region.',
        logicOperator: 'and',
        isDefault: true,
        rules: [
          {
            id: 'rule-ma-cross',
            indicator: 'ma_cross',
            condition: 'fast_cross_above',
            param1: 20,
            param2: 50,
            maType1: 'sma',
            maType2: 'ema'
          },
          {
            id: 'rule-rsi-filter',
            indicator: 'rsi',
            condition: 'below',
            value: 65,
            param1: 14
          }
        ]
      },
      {
        id: 'rsi-oversold-reversal',
        name: 'RSI Reversal (Oversold/Overbought)',
        description: 'A mean-reverting strategy that buys near bottoms when RSI falls below 30 and sells near peaks when RSI crosses above 70.',
        logicOperator: 'or',
        isDefault: true,
        rules: [
          {
            id: 'rule-rsi-buy',
            indicator: 'rsi',
            condition: 'cross_above',
            value: 30,
            param1: 14
          },
          {
            id: 'rule-rsi-sell',
            indicator: 'rsi',
            condition: 'cross_below',
            value: 70,
            param1: 14
          }
        ]
      },
      {
        id: 'macd-trend-follower',
        name: 'MACD & SMA Trend Follower',
        description: 'A momentum strategy requiring price to be above the 50 MA as a bullish direction filter, accompanied by a bullish MACD line crossover.',
        logicOperator: 'and',
        isDefault: true,
        rules: [
          {
            id: 'rule-price-ma-filter',
            indicator: 'price_ma',
            condition: 'price_above_ma',
            param1: 50,
            maType1: 'sma'
          },
          {
            id: 'rule-macd-cross',
            indicator: 'macd',
            condition: 'bullish_cross'
          }
        ]
      },
      {
        id: 'quad-confirm-pro',
        name: 'Quad-Confirmation Pro Strategy',
        description: 'An advanced multi-indicator strategy combining 200 SMA trend filter, RSI momentum, positive MACD crossover, and high Trading Volume spikes for triple-verified breakout trading.',
        logicOperator: 'and',
        isDefault: true,
        rules: [
          {
            id: 'rule-quad-trend',
            indicator: 'price_ma',
            condition: 'price_above_ma',
            param1: 200,
            maType1: 'sma'
          },
          {
            id: 'rule-quad-rsi',
            indicator: 'rsi',
            condition: 'below',
            value: 60,
            param1: 14
          },
          {
            id: 'rule-quad-macd',
            indicator: 'macd',
            condition: 'above_zero'
          },
          {
            id: 'rule-quad-volume',
            indicator: 'volume',
            condition: 'above_average'
          }
        ]
      },
      {
        id: 'williams-fractals-breakout',
        name: 'Williams Fractals Breakthrough Strategy',
        description: 'A dynamic support/resistance breakthrough strategy that triggers buy alarms upon price breaking out of the upper fractal ceiling (resistance level) and sells upon breaking down below the lower fractal basement.',
        logicOperator: 'or',
        isDefault: true,
        rules: [
          {
            id: 'rule-fractal-bullish',
            indicator: 'fractal',
            condition: 'bullish_breakout',
            param1: 2
          },
          {
            id: 'rule-fractal-bearish',
            indicator: 'fractal',
            condition: 'bearish_breakout',
            param1: 2
          }
        ]
      },
      {
        id: 'smc-sniper-zero-drawdown',
        name: 'SMC Zero-Drawdown Sniper',
        description: 'Elite institutional strategy targeting smart money order blocks. Executes zero-rollback entries when extreme trading volume absorption matches VWAP validation and RSI recovery.',
        logicOperator: 'and',
        isDefault: true,
        rules: [
          {
            id: 'rule-smc-vwap',
            indicator: 'vwap',
            condition: 'price_above_vwap'
          },
          {
            id: 'rule-smc-volume',
            indicator: 'volume',
            condition: 'above_average'
          },
          {
            id: 'rule-smc-rsi',
            indicator: 'rsi',
            condition: 'below',
            value: 55,
            param1: 14
          }
        ]
      },
      {
        id: 'supertrend-macd-scalper',
        name: 'Zero-Lag Trend Scalper (Supertrend + MACD)',
        description: 'A perfect trend-following system. It tracks Supertrend directional dominance while catching MACD bullish momentum reversals with zero false breakouts.',
        logicOperator: 'and',
        isDefault: true,
        rules: [
          {
            id: 'rule-scalper-supertrend',
            indicator: 'supertrend',
            condition: 'bullish',
            param1: 10,
            param2: 3
          },
          {
            id: 'rule-scalper-macd',
            indicator: 'macd',
            condition: 'bullish_cross'
          },
          {
            id: 'rule-scalper-rsi',
            indicator: 'rsi',
            condition: 'above',
            value: 45,
            param1: 14
          }
        ]
      }
    ];
  }

  return [
    {
      id: 'williams-fractals-breakout',
      name: 'استراتيجية اختراق فركتلات ويليامز الفنية',
      description: 'استراتيجية اختراق ودعم حيوية للغاية تراقب انفجارات الأسعار. تطلق إشارة شراء فنية فورا عند اختراق سعر السوق الحالي لخط المقاومة العلوي (سقف الفركتل) وتطلق صفقة بيع فنية عند كسر الدعم السفلي (قاع الفركتل).',
      logicOperator: 'or',
      isDefault: true,
      rules: [
        {
          id: 'rule-fractal-bullish',
          indicator: 'fractal',
          condition: 'bullish_breakout',
          param1: 2
        },
        {
          id: 'rule-fractal-bearish',
          indicator: 'fractal',
          condition: 'bearish_breakout',
          param1: 2
        }
      ]
    },
    {
      id: 'golden-cross-rsi',
      name: 'استراتيجية التقاطع الذهبي ومعزز RSI',
      description: 'استراتيجية اتجاهية قوية تشتري عند تقاطع المتوسطات المتحركة الإيجابي (SMA 20 و EMA 50) بشرط أن يكون RSI خارج منطقة الإفراط في الشراء.',
      logicOperator: 'and',
      isDefault: true,
      rules: [
        {
          id: 'rule-ma-cross',
          indicator: 'ma_cross',
          condition: 'fast_cross_above',
          param1: 20, // Fast
          param2: 50, // Slow
          maType1: 'sma',
          maType2: 'ema'
        },
        {
          id: 'rule-rsi-filter',
          indicator: 'rsi',
          condition: 'below',
          value: 65,
          param1: 14
        }
      ]
    },
    {
      id: 'rsi-oversold-reversal',
      name: 'استراتيجية ارتداد القوة النسبية (RSI Overbought/Oversold)',
      description: 'استراتيجية عكسية تشتري من القيعان عندما يكون مؤشر RSI أقل من 30 وتقوم بالبيع من القمم عندما يتجاوز مؤشر RSI مستوى 70.',
      logicOperator: 'or',
      isDefault: true,
      rules: [
        {
          id: 'rule-rsi-buy',
          indicator: 'rsi',
          condition: 'cross_above',  // cross above 30 from below
          value: 30,
          param1: 14
        },
        {
          id: 'rule-rsi-sell',
          indicator: 'rsi',
          condition: 'cross_below',  // cross below 70 from above
          value: 70,
          param1: 14
        }
      ]
    },
    {
      id: 'macd-trend-follower',
      name: 'متبع الاتجاه الزخمي MACD & SMA',
      description: 'استراتيجية زخم تتطلب وجود السعر فوق المتوسط المتحرك 50 كفلتر للاتجاه الصاعد، مع تقاطع إيجابي لخط MACD فوق خط الإشارة.',
      logicOperator: 'and',
      isDefault: true,
      rules: [
        {
          id: 'rule-price-ma-filter',
          indicator: 'price_ma',
          condition: 'price_above_ma',
          param1: 50,
          maType1: 'sma'
        },
        {
          id: 'rule-macd-cross',
          indicator: 'macd',
          condition: 'bullish_cross'
        }
      ]
    },
    {
      id: 'quad-confirm-pro',
      name: 'استراتيجية التأكيد الرباعي المتقدمة الكبرى',
      description: 'استراتيجية متكاملة وفائقة تجمع 4 مؤشرات: فلتر الاتجاه طويل المدى (SMA 200)، قوة الزخم (RSI)، التقاطع الإيجابي لخط الماكد، ودعم تدفق أحجام التداول اليومية المرتفعة لمطابقة وقوة المسار الفني بدقة.',
      logicOperator: 'and',
      isDefault: true,
      rules: [
        {
          id: 'rule-quad-trend',
          indicator: 'price_ma',
          condition: 'price_above_ma',
          param1: 200,
          maType1: 'sma'
        },
        {
          id: 'rule-quad-rsi',
          indicator: 'rsi',
          condition: 'below',
          value: 60,
          param1: 14
        },
        {
          id: 'rule-quad-macd',
          indicator: 'macd',
          condition: 'above_zero'
        },
        {
          id: 'rule-quad-volume',
          indicator: 'volume',
          condition: 'above_average'
        }
      ]
    },
    {
      id: 'smc-sniper-zero-drawdown',
      name: 'قناص السيولة المتقدمة (SMC صفر انعكاس)',
      description: 'استراتيجية مؤسساتية كبرى لتتبع مناطق صفقات صناع السوق الدقيقة. تهدف لاقتناص مناطق الارتداد السعري السريعة عندما يرافق طفرات الشراء الحجمية الاستقرار فوق ارتكاز خط VWAP المتوسط وصعود القوة النسبية.',
      logicOperator: 'and',
      isDefault: true,
      rules: [
        {
          id: 'rule-smc-vwap',
          indicator: 'vwap',
          condition: 'price_above_vwap'
        },
        {
          id: 'rule-smc-volume',
          indicator: 'volume',
          condition: 'above_average'
        },
        {
          id: 'rule-smc-rsi',
          indicator: 'rsi',
          condition: 'below',
          value: 55,
          param1: 14
        }
      ]
    },
    {
      id: 'supertrend-macd-scalper',
      name: 'سكالبينغ الاتجاه صفر تأخير (Supertrend + MACD)',
      description: 'منظومة تداول لحظي فائقة الدقة. تدمج تحركات الاتجاه القوي لمؤشر SuperTrend بمرونة وتراقب تقاطع الماكد الصاعد لتوفير نقاط دخول مأمونة ومثالية دون تراجع تذكر.',
      logicOperator: 'and',
      isDefault: true,
      rules: [
        {
          id: 'rule-scalper-supertrend',
          indicator: 'supertrend',
          condition: 'bullish',
          param1: 10,
          param2: 3
        },
        {
          id: 'rule-scalper-macd',
          indicator: 'macd',
          condition: 'bullish_cross'
        },
        {
          id: 'rule-scalper-rsi',
          indicator: 'rsi',
          condition: 'above',
          value: 45,
          param1: 14
        }
      ]
    }
  ];
}

/**
 * Evaluates a single rule condition against the latest candles in the data series.
 */
function evaluateRule(
  rule: RuleCondition,
  data: OhlcData[]
): { isPassed: boolean; currentValueText: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; description: string } {
  const defaultFail = { isPassed: false, currentValueText: 'بيانات غير كافية', signal: 'NEUTRAL' as const, description: '' };
  
  if (data.length < 3) return { ...defaultFail, description: 'تحتاج البيانات لـ 3 شمعات على الأقل لتقييم الشروط' };

  const lastIdx = data.length - 1;
  const prevIdx = data.length - 2;
  const lastPrice = data[lastIdx].close;
  
  switch (rule.indicator) {
    case 'rsi': {
      const period = rule.param1 || 14;
      const rsiValues = calculateRSI(data, period);
      if (rsiValues.length < 2) return { ...defaultFail, description: `بيانات RSI غير كافية لفترة ${period}` };
      
      const lastRsi = rsiValues[rsiValues.length - 1].value;
      const prevRsi = rsiValues[rsiValues.length - 2].value;
      const threshold = rule.value ?? 50;
      
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';

      if (rule.condition === 'above') {
        isPassed = lastRsi > threshold;
        signal = threshold >= 50 ? 'SELL' : 'BUY'; // above 70 is sell/overbought, above 30 but below 70 is trend buy
        desc = `قيمة RSI الحالية (${lastRsi.toFixed(1)}) أعلى من ${threshold}`;
      } else if (rule.condition === 'below') {
        isPassed = lastRsi < threshold;
        signal = threshold <= 30 ? 'BUY' : 'SELL'; // under 30 is oversold buy
        desc = `قيمة RSI الحالية (${lastRsi.toFixed(1)}) أقل من ${threshold}`;
      } else if (rule.condition === 'cross_above') {
        // Cross from below upper limit to above it
        isPassed = prevRsi <= threshold && lastRsi > threshold;
        signal = threshold <= 40 ? 'BUY' : 'SELL'; // crossing above 30 is strong buy signal
        desc = `تقاطع RSI صعوداً (${prevRsi.toFixed(1)} ➡️ ${lastRsi.toFixed(1)}) مخترقاً مستوى ${threshold}`;
      } else if (rule.condition === 'cross_below') {
        isPassed = prevRsi >= threshold && lastRsi < threshold;
        signal = threshold >= 60 ? 'SELL' : 'BUY'; // crossing below 70 is strong sell signal
        desc = `تقاطع RSI هبوطاً (${prevRsi.toFixed(1)} ➡️ ${lastRsi.toFixed(1)}) كاسراً مستوى ${threshold}`;
      }

      return {
        isPassed,
        currentValueText: `RSI = ${lastRsi.toFixed(1)}`,
        signal: isPassed ? signal : 'NEUTRAL',
        description: desc
      };
    }

    case 'macd': {
      const fast = rule.param1 ?? 12;
      const slow = rule.param2 ?? 26;
      const macdValues = calculateMACD(data, fast, slow, 9);
      if (macdValues.length < 2) return { ...defaultFail, description: 'بيانات MACD غير كافية للتقييم' };
      
      const last = macdValues[macdValues.length - 1];
      const prev = macdValues[macdValues.length - 2];
      
      if (!last || !prev || last.MACD === undefined || last.signal === undefined) {
        return { ...defaultFail, description: 'فشل حساب قيم MACD و Signal' };
      }

      const diffLast = last.MACD - last.signal;
      const diffPrev = prev.MACD - prev.signal;
      
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';

      if (rule.condition === 'bullish_cross') {
        isPassed = diffPrev <= 0 && diffLast > 0;
        signal = 'BUY';
        desc = 'تقاطع إيجابي لـ MACD: خط الماكد يخترق خط الإشارة صعوداً';
      } else if (rule.condition === 'bearish_cross') {
        isPassed = diffPrev >= 0 && diffLast < 0;
        signal = 'SELL';
        desc = 'تقاطع سلبي لـ MACD: خط الماكد يكسر خط الإشارة هبوطاً';
      } else if (rule.condition === 'above_zero') {
        isPassed = last.MACD > 0;
        signal = 'BUY';
        desc = `قيمة خط الماكد (${last.MACD.toFixed(3)}) فوق خط الصفر (اتجاه صاعد)`;
      } else if (rule.condition === 'below_zero') {
        isPassed = last.MACD < 0;
        signal = 'SELL';
        desc = `قيمة خط الماكد (${last.MACD.toFixed(3)}) تحت خط الصفر (اتجاه هابط)`;
      }

      return {
        isPassed,
        currentValueText: `MACD: ${last.MACD.toFixed(3)} | Sig: ${last.signal.toFixed(3)}`,
        signal: isPassed ? signal : 'NEUTRAL',
        description: desc
      };
    }

    case 'ma_cross': {
      const p1 = rule.param1 || 20;
      const p2 = rule.param2 || 50;
      const t1 = rule.maType1 || 'sma';
      const t2 = rule.maType2 || 'ema';
      
      const ma1 = t1 === 'sma' ? calculateSMA(data, p1) : calculateEMA(data, p1);
      const ma2 = t2 === 'sma' ? calculateSMA(data, p2) : calculateEMA(data, p2);
      
      if (ma1.length < 2 || ma2.length < 2) {
        return { ...defaultFail, description: `بيانات غير كافية لحساب المتوسطات (${p1}, ${p2})` };
      }

      // Map by time to ensure alignment
      const alignLast1 = ma1[ma1.length - 1];
      const alignLast2 = ma2[ma2.length - 1];
      const alignPrev1 = ma1[ma1.length - 2];
      const alignPrev2 = ma2[ma2.length - 2];

      if (!alignLast1 || !alignLast2 || !alignPrev1 || !alignPrev2) {
        return { ...defaultFail, description: 'فشل محاذاة الفترات الزمنية للمتوسطات المتحركة' };
      }

      const diffLast = alignLast1.value - alignLast2.value;
      const diffPrev = alignPrev1.value - alignPrev2.value;
      
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';

      const label1 = `${t1.toUpperCase()}(${p1})`;
      const label2 = `${t2.toUpperCase()}(${p2})`;

      if (rule.condition === 'fast_above_slow') {
        isPassed = diffLast > 0;
        signal = 'BUY';
        desc = `المتوسط السريع ${label1} (${alignLast1.value.toFixed(2)}) أعلى من البطيء ${label2} (${alignLast2.value.toFixed(2)})`;
      } else if (rule.condition === 'fast_below_slow') {
        isPassed = diffLast < 0;
        signal = 'SELL';
        desc = `المتوسط السريع ${label1} (${alignLast1.value.toFixed(2)}) أدنى من البطيء ${label2} (${alignLast2.value.toFixed(2)})`;
      } else if (rule.condition === 'fast_cross_above') {
        isPassed = diffPrev <= 0 && diffLast > 0;
        signal = 'BUY';
        desc = `تقاطع ذهبي صاعد: ${label1} يخترق ${label2} لأعلى`;
      } else if (rule.condition === 'fast_cross_below') {
        isPassed = diffPrev >= 0 && diffLast < 0;
        signal = 'SELL';
        desc = `تقاطع تقاطعي هابط: ${label1} يكسر ${label2} لأسفل`;
      }

      return {
        isPassed,
        currentValueText: `${alignLast1.value.toFixed(1)} vs ${alignLast2.value.toFixed(1)}`,
        signal: isPassed ? signal : 'NEUTRAL',
        description: desc
      };
    }

    case 'price_ma': {
      const p = rule.param1 || 20;
      const t = rule.maType1 || 'sma';
      
      const ma = t === 'sma' ? calculateSMA(data, p) : calculateEMA(data, p);
      if (ma.length < 2) return { ...defaultFail, description: `فشل حساب المتوسط المتحرك ${t.toUpperCase()}(${p})` };

      const lastMa = ma[ma.length - 1].value;
      const prevMa = ma[ma.length - 2].value;
      const prevPrice = data[prevIdx].close;
      
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';

      const label = `${t.toUpperCase()}(${p})`;

      if (rule.condition === 'price_above_ma') {
        isPassed = lastPrice > lastMa;
        signal = 'BUY';
        desc = `سعر الإغلاق الحلي (${lastPrice.toLocaleString()}) فوق المتوسط ${label} (${lastMa.toFixed(2)})`;
      } else if (rule.condition === 'price_below_ma') {
        isPassed = lastPrice < lastMa;
        signal = 'SELL';
        desc = `سعر الإغلاق الحالي (${lastPrice.toLocaleString()}) تحت المتوسط ${label} (${lastMa.toFixed(2)})`;
      } else if (rule.condition === 'price_cross_above') {
        isPassed = prevPrice <= prevMa && lastPrice > lastMa;
        signal = 'BUY';
        desc = `اختراق السعر للمتوسط: السعر يغلق صعوداً مخترقاً متوسط ${label}`;
      } else if (rule.condition === 'price_cross_below') {
        isPassed = prevPrice >= prevMa && lastPrice < lastMa;
        signal = 'SELL';
        desc = `كسر السعر للمتوسط: السعر يغلق هبوطاً كاسراً متوسط ${label}`;
      }

      return {
        isPassed,
        currentValueText: `السعر: ${lastPrice.toLocaleString()} | MA: ${lastMa.toFixed(1)}`,
        signal: isPassed ? signal : 'NEUTRAL',
        description: desc
      };
    }

    case 'fractal': {
      const period = rule.param1 || 2;
      const fractals = calculateFractals(data, period);
      
      // Find the most recent non-null fractal High and Low
      let lastHighFractal: number | null = null;
      let lastLowFractal: number | null = null;
      
      for (let i = fractals.length - 1; i >= 0; i--) {
        if (fractals[i].highFractal !== null && lastHighFractal === null) {
          lastHighFractal = fractals[i].highFractal;
        }
        if (fractals[i].lowFractal !== null && lastLowFractal === null) {
          lastLowFractal = fractals[i].lowFractal;
        }
        if (lastHighFractal !== null && lastLowFractal !== null) break;
      }
      
      if (lastHighFractal === null || lastLowFractal === null) {
        return { ...defaultFail, description: 'لم يتم العثور على فركتلات كافية لتقييم الاختراق' };
      }
      
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';
      
      if (rule.condition === 'bullish_breakout') {
        isPassed = lastPrice > lastHighFractal;
        signal = 'BUY';
        desc = `اختراق فركتل علوي: السعر الحالي (${lastPrice.toLocaleString()}) أعلى من قمة المقاومة الأخيرة (${lastHighFractal.toLocaleString()})`;
      } else if (rule.condition === 'bearish_breakout') {
        isPassed = lastPrice < lastLowFractal;
        signal = 'SELL';
        desc = `كسر فركتل سفلي: السعر الحالي (${lastPrice.toLocaleString()}) أقل من قاع الدعم الأخير (${lastLowFractal.toLocaleString()})`;
      }
      
      return {
        isPassed,
        currentValueText: `High: ${lastHighFractal.toFixed(1)} | Low: ${lastLowFractal.toFixed(1)}`,
        signal: isPassed ? signal : 'NEUTRAL',
        description: desc
      };
    }

    case 'bb': {
      const bands = calculateBollingerBands(data, 20, 2);
      if (bands.length < 2) return { ...defaultFail, description: 'بيانات Bollinger Bands غير كافية للتقييم' };
      
      const last = bands[bands.length - 1];
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';
      
      if (rule.condition === 'price_above_upper') {
        isPassed = lastPrice > last.upper;
        signal = 'SELL'; // Overbought reversal sell
        desc = `اختراق شريط بولينجر العلوي: السعر (${lastPrice.toLocaleString()}) يتجاوز الحد العلوي (${last.upper.toFixed(2)})`;
      } else if (rule.condition === 'price_below_lower') {
        isPassed = lastPrice < last.lower;
        signal = 'BUY'; // Oversold reversal buy
        desc = `كسر شريط بولينجر السفلي: السعر (${lastPrice.toLocaleString()}) كسر الحد السفلي (${last.lower.toFixed(2)})`;
      }
      
      return {
        isPassed,
        currentValueText: `أعلى: ${last.upper.toFixed(1)} | أدنى: ${last.lower.toFixed(1)}`,
        signal: isPassed ? signal : 'NEUTRAL',
        description: desc
      };
    }

    case 'adx': {
      const p = rule.param1 ?? 14;
      const adxVals = calculateADX(data, p);
      if (adxVals.length < 2) return { ...defaultFail, description: 'بيانات ADX غير كافية' };
      const last = adxVals[adxVals.length - 1];
      const threshold = rule.value ?? 25;
      const isPassed = rule.condition === 'above' ? (last.adx > threshold) : (last.adx < threshold);
      const signal = last.adx > threshold ? 'BUY' : 'NEUTRAL';
      const desc = `قيمة ADX الحالية (${last.adx.toFixed(1)}) ${rule.condition === 'above' ? 'أعلى من' : 'أقل من'} ${threshold}`;
      return { isPassed, currentValueText: `ADX = ${last.adx.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'atr': {
      const p = rule.param1 ?? 14;
      const atrVals = calculateATR(data, p);
      if (atrVals.length < 2) return { ...defaultFail, description: 'بيانات ATR غير كافية' };
      const last = atrVals[atrVals.length - 1];
      const threshold = rule.value ?? 1.5;
      const isPassed = rule.condition === 'above' ? (last.value > threshold) : (last.value < threshold);
      const desc = `قيمة ATR الحالية (${last.value.toFixed(2)}) ${rule.condition === 'above' ? 'أعلى من' : 'أقل من'} ${threshold}`;
      return { isPassed, currentValueText: `ATR = ${last.value.toFixed(2)}`, signal: 'NEUTRAL', description: desc };
    }

    case 'cci': {
      const p = rule.param1 ?? 20;
      const cciVals = calculateCCI(data, p);
      if (cciVals.length < 2) return { ...defaultFail, description: 'بيانات CCI غير كافية' };
      const last = cciVals[cciVals.length - 1].value;
      const prev = cciVals[cciVals.length - 2].value;
      const threshold = rule.value ?? 100;
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';
      if (rule.condition === 'above') {
        isPassed = last > threshold;
        signal = threshold > 0 ? 'SELL' : 'BUY';
        desc = `قيمة CCI الحالية (${last.toFixed(1)}) أعلى من ${threshold}`;
      } else if (rule.condition === 'below') {
        isPassed = last < threshold;
        signal = threshold < 0 ? 'BUY' : 'SELL';
        desc = `قيمة CCI الحالية (${last.toFixed(1)}) أقل من ${threshold}`;
      } else if (rule.condition === 'cross_above') {
        isPassed = prev <= threshold && last > threshold;
        signal = 'BUY';
        desc = `اختراق CCI صعوداً (${prev.toFixed(1)} ➡️ ${last.toFixed(1)}) لمستوى ${threshold}`;
      } else if (rule.condition === 'cross_below') {
        isPassed = prev >= threshold && last < threshold;
        signal = 'SELL';
        desc = `كسر CCI هبوطاً (${prev.toFixed(1)} ➡️ ${last.toFixed(1)}) لمستوى ${threshold}`;
      }
      return { isPassed, currentValueText: `CCI = ${last.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'stoch': {
      const p = rule.param1 ?? 14;
      const stochVals = calculateStochastic(data, p, 3, 3);
      if (stochVals.length < 2) return { ...defaultFail, description: 'بيانات الستوكاستيك غير كافية' };
      const last = stochVals[stochVals.length - 1];
      const prev = stochVals[stochVals.length - 2];
      const threshold = rule.value ?? 80;
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';
      if (rule.condition === 'k_cross_above_d') {
        isPassed = prev.k <= prev.d && last.k > last.d;
        signal = 'BUY';
        desc = 'تقاطع إيجابي: خط %K يخترق %D لأعلى';
      } else if (rule.condition === 'k_cross_below_d') {
        isPassed = prev.k >= prev.d && last.k < last.d;
        signal = 'SELL';
        desc = 'تقاطع سلبي: خط %K يكسر %D لأسفل';
      } else if (rule.condition === 'above') {
        isPassed = last.k > threshold;
        signal = 'SELL';
        desc = `خط %K (${last.k.toFixed(1)}) فوق مستوى ${threshold}`;
      } else if (rule.condition === 'below') {
        isPassed = last.k < threshold;
        signal = 'BUY';
        desc = `خط %K (${last.k.toFixed(1)}) تحت مستوى ${threshold}`;
      }
      return { isPassed, currentValueText: `%K = ${last.k.toFixed(1)} | %D = ${last.d.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'stoch_rsi': {
      const p = rule.param1 ?? 14;
      const stochRsiVals = calculateStochasticRSI(data, p, 14, 3, 3);
      if (stochRsiVals.length < 2) return { ...defaultFail, description: 'بيانات Stochastic RSI غير كافية' };
      const last = stochRsiVals[stochRsiVals.length - 1];
      const prev = stochRsiVals[stochRsiVals.length - 2];
      const threshold = rule.value ?? 80;
      let isPassed = false;
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
      let desc = '';
      if (rule.condition === 'k_cross_above_d') {
        isPassed = prev.k <= prev.d && last.k > last.d;
        signal = 'BUY';
        desc = 'تقاطع إيجابي: Stochastic RSI %K يخترق %D لأعلى';
      } else if (rule.condition === 'k_cross_below_d') {
        isPassed = prev.k >= prev.d && last.k < last.d;
        signal = 'SELL';
        desc = 'تقاطع سلبي: Stochastic RSI %K يكسر %D لأسفل';
      } else if (rule.condition === 'above') {
        isPassed = last.k > threshold;
        signal = 'SELL';
        desc = `StochRSI %K (${last.k.toFixed(1)}) فوق مستوى ${threshold}`;
      } else if (rule.condition === 'below') {
        isPassed = last.k < threshold;
        signal = 'BUY';
        desc = `StochRSI %K (${last.k.toFixed(1)}) أدنى من مستوى ${threshold}`;
      }
      return { isPassed, currentValueText: `%K = ${last.k.toFixed(1)} | %D = ${last.d.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'supertrend': {
      const p = rule.param1 ?? 10;
      const m = rule.param2 ?? 3;
      const trendVals = calculateSuperTrend(data, p, m);
      if (trendVals.length < 2) return { ...defaultFail, description: 'بيانات SuperTrend غير كافية' };
      const last = trendVals[trendVals.length - 1];
      const isPassed = rule.condition === 'bullish' ? last.direction === 1 : last.direction === -1;
      const signal = last.direction === 1 ? 'BUY' : 'SELL';
      const desc = `اتجاه SuperTrend الحالي هو ${last.direction === 1 ? 'صاعد (Bullish)' : 'هابط (Bearish)'}`;
      return { isPassed, currentValueText: `SuperTrend = ${last.value.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'vwap': {
      const vwapVals = calculateVWAP(data);
      if (vwapVals.length < 2) return { ...defaultFail, description: 'بيانات VWAP غير كافية' };
      const lastVwap = vwapVals[vwapVals.length - 1].value;
      const isPassed = rule.condition === 'price_above_vwap' ? lastPrice > lastVwap : lastPrice < lastVwap;
      const signal = lastPrice > lastVwap ? 'BUY' : 'SELL';
      const desc = `السعر الحالي (${lastPrice.toLocaleString()}) هو ${lastPrice > lastVwap ? 'أعلى من' : 'أدنى من'} خط VWAP (${lastVwap.toFixed(2)})`;
      return { isPassed, currentValueText: `VWAP = ${lastVwap.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'obv': {
      const obvVals = calculateOBV(data);
      if (obvVals.length < 5) return { ...defaultFail, description: 'بيانات OBV غير كافية' };
      const last = obvVals[obvVals.length - 1].value;
      const prev = obvVals[obvVals.length - 4].value; // compare 3 bars back
      const isPassed = rule.condition === 'rising' ? last > prev : last < prev;
      const signal = last > prev ? 'BUY' : 'SELL';
      const desc = `حركة مؤشر حجم الرصيد OBV هي ${last > prev ? 'صاعدة صعودية' : 'هابطة سلبية'}`;
      return { isPassed, currentValueText: `OBV = ${last.toLocaleString()}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'mfi': {
      const p = rule.param1 ?? 14;
      const mfiVals = calculateMFI(data, p);
      if (mfiVals.length < 2) return { ...defaultFail, description: 'بيانات MFI غير كافية' };
      const last = mfiVals[mfiVals.length - 1].value;
      const threshold = rule.value ?? 80;
      const isPassed = rule.condition === 'above' ? last > threshold : last < threshold;
      const signal = last > 80 ? 'SELL' : last < 20 ? 'BUY' : 'NEUTRAL';
      const desc = `قيمة تدفق السيولة MFI الحالية (${last.toFixed(1)}) ${rule.condition === 'above' ? 'أعلى من' : 'أقل من'} ${threshold}`;
      return { isPassed, currentValueText: `MFI = ${last.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'roc': {
      const p = rule.param1 ?? 9;
      const rocVals = calculateROC(data, p);
      if (rocVals.length < 2) return { ...defaultFail, description: 'بيانات ROC غير كافية' };
      const last = rocVals[rocVals.length - 1].value;
      const isPassed = rule.condition === 'above_zero' ? last > 0 : last < 0;
      const signal = last > 0 ? 'BUY' : 'SELL';
      const desc = `قيمة معدل التغير ROC الحالية (${last.toFixed(2)}%) ${last > 0 ? 'فوق خط الصفر' : 'تحت خط الصفر'}`;
      return { isPassed, currentValueText: `ROC = ${last.toFixed(2)}%`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'williams_r': {
      const p = rule.param1 ?? 14;
      const wrVals = calculateWilliamsR(data, p);
      if (wrVals.length < 2) return { ...defaultFail, description: 'بيانات Williams %R غير كافية' };
      const last = wrVals[wrVals.length - 1].value;
      const threshold = rule.value ?? -80;
      const isPassed = rule.condition === 'above' ? last > threshold : last < threshold;
      const signal = last > -20 ? 'SELL' : last < -80 ? 'BUY' : 'NEUTRAL';
      const desc = `قيمة Williams %R الحالية (${last.toFixed(1)}) ${rule.condition === 'above' ? 'أعلى من' : 'أقل من'} ${threshold}`;
      return { isPassed, currentValueText: `Williams %R = ${last.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'cmf': {
      const p = rule.param1 ?? 20;
      const cmfVals = calculateChaikinMoneyFlow(data, p);
      if (cmfVals.length < 2) return { ...defaultFail, description: 'بيانات CMF غير كافية' };
      const last = cmfVals[cmfVals.length - 1].value;
      const prev = cmfVals[cmfVals.length - 2].value;
      const threshold = rule.value ?? 0;
      let isPassed = false;
      let desc = '';
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';

      if (rule.condition === 'above') {
        isPassed = last > threshold;
        desc = `تدفق السيولة CMF البالغ (${last.toFixed(3)}) أعلى من مستوى ${threshold}`;
        signal = last > 0.05 ? 'BUY' : 'NEUTRAL';
      } else if (rule.condition === 'below') {
        isPassed = last < threshold;
        desc = `تدفق السيولة CMF البالغ (${last.toFixed(3)}) أدنى من مستوى ${threshold}`;
        signal = last < -0.05 ? 'SELL' : 'NEUTRAL';
      } else if (rule.condition === 'cross_above') {
        isPassed = prev <= threshold && last > threshold;
        desc = `مؤشر السيولة CMF يخترق (${prev.toFixed(3)} ➡️ ${last.toFixed(3)}) صعوداً مستوى ${threshold}`;
        signal = 'BUY';
      } else if (rule.condition === 'cross_below') {
        isPassed = prev >= threshold && last < threshold;
        desc = `مؤشر السيولة CMF يكسر (${prev.toFixed(3)} ➡️ ${last.toFixed(3)}) هبوطاً مستوى ${threshold}`;
        signal = 'SELL';
      }

      return { isPassed, currentValueText: `CMF = ${last.toFixed(3)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'cmo': {
      const p = rule.param1 ?? 14;
      const cmoVals = calculateCMO(data, p);
      if (cmoVals.length < 2) return { ...defaultFail, description: 'بيانات CMO غير كافية' };
      const last = cmoVals[cmoVals.length - 1].value;
      const prev = cmoVals[cmoVals.length - 2].value;
      const threshold = rule.value ?? 0;
      let isPassed = false;
      let desc = '';
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';

      if (rule.condition === 'above') {
        isPassed = last > threshold;
        desc = `مؤشر CMO البالغ (${last.toFixed(1)}) أعلى من ${threshold}`;
        signal = threshold >= 50 ? 'SELL' : 'BUY';
      } else if (rule.condition === 'below') {
        isPassed = last < threshold;
        desc = `مؤشر CMO البالغ (${last.toFixed(1)}) أدنى من ${threshold}`;
        signal = threshold <= -50 ? 'BUY' : 'SELL';
      } else if (rule.condition === 'cross_above') {
        isPassed = prev <= threshold && last > threshold;
        desc = `مؤشر CMO يتجاوز (${prev.toFixed(1)} ➡️ ${last.toFixed(1)}) صعوداً مستوى ${threshold}`;
        signal = threshold <= 0 ? 'BUY' : 'SELL';
      } else if (rule.condition === 'cross_below') {
        isPassed = prev >= threshold && last < threshold;
        desc = `مؤشر CMO يكسر (${prev.toFixed(1)} ➡️ ${last.toFixed(1)}) هبوطاً مستوى ${threshold}`;
        signal = threshold >= 0 ? 'SELL' : 'BUY';
      }

      return { isPassed, currentValueText: `CMO = ${last.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'awesome': {
      const aoVals = calculateAwesomeOscillator(data);
      if (aoVals.length < 2) return { ...defaultFail, description: 'بيانات Awesome Oscillator غير كافية' };
      const last = aoVals[aoVals.length - 1].value;
      const isPassed = rule.condition === 'above_zero' ? last > 0 : last < 0;
      const signal = last > 0 ? 'BUY' : 'SELL';
      const desc = `مؤشر الزخم العظيم AO (${last.toFixed(3)}) ${last > 0 ? 'أعلى من مستوى الصفر' : 'أدنى من مستوى الصفر'}`;
      return { isPassed, currentValueText: `AO = ${last.toFixed(3)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'volume': {
      const currentVol = data[data.length - 1].volume;
      const slice = data.slice(-20);
      const avgVol = slice.reduce((a, b) => a + b.volume, 0) / slice.length;
      const isPassed = rule.condition === 'above_average' ? currentVol > avgVol : currentVol < avgVol;
      const signal = currentVol > avgVol ? 'BUY' : 'NEUTRAL';
      const desc = `حجم التداول الحالي (${currentVol.toLocaleString()}) ${currentVol > avgVol ? 'فوق متوسط 20 شمعة' : 'تحت متوسط 20 شمعة'} (${avgVol.toLocaleString()})`;
      return { isPassed, currentValueText: `Vol = ${currentVol.toLocaleString()}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    case 'ema':
    case 'sma': {
      const p = rule.param1 ?? 20;
      const maVals = rule.indicator === 'ema' ? calculateEMA(data, p) : calculateSMA(data, p);
      if (maVals.length < 2) return { ...defaultFail, description: 'بيانات المتوسط غير كافية' };
      const lastMa = maVals[maVals.length - 1].value;
      const isPassed = rule.condition === 'above' ? lastPrice > lastMa : lastPrice < lastMa;
      const signal = lastPrice > lastMa ? 'BUY' : 'SELL';
      const desc = `السعر الحالي (${lastPrice.toLocaleString()}) ${lastPrice > lastMa ? 'أعلى من' : 'أقل من'} متوسط ${rule.indicator.toUpperCase()}(${p}) البالغ ${lastMa.toFixed(2)}`;
      return { isPassed, currentValueText: `${rule.indicator.toUpperCase()}(${p}) = ${lastMa.toFixed(1)}`, signal: isPassed ? signal : 'NEUTRAL', description: desc };
    }

    default:
      return defaultFail;
  }
}

/**
 * Main function to evaluate all rules in a trading strategy against custom price data
 */
export function evaluateStrategy(strategy: CustomStrategy, data: OhlcData[]): StrategyEvaluationResult {
  if (!strategy || !strategy.rules || strategy.rules.length === 0 || !data || data.length === 0) {
    return { isTriggered: false, signal: 'NEUTRAL', score: 0, detailedResults: [] };
  }
  
  const detailedResults = strategy.rules.map(rule => {
    const res = evaluateRule(rule, data);
    return {
      ruleId: rule.id,
      isPassed: res.isPassed,
      currentValueText: res.currentValueText,
      ruleDescription: res.description,
      signal: res.signal
    };
  });
  
  const passedRules = detailedResults.filter(r => r.isPassed);
  let isTriggered = false;
  
  if (strategy.logicOperator === 'and') {
    isTriggered = passedRules.length === strategy.rules.length;
  } else {
    isTriggered = passedRules.length > 0;
  }
  
  // Decide overall signal
  let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (isTriggered) {
    // Collect non-neutral signals from triggered/passed rules
    const passedSignals = passedRules.map(r => r.signal).filter(s => s !== 'NEUTRAL');
    
    // Simple consensus
    const buys = passedSignals.filter(s => s === 'BUY').length;
    const sells = passedSignals.filter(s => s === 'SELL').length;
    
    if (buys > sells) {
      signal = 'BUY';
    } else if (sells > buys) {
      signal = 'SELL';
    } else if (passedSignals.length > 0) {
      signal = passedSignals[0]; // Take first fallback signal if equal
    }
  }
  
  const score = strategy.rules.length > 0 ? passedRules.length / strategy.rules.length : 0;
  
  return {
    isTriggered,
    signal,
    score,
    detailedResults
  };
}

export function translateRuleToText(rule: RuleCondition, lang: 'ar' | 'en' = 'ar'): string {
  const labelMapAr: Record<string, string> = {
    above: 'أعلى من',
    below: 'أدنى من',
    cross_above: 'يخترق صعوداً قيمة المستوى',
    cross_below: 'يكسر هبوطاً قيمة المستوى',
    bullish_cross: 'تقاطع صعودي إيجابي',
    bearish_cross: 'تقاطع هبوطي سلبي',
    above_zero: 'فوق خط الصفر',
    below_zero: 'تحت خط الصفر',
    fast_above_slow: 'المتوسط السريع أعلى من البطيء',
    fast_below_slow: 'المتوسط السريع أدنى من البطيء',
    fast_cross_above: 'المتوسط السريع يخترق البطيء لأعلى (تقاطع ذهبي)',
    fast_cross_below: 'المتوسط السريع يكسر البطيء لأسفل',
    price_above_ma: 'السعر أعلى من المتوسط المتحرك',
    price_below_ma: 'السعر أدنى من المتوسط المتحرك',
    price_cross_above: 'السعر يخترق المتوسط المتحرك لأعلى',
    price_cross_below: 'السعر يكسر المتوسط المتحرك لأسفل',
    bullish_breakout: 'اختراق السعر للفركتل العلوي (مقاومة)',
    bearish_breakout: 'كسر السعر للفركتل السفلي (دعم)',
    price_above_upper: 'السعر يتجاوز شريط بولينجر العلوي',
    price_below_lower: 'السعر يكسر شريط بولينجر السفلي',
    above_level: 'أعلى من قيمة المستوى الفرعي',
    below_level: 'أدنى من قيمة المستوى الفرعي',
    k_cross_above_d: 'خط %K يخترق خط الإشارة %D صعوداً',
    k_cross_below_d: 'خط %K يكسر خط الإشارة %D هبوطاً',
    bullish: 'في اتجاه صاعد إيجابي (Bullish)',
    bearish: 'في اتجاه هابط سلبي (Bearish)',
    price_above_vwap: 'السعر يتجاوز خط VWAP صعوداً',
    price_below_vwap: 'السعر يكسر خط VWAP هبوطاً',
    rising: 'في مسار تصاعدي مستمر',
    falling: 'في مسار تنازلي مستمر',
    above_average: 'متجاوزاً متوسط حجم التداول لـ 20 شمعة'
  };

  const labelMapEn: Record<string, string> = {
    above: 'above',
    below: 'below',
    cross_above: 'crosses above',
    cross_below: 'crosses below',
    bullish_cross: 'Bullish Crossover',
    bearish_cross: 'Bearish Crossover',
    above_zero: 'above Zero line',
    below_zero: 'below Zero line',
    fast_above_slow: 'Fast MA higher than Slow MA',
    fast_below_slow: 'Fast MA lower than Slow MA',
    fast_cross_above: 'Fast MA crosses above Slow MA (Golden Cross)',
    fast_cross_below: 'Fast MA crosses below Slow MA',
    price_above_ma: 'Price above Moving Average',
    price_below_ma: 'Price below Moving Average',
    price_cross_above: 'Price crosses above Moving Average',
    price_cross_below: 'Price crosses below Moving Average',
    bullish_breakout: 'Price breaks out above resistance fractal',
    bearish_breakout: 'Price breaks down below support fractal',
    price_above_upper: 'Price breaks above Upper Bollinger Band',
    price_below_lower: 'Price breaks below Lower Bollinger Band',
    above_level: 'higher than level',
    below_level: 'lower than level',
    k_cross_above_d: '%K line crosses above D line',
    k_cross_below_d: '%K line crosses below D line',
    bullish: 'in strong positive trend (Bullish)',
    bearish: 'in strong negative trend (Bearish)',
    price_above_vwap: 'Price holding above VWAP volume floor',
    price_below_vwap: 'Price dropping below VWAP volume ceiling',
    rising: 'on an active momentum rise',
    falling: 'on an active momentum fall',
    above_average: 'surpassing 20-candle average trading volume'
  };

  const indicatorMapAr: Record<string, string> = {
    rsi: 'مؤشر القوة النسبية (RSI)',
    macd: 'مؤشر التقارب والتباعد (MACD)',
    ma_cross: 'تقاطع المتوسطات المتحركة',
    price_ma: 'تفاعل السعر مع المتوسط المتحرك',
    fractal: 'مؤشر الفركتلات',
    bb: 'أشرطة بولينجر (Bollinger Bands)',
    adx: 'مؤشر قوة الاتجاه (ADX)',
    atr: 'مؤشر متوسط المدى الحقيقي (ATR)',
    cci: 'مؤشر قناة السلع (CCI)',
    stoch: 'المذبذب العشوائي (Stochastic)',
    stoch_rsi: 'مؤشر القوة النسبية العشوائي (Stochastic RSI)',
    supertrend: 'الاتجاه الخارق (SuperTrend)',
    vwap: 'متوسط السعر المرجح بالكميات (VWAP)',
    obv: 'حجم الرصيد المتراكم (OBV)',
    mfi: 'مؤشر التدفق المالي (MFI)',
    roc: 'معدل التغير السعري (ROC)',
    williams_r: 'مؤشر ويليامز (%R)',
    awesome: 'المذبذب الرائع (Awesome Oscillator)',
    volume: 'حجم التداول اليومي (Volume)',
    ema: 'المتوسط المتحرك الأسي (EMA)',
    sma: 'المتوسط المتحرك البسيط (SMA)',
    cmf: 'تدفق سيول تشايكين (CMF)',
    cmo: 'مذبذب زخم شاندي (CMO)'
  };

  const indicatorMapEn: Record<string, string> = {
    rsi: 'Relative Strength Index (RSI)',
    macd: 'MACD (Convergence/Divergence)',
    ma_cross: 'Moving Average Crossover',
    price_ma: 'Price & Moving Average',
    fractal: 'Fractals Indicator',
    bb: 'Bollinger Bands (BB)',
    adx: 'Average Directional Index (ADX)',
    atr: 'Average True Range (ATR)',
    cci: 'Commodity Channel Index (CCI)',
    stoch: 'Stochastic Oscillator',
    stoch_rsi: 'Stochastic RSI',
    supertrend: 'SuperTrend Trendlines',
    vwap: 'Volume Weighted Average Price (VWAP)',
    obv: 'On-Balance Volume (OBV)',
    mfi: 'Money Flow Index (MFI)',
    roc: 'Rate of Change (ROC)',
    williams_r: 'Williams %R Oscillator',
    awesome: 'Awesome Oscillator (AO)',
    volume: 'Trading Volume Momentum',
    ema: 'Exponential Moving Average (EMA)',
    sma: 'Simple Moving Average (SMA)',
    cmf: 'Chaikin Money Flow (CMF)',
    cmo: 'Chande Momentum Oscillator (CMO)'
  };

  const isAr = lang === 'ar';
  const labelMap = isAr ? labelMapAr : labelMapEn;
  const indicatorMap = isAr ? indicatorMapAr : indicatorMapEn;

  const indName = indicatorMap[rule.indicator] || rule.indicator.toUpperCase();
  const condName = labelMap[rule.condition] || rule.condition;
  
  let details = '';
  if (rule.indicator === 'rsi') {
    details = isAr
      ? ` (فترة: ${rule.param1 || 14}) ${condName} ${rule.value ?? 50}`
      : ` (Period: ${rule.param1 || 14}) ${condName} ${rule.value ?? 50}`;
  } else if (rule.indicator === 'macd') {
    const f = rule.param1 ?? 12;
    const s = rule.param2 ?? 26;
    details = isAr
      ? ` (السريع: ${f} والبطيء: ${s}) : ${condName}`
      : ` (Fast: ${f}, Slow: ${s}) : ${condName}`;
  } else if (rule.indicator === 'ma_cross') {
    const t1 = (rule.maType1 || 'sma').toUpperCase();
    const t2 = (rule.maType2 || 'ema').toUpperCase();
    details = isAr
      ? ` [السريع: ${t1}(${rule.param1 || 20}) والبطيء: ${t2}(${rule.param2 || 50})] : ${condName}`
      : ` [Fast: ${t1}(${rule.param1 || 20}), Slow: ${t2}(${rule.param2 || 50})] : ${condName}`;
  } else if (rule.indicator === 'price_ma') {
    const t = (rule.maType1 || 'sma').toUpperCase();
    details = isAr
      ? ` [متوسط ${t}(${rule.param1 || 20})] : ${condName}`
      : ` [MA: ${t}(${rule.param1 || 20})] : ${condName}`;
  } else if (rule.indicator === 'fractal') {
    details = isAr
      ? ` [نطاقات فركتل] : ${condName}`
      : ` [Fractals limits] : ${condName}`;
  } else if (rule.indicator === 'bb') {
    details = isAr
      ? ` [أشرطة بولينجر] : ${condName}`
      : ` [BB Bands] : ${condName}`;
  } else if (['adx', 'atr', 'cci', 'mfi', 'roc', 'williams_r', 'cmf', 'cmo'].includes(rule.indicator)) {
    details = isAr
      ? ` (فترة: ${rule.param1 || 14}) ${condName} ${rule.value !== undefined ? rule.value : ''}`
      : ` (Period: ${rule.param1 || 14}) ${condName} ${rule.value !== undefined ? rule.value : ''}`;
  } else if (['stoch', 'stoch_rsi'].includes(rule.indicator)) {
    details = isAr
      ? ` (فترة: ${rule.param1 || 14}) شروط التقاطع / القيمة: ${condName}`
      : ` (Period: ${rule.param1 || 14}) Crossovers / Value: ${condName}`;
  } else if (rule.indicator === 'supertrend') {
    details = isAr
      ? ` (فترة: ${rule.param1 || 10}, مضاعف: ${rule.param2 || 3}) : ${condName}`
      : ` (Period: ${rule.param1 || 10}, Multiplier: ${rule.param2 || 3}) : ${condName}`;
  } else if (['ema', 'sma'].includes(rule.indicator)) {
    details = isAr
      ? ` (فترة: ${rule.param1 || 20}) السعر ${condName}`
      : ` (Period: ${rule.param1 || 20}) Price ${condName}`;
  } else {
    details = ` : ${condName}`;
  }

  return `${indName}${details}`;
}
