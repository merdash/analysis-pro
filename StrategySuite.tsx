/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Check, 
  X, 
  Save, 
  Plus, 
  Trash, 
  Sparkles, 
  Layers, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FolderOpen,
  Eye,
  Settings,
  HelpCircle,
  Search,
  ChevronDown,
  Pencil,
  RotateCcw,
  Bell,
  Volume2,
  VolumeX,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { OhlcData, CustomStrategy, RuleCondition, IndicatorType } from '../types';
import { evaluateStrategy, generateDefaultStrategies, translateRuleToText } from '../lib/strategyEvaluator';
import SentimentGauge from './SentimentGauge';

export interface PredefinedTemplate {
  id: string;
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  logicOperator: 'and' | 'or';
  rules: Omit<RuleCondition, 'id'>[];
}

export const PREDEFINED_TEMPLATES: PredefinedTemplate[] = [
  {
    id: 'bollinger-rsi-reversal',
    nameEn: 'Bollinger Band Spark Reversal',
    nameAr: 'انعكاس نطاقات بولينجر السريع',
    descEn: 'A precise dip-buying strategy that triggers when price drops below the lower Bollinger Band while RSI is extremely oversold (< 30) to catch rapid reversals.',
    descAr: 'استراتيجية قنص القيعان الدقيقة، تتفعل فور هبوط الأسعار تحت الخط السفلي لنطاقات بولينجر بالتوازي مع وصول مؤشر القوة النسبية RSI لمنطقة مفرطة البيع (< 30).',
    logicOperator: 'and',
    rules: [
      {
        indicator: 'bb',
        condition: 'price_below_lower'
      },
      {
        indicator: 'rsi',
        condition: 'below',
        value: 30,
        param1: 14
      }
    ]
  },
  {
    id: 'trend-strength-breakout',
    nameEn: 'Trend Strength Breakout',
    nameAr: 'اختراق الاتجاه القوي',
    descEn: 'A momentum continuation trend strategy that buys when price breaks above the 20-period Simple Moving Average while the ADX confirms strong trend presence (> 25).',
    descAr: 'استراتيجية مطاردة الزخم والتريند المتصاعد. تفتح صفقة عندما يتجاوز السعر المتوسط المتحرك البسيط لـ 20 فترة في حين يؤكد قوة الاتجاه ADX تجاوز حد القوة (> 25).',
    logicOperator: 'and',
    rules: [
      {
        indicator: 'price_ma',
        condition: 'price_above_ma',
        param1: 20,
        maType1: 'sma'
      },
      {
        indicator: 'adx',
        condition: 'above',
        value: 25,
        param1: 14
      }
    ]
  },
  {
    id: 'supertrend-volume-scalper',
    nameEn: 'SuperTrend Scalper with Volume',
    nameAr: 'سكالبينج سوبر تريند المعتمد على الحجم',
    descEn: 'An aggressive scalping system ensuring price is trending bullish via SuperTrend while verified by above-average high trading volume spikes.',
    descAr: 'نظام مضاربة سكالبينج قوي، يشترط وجود اتجاه صاعد معتمد ومُبين بواسطة مؤشر SuperTrend بالتزامن مع قفزة حقيقية في حجم تداول الفولوم لتجنب الإشارات الكاذبة.',
    logicOperator: 'and',
    rules: [
      {
        indicator: 'supertrend',
        condition: 'bullish',
        param1: 10,
        param2: 3
      },
      {
        indicator: 'volume',
        condition: 'above_average'
      }
    ]
  },
  {
    id: 'macd-stoch-divergence',
    nameEn: 'MACD Divergence & Slow Stochastic Catalyst',
    nameAr: 'تباعد ماكد واستوكاستك البطيء',
    descEn: 'A dual-oscillator confirmation setup identifying near-term cyclical momentum shifts, buying as MACD forms a bullish cross and Stochastic %K crosses above %D in the oversold zone (< 20).',
    descAr: 'إستراتيجية قائمة على مؤكدين للتذبذب لتحديد التحولات الوشيكة في القوة الدافعة قصيرة المدى؛ تشتري عند تقاطع MACD الإيجابي مع تقاطع خطوط ستوكاستك %K أعلى %D في منطقة التشبع الكلي (< 20).',
    logicOperator: 'and',
    rules: [
      {
        indicator: 'macd',
        condition: 'bullish_cross'
      },
      {
        indicator: 'stoch',
        condition: 'k_cross_above_d'
      }
    ]
  },
  {
    id: 'vwap-mfi-accumulation',
    nameEn: 'VWAP Dynamic Support & MFI Accumulation',
    nameAr: 'دعم VWAP الديناميكي وتدفق السيولة MFI',
    descEn: 'An institutional-grade accumulation strategy buying the dip when price is trading beneath the average VWAP line while Money Flow Index (MFI) shows major buying volume structure (< 30).',
    descAr: 'إستراتيجية تجميع مؤسساتية تقتنص الفرص بمجرد تداول السعر تحت خط متوسط السعر المرجح بحجم التداول VWAP بالترافق مع إظهار تدفقات سيولة غزيرة MFI بالمنطقة السفلية (< 30).',
    logicOperator: 'and',
    rules: [
      {
        indicator: 'vwap',
        condition: 'price_below_vwap'
      },
      {
        indicator: 'mfi',
        condition: 'below',
        value: 30,
        param1: 14
      }
    ]
  },
  {
    id: 'conservative-quad-screen',
    nameEn: 'Ultimate 5-Indicator Confirmation Suite',
    nameAr: 'باقة التأكيد الخماسية المطلقة',
    descEn: 'A highly conservative, triple-screen filtered system checking Bullish Bollinger breakout, price above 200 EMA long-term trend, positive MACD above zero, RSI momentum over 50, and OBV rising.',
    descAr: 'نظام فائق التحفظ للمستثمر المحترف. يتطلب تحقق شروط مجتمعة: خط السعر صاعداً أعلى المتوسط الأسّي 200 EMA، مؤشر MACD إيجابي فوق الصفر، مؤشر RSI أعلى من 50، ومؤشر حجم التداول المتراكم OBV متصاعد.',
    logicOperator: 'and',
    rules: [
      {
        indicator: 'price_ma',
        condition: 'price_above_ma',
        param1: 200,
        maType1: 'ema'
      },
      {
        indicator: 'macd',
        condition: 'above_zero'
      },
      {
        indicator: 'rsi',
        condition: 'above',
        value: 50,
        param1: 14
      },
      {
        indicator: 'obv',
        condition: 'rising'
      }
    ]
  }
];

// Integrated Unified Technical Catalog for all 21 supported TradingView Indicators
export const INDICATORS_DETAILS_CATALOG = [
  {
    id: 'rsi' as IndicatorType,
    nameAr: 'مؤشر القوة النسبية (RSI)',
    nameEn: 'Relative Strength Index (RSI)',
    descAr: 'مؤشر زخم رائد يقيس سرعة وحجم التغيرات السعرية لتحديد مناطق تشبع الشراء والبيع والضربات الانعكاسية.',
    descEn: 'A leading momentum oscillator that measures the speed and change of price steps to identify overbought and oversold levels.',
    fields: [
      { key: 'param1', labelAr: 'الفترة الزمنية (Period)', labelEn: 'RSI Period', type: 'number', min: 1, max: 200, def: 14 },
      { key: 'value', labelAr: 'خط عتبة التقييم (Value)', labelEn: 'Evaluation Border Line', type: 'number', min: 0, max: 100, def: 30 }
    ],
    conditions: [
      { value: 'below', labelAr: 'أقل من القيمة (Less than)', labelEn: 'Less than Level' },
      { value: 'above', labelAr: 'أعلى من القيمة (Greater than)', labelEn: 'Greater than Level' },
      { value: 'cross_above', labelAr: 'يخترق صعوداً قيمة المستوى', labelEn: 'Crosses above Level' },
      { value: 'cross_below', labelAr: 'يكسر هبوطاً قيمة المستوى', labelEn: 'Crosses below Level' }
    ]
  },
  {
    id: 'macd' as IndicatorType,
    nameAr: 'مؤشر التقارب والتباعد (MACD)',
    nameEn: 'MACD (Trend Momentum)',
    descAr: 'يتتبع قوة دفع الاتجاه وحركة المتوسطات الأسّية السريعة والبطيئة لتمرير نقاط الدعم والتقاطع الذهبي.',
    descEn: 'A trend-following momentum oscillator reflecting the gap between fast & slow exponential moving averages (EMAs) along with a signal line.',
    fields: [
      { key: 'param1', labelAr: 'المتوسط السريع (Fast EMA)', labelEn: 'Fast Exponential Period', type: 'number', min: 1, max: 100, def: 12 },
      { key: 'param2', labelAr: 'المتوسط البطيء (Slow EMA)', labelEn: 'Slow Exponential Period', type: 'number', min: 1, max: 200, def: 26 }
    ],
    conditions: [
      { value: 'bullish_cross', labelAr: 'خط MACD يخترق خط الإشارة لأعلى (شراء)', labelEn: 'MACD Line crosses above Signal (BUY)' },
      { value: 'bearish_cross', labelAr: 'خط MACD يكسر خط الإشارة لأسفل (بيع)', labelEn: 'MACD Line crosses below Signal (SELL)' },
      { value: 'above_zero', labelAr: 'خط MACD فوق الصفر (صعود)', labelEn: 'MACD Above Zero Base (Bullish)' },
      { value: 'below_zero', labelAr: 'خط MACD تحت الصفر (هبوط)', labelEn: 'MACD Below Zero Base (Bearish)' }
    ]
  },
  {
    id: 'ma_cross' as IndicatorType,
    nameAr: 'تقاطع المتوسطات المتحركة (MA Cross)',
    nameEn: 'Moving Average Crossover',
    descAr: 'يصنع إشارات تداول مبكرة عند التقاطع المتبادل بين متوسطين متحركين (مثل المتوسط السريع 20 والمتوسط البطيء 50).',
    descEn: 'Generates buy/sell signals on structural intersection between a short-term fast moving average and a long-term slow moving average.',
    fields: [
      { key: 'param1', labelAr: 'المتوسط السريع (Fast Period)', labelEn: 'Fast MA Period', type: 'number', min: 1, max: 100, def: 20 },
      { key: 'maType1', labelAr: 'معادلة السريع (Fast MA Style)', labelEn: 'Fast MA Style', type: 'select', options: ['sma', 'ema'], def: 'sma' },
      { key: 'param2', labelAr: 'المتوسط البطيء (Slow Period)', labelEn: 'Slow MA Period', type: 'number', min: 1, max: 200, def: 50 },
      { key: 'maType2', labelAr: 'معادلة البطيء (Slow MA Style)', labelEn: 'Slow MA Style', type: 'select', options: ['sma', 'ema'], def: 'ema' }
    ],
    conditions: [
      { value: 'fast_cross_above', labelAr: 'المتوسط السريع يخترق البطيء صعوداً (تقاطع ذهبي)', labelEn: 'Fast MA crosses above Slow (Golden Cross)' },
      { value: 'fast_cross_below', labelAr: 'المتوسط السريع يكسر البطيء هبوطاً (تقاطع الموت)', labelEn: 'Fast MA crosses below Slow' },
      { value: 'fast_above_slow', labelAr: 'المتوسط السريع أعلى من البطيء', labelEn: 'Fast MA is higher than Slow MA' },
      { value: 'fast_below_slow', labelAr: 'المتوسط السريع أدنى من البطيء', labelEn: 'Fast MA is lower than Slow MA' }
    ]
  },
  {
    id: 'price_ma' as IndicatorType,
    nameAr: 'تفاعل السعر مع المتوسط (Price vs MA)',
    nameEn: 'Price vs Moving Average',
    descAr: 'مقارنة فنية مباشرة بين سعر الإغلاق للشمعة الحالية ومتوسط حسابي معين لاستنباط اختراق الزخم والدعم.',
    descEn: 'A direct mathematical comparison between current close price and a specific moving average to identify support levels or immediate trend breakouts.',
    fields: [
      { key: 'param1', labelAr: 'فترة المتوسط (MA Period)', labelEn: 'Moving Average Period', type: 'number', min: 1, max: 500, def: 50 },
      { key: 'maType1', labelAr: 'نوع المتوسط الرياضي', labelEn: 'MA Formula Type', type: 'select', options: ['sma', 'ema'], def: 'sma' }
    ],
    conditions: [
      { value: 'price_above_ma', labelAr: 'السعر أعلى من المتوسط', labelEn: 'Price is above Moving Average' },
      { value: 'price_below_ma', labelAr: 'السعر أدنى من المتوسط', labelEn: 'Price is below Moving Average' },
      { value: 'price_cross_above', labelAr: 'السعر يخترق المتوسط لأعلى', labelEn: 'Price crosses above Moving Average' },
      { value: 'price_cross_below', labelAr: 'السعر يكسر المتوسط لأسفل', labelEn: 'Price crosses below Moving Average' }
    ]
  },
  {
    id: 'fractal' as IndicatorType,
    nameAr: 'فركتلات بيل ويليامز (Fractals)',
    nameEn: 'Williams Fractals (Highs/Lows)',
    descAr: 'يبحث عن القمم الفلكية والقيعان السعرية المحلية ليعطي خطوط دعم ومقاومة هندسية دقيقة فوريّة على الرسم.',
    descEn: 'Determines key local turning points (peaks and troughs) with mathematical limits, offering static support and resistance lines.',
    fields: [
      { key: 'param1', labelAr: 'فترة الفركتل (Fractal Period)', labelEn: 'Fractal Period Size', type: 'number', min: 1, max: 10, def: 2 }
    ],
    conditions: [
      { value: 'bullish_breakout', labelAr: 'السعر يخترق الفركتل العلوي الأخير (مقاومة)', labelEn: 'Price breaks above recent Up-Fractal' },
      { value: 'bearish_breakout', labelAr: 'السعر يكسر الفركتل السفلي الأخير (دعم)', labelEn: 'Price breaks below recent Down-Fractal' }
    ]
  },
  {
    id: 'bb' as IndicatorType,
    nameAr: 'أشرطة بولينجر (Bollinger Bands)',
    nameEn: 'Bollinger Bands (Volatility)',
    descAr: 'مؤشر تقلب يقيس انحراف وتذبذب الأسعار حول متوسط متحرك بسيط من خلال حزمة علوية وسفلية.',
    descEn: 'Evaluates structural market volatility with standard distribution bands mapped around a simple moving average to signal extreme bounds.',
    fields: [
      { key: 'param1', labelAr: 'جناح البولينجر (Bollinger Period)', labelEn: 'Bollinger Band Period', type: 'number', min: 1, max: 100, def: 20 }
    ],
    conditions: [
      { value: 'price_above_upper', labelAr: 'السعر يتجاوز شريط بولينجر العلوي', labelEn: 'Price breaches Upper Band' },
      { value: 'price_below_lower', labelAr: 'السعر يكسر شريط بولينجر السفلي', labelEn: 'Price breaches Lower Band' }
    ]
  },
  {
    id: 'adx' as IndicatorType,
    nameAr: 'مؤشر قوة الاتجاه (ADX)',
    nameEn: 'Average Directional Index (ADX)',
    descAr: 'يقيس قوة الاتجاه السائد في السوق بغض النظر عن اتجاهه (القيم فوق 25 تعبر عن زخم اتجاهي قوي).',
    descEn: 'Measures the absolute strength of a trend, regardless of its direction (values above 25 generally indicate a strong trend).',
    fields: [
      { key: 'param1', labelAr: 'فترة الحساب (ADX Period)', labelEn: 'ADX Calculation Period', type: 'number', min: 1, max: 100, def: 14 },
      { key: 'value', labelAr: 'خط عتبة القوة (Value)', labelEn: 'Trend Strength Limit', type: 'number', min: 1, max: 100, def: 25 }
    ],
    conditions: [
      { value: 'above', labelAr: 'أكبر من القيمة (اتجاه قوي وسريع)', labelEn: 'Greater than Level (Strong)' },
      { value: 'below', labelAr: 'أصغر من القيمة (تذبذب/اتجاه ضعيف)', labelEn: 'Less than Level (Weak)' }
    ]
  },
  {
    id: 'atr' as IndicatorType,
    nameAr: 'مؤشر متوسط المدى الحقيقي (ATR)',
    nameEn: 'Average True Range (ATR)',
    descAr: 'يقيس درجة تقلب الأسعار وتذبذب حركة الأصول الرقمية لتقدير مستويات وقف الخسارة وجني الأرباح بشكل معزز.',
    descEn: 'Synthesizes market volatility by calculating the average range of price movements over a specified timeframe.',
    fields: [
      { key: 'param1', labelAr: 'فترة القياس (ATR Period)', labelEn: 'ATR Average Period', type: 'number', min: 1, max: 100, def: 14 },
      { key: 'value', labelAr: 'القيمة الفنيّة المستهدفة', labelEn: 'Target Volatility Value', type: 'number', min: 0.1, max: 100000, def: 1.5 }
    ],
    conditions: [
      { value: 'above', labelAr: 'متوسط المدى الحقيقي أكبر من القيمة', labelEn: 'ATR Greater than Level' },
      { value: 'below', labelAr: 'متوسط المدى الحقيقي أصغر من القيمة', labelEn: 'ATR Less than Level' }
    ]
  },
  {
    id: 'cci' as IndicatorType,
    nameAr: 'مؤشر قناة السلع (CCI)',
    nameEn: 'Commodity Channel Index (CCI)',
    descAr: 'يقيس انحراف السعر الحالي عن متوسطه الإجمالي لتحديد بدايات اتجاهات جديدة وتحديد مستويات التشبع القصوى.',
    descEn: 'Quantifies the relationship between asset prices, their moving averages, and modern deviations to reveal overbought and oversold bounds.',
    fields: [
      { key: 'param1', labelAr: 'فترة الحساب (CCI Period)', labelEn: 'CCI Average Period', type: 'number', min: 1, max: 100, def: 20 },
      { key: 'value', labelAr: 'قيمة مستوى القناة', labelEn: 'Target Channel Limit', type: 'number', min: -500, max: 500, def: 100 }
    ],
    conditions: [
      { value: 'above', labelAr: 'أكبر من القيمة (تشبع شرائي)', labelEn: 'CCI Greater than Level' },
      { value: 'below', labelAr: 'أصغر من القيمة (تشبع بيعي)', labelEn: 'CCI Less than Level' }
    ]
  },
  {
    id: 'stoch' as IndicatorType,
    nameAr: 'المذبذب العشوائي (Stochastic)',
    nameEn: 'Stochastic Oscillator',
    descAr: 'يقارن موضع سعر الإغلاق الحالي بنطاق السعر على مدار فترة زمنية محددة لتمرير عتبة القوة الزخمية.',
    descEn: 'Ranks the placement of the current close price relative to the highest high and lowest low of a session range.',
    fields: [
      { key: 'param1', labelAr: 'الفترة الزمنية (Stoch %K)', labelEn: 'Stoch %K Period', type: 'number', min: 1, max: 100, def: 14 },
      { key: 'value', labelAr: 'مستوى التقييم الشرطي', labelEn: 'Target Level Value', type: 'number', min: 0, max: 100, def: 80 }
    ],
    conditions: [
      { value: 'k_cross_above_d', labelAr: 'خط %K يخترق %D لأعلى (شراء)', labelEn: '%K crosses above %D (BUY)' },
      { value: 'k_cross_below_d', labelAr: 'خط %K يكسر %D لأسفل (بيع)', labelEn: '%K crosses below %D (SELL)' },
      { value: 'above', labelAr: 'خط %K أكبر من القيمة المستوى', labelEn: '%K Greater than Level' },
      { value: 'below', labelAr: 'خط %K أصغر من القيمة المستوى', labelEn: '%K Less than Level' }
    ]
  },
  {
    id: 'stoch_rsi' as IndicatorType,
    nameAr: 'مؤشر القوة النسبية العشوائي (Stoch RSI)',
    nameEn: 'Stochastic RSI',
    descAr: 'يطبق معادلة المذبذب العشوائي مباشرة على قيم RSI لإنشاء حساسية متناهية وتحديد القمم الدقيقة الشديدة التباعد.',
    descEn: 'Applies Stochastic calculator formulas directly over RSI values instead of standard price to extract highly reactive momentum triggers.',
    fields: [
      { key: 'param1', labelAr: 'فترة المؤشر (StochRSI Period)', labelEn: 'StochRSI Period', type: 'number', min: 1, max: 100, def: 14 },
      { key: 'value', labelAr: 'مستوى التقييم الشرطي', labelEn: 'Target Level Value', type: 'number', min: 0, max: 100, def: 80 }
    ],
    conditions: [
      { value: 'k_cross_above_d', labelAr: 'خط %K يخترق %D لأعلى (شراء)', labelEn: '%K crosses above %D (BUY)' },
      { value: 'k_cross_below_d', labelAr: 'خط %K يكسر %D لأسفل (بيع)', labelEn: '%K crosses below %D (SELL)' },
      { value: 'above', labelAr: 'خط %K أكبر من قيمة المستوى', labelEn: '%K Greater than Level' },
      { value: 'below', labelAr: 'خط %K أصغر من قيمة المستوى', labelEn: '%K Less than Level' }
    ]
  },
  {
    id: 'supertrend' as IndicatorType,
    nameAr: 'شريط الاتجاه الخارق (SuperTrend)',
    nameEn: 'SuperTrend Trendlines',
    descAr: 'مؤشر تتبع اتجاه فوري يدمج السعر مع متوسط ATR لإنشاء خطوط دعم ومقاومة متحركة تصفي الاتجاهات بشكل ذكي.',
    descEn: 'A master visual trendline built on top of ATR ranges and median prices, changing color adaptively to signal underlying buy or sell biases.',
    fields: [
      { key: 'param1', labelAr: 'فترة الـ ATR (ATR Period)', labelEn: 'ATR Period', type: 'number', min: 1, max: 100, def: 10 },
      { key: 'param2', labelAr: 'مضاعف المدى (Multiplier)', labelEn: 'ATR Multiplier', type: 'number', min: 1, max: 20, def: 3 }
    ],
    conditions: [
      { value: 'bullish', labelAr: 'إشارة المسار صاعد (أخضر)', labelEn: 'Bullish Trend (GREEN)' },
      { value: 'bearish', labelAr: 'إشارة المسار هابط (أحمر)', labelEn: 'Bearish Trend (RED)' }
    ]
  },
  {
    id: 'vwap' as IndicatorType,
    nameAr: 'متوسط السعر المرجح بالكميات (VWAP)',
    nameEn: 'Volume Weighted Average Price (VWAP)',
    descAr: 'المقياس الحقيقي المقارن الذي يدمج مستويات السعر مع أحجام التداول لتحديد سعر تداول عادل ورصد تلاعب الحيتان.',
    descEn: 'Calculates the real mathematical fair price representation based on both transaction volume rates and price distribution grids.',
    fields: [],
    conditions: [
      { value: 'price_above_vwap', labelAr: 'السعر أعلى من خط VWAP', labelEn: 'Price above VWAP' },
      { value: 'price_below_vwap', labelAr: 'السعر أدنى من خط VWAP', labelEn: 'Price below VWAP' }
    ]
  },
  {
    id: 'obv' as IndicatorType,
    nameAr: 'مؤشر حجم الرصيد المتراكم (OBV)',
    nameEn: 'On-Balance Volume (OBV)',
    descAr: 'يربط التدفق الإجمالي لحجم التداول بالتغير السعري لتحديد قرارات الشراء والتجميع أو البيع والتصريف في فترات الصمت.',
    descEn: 'Keeps a running cumulative sum of transaction volumes, positive or negative, to anticipate major trend breakouts ahead of price moves.',
    fields: [],
    conditions: [
      { value: 'rising', labelAr: 'قناة حجم التداول صاعدة (تجميع)', labelEn: 'OBV Accumulation Rising' },
      { value: 'falling', labelAr: 'قناة حجم التداول هابطة (تصريف)', labelEn: 'OBV Distribution Falling' }
    ]
  },
  {
    id: 'mfi' as IndicatorType,
    nameAr: 'مؤشر تدفق السيولة المالي (MFI)',
    nameEn: 'Money Flow Index (MFI)',
    descAr: 'مؤشر رائد يشبه RSI ولكن يدمج الحجم الفعلي للسيولة الداخلة والخارجة لتقدير زخم حقيقي غير مزيف.',
    descEn: 'An oscillator scaling from 0 to 100 that uses both price action dynamics and volume flow parameters to reflect absolute buying pressure.',
    fields: [
      { key: 'param1', labelAr: 'فترة السيولة (MFI Period)', labelEn: 'MFI Period', type: 'number', min: 1, max: 100, def: 14 },
      { key: 'value', labelAr: 'عتبة التدفق المستهدف (Value)', labelEn: 'MFI Level Limit', type: 'number', min: 0, max: 100, def: 80 }
    ],
    conditions: [
      { value: 'above', labelAr: 'تدفق السيولة أكبر من عتبة القيمة', labelEn: 'MFI Greater than Level' },
      { value: 'below', labelAr: 'تدفق السيولة أصغر من عتبة القيمة', labelEn: 'MFI Less than Level' }
    ]
  },
  {
    id: 'roc' as IndicatorType,
    nameAr: 'مؤشر معدل التغير السعري (ROC)',
    nameEn: 'Rate of Change (ROC)',
    descAr: 'يقيس النسبة المئوية للتغير بين السعر الحالي وسعر الشمعة السابقة قبل فترات محددة لتوصيف تسارع الحركة.',
    descEn: 'Calculates the pure percentage differences between the current close value and historical prices of a specified offset back.',
    fields: [
      { key: 'param1', labelAr: 'عدد شموع الإزاحة الفنيّة', labelEn: 'ROC Period', type: 'number', min: 1, max: 100, def: 9 }
    ],
    conditions: [
      { value: 'above_zero', labelAr: 'معدل التغيير فوق الصفر (صعود)', labelEn: 'ROC Greater than 0' },
      { value: 'below_zero', labelAr: 'معدل التغيير تحت الصفر (هبوط)', labelEn: 'ROC Less than 0' }
    ]
  },
  {
    id: 'williams_r' as IndicatorType,
    nameAr: 'مؤشر تذبذب ويليامز السلبي (%R)',
    nameEn: 'Williams %R Oscillator',
    descAr: 'يقيس العلاقة بين أسعار الإغلاق والقمم/القيعان ليعطي قراءة تذبذب سريعة وحساسة في النطاق السلبي (0 إلى -100).',
    descEn: 'Synthesizes momentum inside a negative coordinate scale, offering swift alerts about potential pivot reversals near overbought-oversold zones.',
    fields: [
      { key: 'param1', labelAr: 'فترة النطاق (Williams Period)', labelEn: 'Williams Period', type: 'number', min: 1, max: 100, def: 14 },
      { key: 'value', labelAr: 'عتبة مستوى التذبذب (Value)', labelEn: 'Negative Level Border', type: 'number', min: -100, max: 0, def: -80 }
    ],
    conditions: [
      { value: 'above', labelAr: 'عتبة ويليامز أكبر من المستوى', labelEn: 'Williams %R Greater than Level' },
      { value: 'below', labelAr: 'عتبة ويليامز أصغر من المستوى', labelEn: 'Williams %R Less than Level' }
    ]
  },
  {
    id: 'awesome' as IndicatorType,
    nameAr: 'المذبذب الرائع الزخمي (AO)',
    nameEn: 'Awesome Oscillator (AO)',
    descAr: 'يقارن الزخم الحالي بالزخم التاريخي عبر حساب الفروقات لخط المتوسطات لتوضيح انعطاف اتجاهات السوق.',
    descEn: 'Tracks market momentum by calculating the direct gap between 34-period SMA and 5-period SMA from candle midpoint readings.',
    fields: [],
    conditions: [
      { value: 'above_zero', labelAr: 'مذبذب الزخم فوق الصفر (شراء)', labelEn: 'Awesome Oscillator Greater than 0' },
      { value: 'below_zero', labelAr: 'مذبذب الزخم تحت الصفر (بيع)', labelEn: 'Awesome Oscillator Less than 0' }
    ]
  },
  {
    id: 'volume' as IndicatorType,
    nameAr: 'حجم التداول اليومي (Volume)',
    nameEn: 'Trading Volume Momentum',
    descAr: 'يفحص تفاعل السعر والكمية بمطابقة حجم شمعة التداول الحالية مع متوسط كميات التداول للأربعين شمعة الفائتة.',
    descEn: 'Direct testing of transaction sizes relative to overall historical averages to identify active institutional support.',
    fields: [],
    conditions: [
      { value: 'above_average', labelAr: 'حجم شمعة التداول فوق خط المتوسط 20 шمعة', labelEn: 'Volume Greater than 20-candle average' },
      { value: 'below_average', labelAr: 'حجم شمعة التداول تحت خط المتوسط 20 شمعة', labelEn: 'Volume Less than 20-candle average' }
    ]
  },
  {
    id: 'ema' as IndicatorType,
    nameAr: 'المتوسط المتحرك الأسي (EMA)',
    nameEn: 'Exponential Moving Average (EMA)',
    descAr: 'متوسط سعري يمنح وزناً أكبر وتأثيراً أسرع لأسعار الإغلاق الأخيرة، مما يجعله فائق الحساسية للتقلبات الفورية.',
    descEn: 'A specific moving average applying higher weight multipliers to recent candlesticks, being extremely responsive to momentum pivots.',
    fields: [
      { key: 'param1', labelAr: 'فترة المتوسط الأسي (EMA Period)', labelEn: 'EMA Period', type: 'number', min: 1, max: 500, def: 20 }
    ],
    conditions: [
      { value: 'above', labelAr: 'السعر أعلى من متوسط الأس الأسي', labelEn: 'Price above EMA' },
      { value: 'below', labelAr: 'السعر أدنى من متوسط الأس الأسي', labelEn: 'Price below EMA' }
    ]
  },
  {
    id: 'sma' as IndicatorType,
    nameAr: 'المتوسط المتحرك البسيط (SMA)',
    nameEn: 'Simple Moving Average (SMA)',
    descAr: 'المتوسط الحسابي القياسي للشموع الفائتة، وهو من الدعائم الكبرى لتحديد الاتجاه الإجمالي العام ومستويات الدعم الثابتة.',
    descEn: 'A standard arithmetic mean of prices across a fixed interval of periods, ideal for validating main structural trends.',
    fields: [
      { key: 'param1', labelAr: 'فترة المتوسط البسيطة (SMA Period)', labelEn: 'SMA Period', type: 'number', min: 1, max: 500, def: 20 }
    ],
    conditions: [
      { value: 'above', labelAr: 'السعر أعلى من متوسط بسيط خطي', labelEn: 'Price above SMA' },
      { value: 'below', labelAr: 'السعر أدنى من متوسط بسيط خطي', labelEn: 'Price below SMA' }
    ]
  },
  {
    id: 'cmf' as IndicatorType,
    nameAr: 'تدفق سيول تشايكين (CMF)',
    nameEn: 'Chaikin Money Flow (CMF)',
    descAr: 'يقيس حجم تدفق السيولة المتراكم على مدار فترة زمنية معينة للتحقق من قوى الشراء أو البيع ومطابقتها مع الاتجاه.',
    descEn: 'Measures the amount of Money Flow Volume over a specific period to validate underlying trend strength and institutional backing.',
    fields: [
      { key: 'param1', labelAr: 'فترة الـ CMF (Period)', labelEn: 'CMF Period', type: 'number', min: 1, max: 100, def: 20 },
      { key: 'value', labelAr: 'خط عتبة السيولة (Value)', labelEn: 'Money Flow Threshold', type: 'number', min: -1, max: 1, def: 0 }
    ],
    conditions: [
      { value: 'above', labelAr: 'أكبر من المستوى (سيولة إيجابية)', labelEn: 'Greater than Threshold (Bullish Flow)' },
      { value: 'below', labelAr: 'أصغر من المستوى (سيولة سلبية)', labelEn: 'Less than Threshold (Bearish Flow)' },
      { value: 'cross_above', labelAr: 'يخترق خط الوسط صعودا (دخول سيولة)', labelEn: 'Crosses above Threshold' },
      { value: 'cross_below', labelAr: 'يكسر خط الوسط هبوطا (خروج سيولة)', labelEn: 'Crosses below Threshold' }
    ]
  },
  {
    id: 'cmo' as IndicatorType,
    nameAr: 'مذبذب زخم شاندي (CMO)',
    nameEn: 'Chande Momentum Oscillator (CMO)',
    descAr: 'مقياس زخم متطور يحسب الفارق المباشر بين الزخم الصاعد والهابط كنسبة مئوية، مما يبرز التشبعات القصوى.',
    descEn: 'An advanced momentum oscillator calculating the absolute difference between up and down momentum to alert on extreme overbought/oversold levels.',
    fields: [
      { key: 'param1', labelAr: 'فترة الـ CMO (Period)', labelEn: 'CMO Period', type: 'number', min: 1, max: 100, def: 14 },
      { key: 'value', labelAr: 'مستوى التقييم الشرطي (Value)', labelEn: 'CMO Evaluation Level', type: 'number', min: -100, max: 100, def: 0 }
    ],
    conditions: [
      { value: 'above', labelAr: 'أكبر من قيمة المستوى', labelEn: 'Greater than Level' },
      { value: 'below', labelAr: 'أصغر من قيمة المستوى', labelEn: 'Less than Level' },
      { value: 'cross_above', labelAr: 'يخترق صعوداً قيمة المستوى', labelEn: 'Crosses above Level' },
      { value: 'cross_below', labelAr: 'يكسر هبوطاً قيمة المستوى', labelEn: 'Crosses below Level' }
    ]
  }
];

export interface StrategySuiteProps {
  data: OhlcData[];
  activeStrategyId: string | null;
  setActiveStrategyId: (id: string | null) => void;
  onStrategyChange?: (prompt: string) => void;
  language?: 'ar' | 'en';
  indicators?: Record<string, boolean>;
  setIndicators?: (indicators: any) => void;
  indicatorParams?: any;
  setIndicatorParams?: (params: any) => void;
  customStudies?: string[];
  setCustomStudies?: (studies: string[]) => void;
  onNavigateToChart?: () => void;
  symbol?: string;
}

export default function StrategySuite({ 
  data, 
  activeStrategyId, 
  setActiveStrategyId,
  onStrategyChange,
  language = 'ar',
  indicators,
  setIndicators,
  indicatorParams,
  setIndicatorParams,
  customStudies,
  setCustomStudies,
  onNavigateToChart,
  symbol = 'PAXGUSDT'
}: StrategySuiteProps) {
  const LOCAL_STORAGE_STRATEGIES_KEY = 'pro_trader_custom_saved_strategies';

  const isAr = language === 'ar';
  
  const text = {
    myStrategies: isAr ? 'استراتيجيات التداول الخاصة بي' : 'My Trading Strategies',
    subtitle: isAr ? 'اختر أو صمم استراتيجيتك للتطبيق الفوري' : 'Select or design customized trading strategies',
    newBtn: isAr ? 'جديدة' : 'New',
    defaultBadge: isAr ? 'افتراضي' : 'Default',
    editStrategy: isAr ? 'تعديل الشروط والمستويات' : 'Edit Strategy Rules',
    deleteStrategy: isAr ? 'حذف الاستراتيجية' : 'Delete Strategy',
    rulesLabel: isAr ? 'قواعد' : 'Rules',
    logicOperatorLabel: isAr ? 'دمج' : 'Logic',
    logicAndLabel: isAr ? 'تطابق كامل (AND)' : 'All matched (AND)',
    logicOrLabel: isAr ? 'أي شرط (OR)' : 'Any matched (OR)',
    noCustomStrategies: isAr ? 'لا يوجد أي استراتيجيات مخصصة.' : 'No custom strategies created yet.',
    makeFirstStrategy: isAr ? 'اضغط على زر "جديدة" لصياغة قواعدك الأولى!' : 'Click "New" to design your first strategy rules!',
    liveEngineTitle: isAr ? 'محرك تقييم الاستراتيجية المباشر' : 'Live Strategy Evaluation Engine',
    liveBadge: isAr ? 'حي' : 'LIVE',
    liveEngineDesc: isAr ? 'تفحّص إشارات السوق الرقمية الحية باستمرار' : 'Continuously monitoring live market indicator data',
    currentSignal: isAr ? 'الإشارة الحالية:' : 'Current Signal:',
    signalBuy: isAr ? 'إشارة شراء (BUY)' : 'BUY SIGNAL',
    signalSell: isAr ? 'إشارة بيع (SELL)' : 'SELL SIGNAL',
    signalNeutral: isAr ? 'انتظار / حيادي' : 'WAIT / NEUTRAL',
    appliedStrategy: isAr ? 'الاستراتيجية المطبقة:' : 'Applied Strategy:',
    requirementsMatchRate: isAr ? 'نسبة تحقق الشروط الرياضية:' : 'Formula Math Match Rate:',
    rulesCheckpointTitle: isAr ? 'حالة مطابقة القواعد' : 'Rule Matching Status Checkpoint',
    noActiveStrategy: isAr ? 'لا يوجد استراتيجية تداول نشطة' : 'No Active Strategy selected',
    selectStrategyHint: isAr 
      ? 'الرجاء تحديد إحدى الاستراتيجيات من اللوحة اليمنى ليقوم المحرك الرياضي بفحص وتحليل المؤشرات الحية للسعر فوراً.'
      : 'Please select a strategy from the left list to enable the mathematical evaluation on live market candles.',
    aiNotice: isAr 
      ? '* سيقوم الذكاء الاصطناعي بدمج استراتيجيتك النشطة في تقرير التحليل الفني تلقائياً.'
      : '* The AI expert will automatically integrate your active strategy rules during live analytics.',
    databaseLabel: isAr ? 'قاعدة البيانات:' : 'Database:',
    candlesCount: isAr ? 'شمعة' : 'candles',
    noData: isAr ? 'لا يوجد بيانات' : 'No data aligned',
    editorEditTitle: isAr ? 'تعديل وتخصيص استراتيجية التداول' : 'Edit & Refine Trading Strategy',
    editorCreateTitle: isAr ? 'إنشاء وتصميم استراتيجية تداول مخصصة' : 'Create & Design Custom Trading Strategy',
    editorDesc: isAr ? 'حدد المعايير الرياضية الدقيقة والشروط المتطابقة' : 'Set precise rule thresholds and indicator mathematical properties',
    closeBtn: isAr ? 'إغلاق' : 'Close',
    stratName: isAr ? 'اسم الاستراتيجية' : 'Strategy Name',
    stratNamePlaceholder: isAr ? 'مثل: تقاطع RSI واختراق دعم الفركتل' : 'e.g., RSI Oversold & SMA Cross',
    stratDesc: isAr ? 'تفاصيل أو وصف مختصر' : 'Brief Description',
    stratDescPlaceholder: isAr ? 'وصف مبسط لأهداف أو شروط الاستراتيجية' : 'Summary of what rules this strategy checks',
    logicOperatorMode: isAr ? 'نمط الدمج المنطقي (Logic Operator)' : 'Rule Combination Logic',
    addNewRuleTitle: isAr ? 'أضف شرطاً فنياً جديداً' : 'Add New Technical Crossover Rule',
    selectIndicator: isAr ? 'اختر المؤشر الفني' : 'Technical Indicator Source',
    absoluteCondition: isAr ? 'الشرط المطلق' : 'Activation Condition',
    indicatorRsi: isAr ? 'مؤشر القوة النسبية (RSI)' : 'Relative Strength Index (RSI)',
    indicatorMacd: isAr ? 'مؤشر التقارب والتباعد (MACD)' : 'MACD (Trend Momentum)',
    indicatorMaCross: isAr ? 'تقاطع المتوسطات المتحركة (MA Cross)' : 'MA Crossover (SMA vs EMA)',
    indicatorPriceMa: isAr ? 'تفاعل السعر مع المتوسط المتحرك' : 'Price vs Moving Average',
    indicatorFractal: isAr ? 'مؤشر الفركتلات (Fractals)' : 'Williams Fractals (Highs/Lows)',
    indicatorBb: isAr ? 'حواجز بولينجر (Bollinger Bands)' : 'Bollinger Bands (Volatility Limit)',
    indicatorPeriod: isAr ? 'الفترة (Period)' : 'Period',
    indicatorLevel: isAr ? 'المستوى' : 'Threshold Level',
    maFast: isAr ? 'السريع (MA 1)' : 'Fast (MA 1)',
    maSlow: isAr ? 'البطيء (MA 2)' : 'Slow (MA 2)',
    maTypeLabel: isAr ? 'نوع المتوسط' : 'MA Type',
    fractalPeriod: isAr ? 'فترة الفركتل (عادة 2)' : 'Fractal Period (standard is 2)',
    bbPeriod: isAr ? 'دورة البولينجر' : 'Bollinger Period',
    macdDefaults: isAr 
      ? 'معلمات الماكد الافتراضية الذكية: (Fast: 12, Slow: 26, Signal: 9)'
      : 'Smart standard MACD properties applied: (Fast: 12, Slow: 26, Signal: 9)',
    addRuleBtn: isAr ? 'إدراج الشرط للائحة' : 'Insert condition into list',
    rulesListHeading: isAr ? 'شروط الاستراتيجية الحالية' : 'Current Configured Strategy Rules',
    noRulesInList: isAr ? 'لم تقم بإضافة أي شروط فنية بعد.' : 'No technical rules designed yet.',
    noRulesHint: isAr 
      ? 'يرجى صياغة شرط في الأعلى والضغط على زر "إدراج الشرط للائحة".'
      : 'Configure a condition above then click "Insert condition into list".',
    cancel: isAr ? 'إلغاء وتراجع' : 'Discard & Cancel',
    saveBtnEditPost: isAr ? 'حفظ التعديلات وعود مالي' : 'Save Strategy Changes',
    saveBtnCreatePost: isAr ? 'تخزين وحفظ الاستراتيجية الجديدة' : 'Store & Execute New Strategy'
  };

  // --- States ---
  const [activeTab, setActiveTab] = useState<'strategies' | 'dictionary'>('strategies');
  const [indicatorSearchQuery, setIndicatorSearchQuery] = useState('');
  const [dictionarySubTab, setDictionarySubTab] = useState<'templates' | 'indicators'>('templates');

  // Search dropdown states inside Strategy builder
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');

  const FACTORY_INDICATOR_DEFAULTS = {
    rsi: { param1: 14, value: 30 },
    macd: { param1: 12, param2: 26 },
    ma_cross: { param1: 20, param2: 50, maType1: 'sma', maType2: 'ema' },
    price_ma: { param1: 50, maType1: 'sma' },
    fractal: { param1: 2 },
    bb: { param1: 20 },
    adx: { param1: 14, value: 25 },
    atr: { param1: 14, value: 1.5 },
    cci: { param1: 20, value: 100 },
    stoch: { param1: 14, value: 80 },
    stoch_rsi: { param1: 14, value: 80 },
    supertrend: { param1: 10, param2: 3 },
    vwap: {},
    obv: {},
    mfi: { param1: 14, value: 80 },
    roc: { param1: 9 },
    williams_r: { param1: 14, value: -80 },
    awesome: {},
    volume: {},
    ema: { param1: 20 },
    sma: { param1: 20 }
  };

  const [indicatorConfigs, setIndicatorConfigs] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('pro_trader_indicator_custom_defaults_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse custom indicator defaults', e);
      }
    }
    return FACTORY_INDICATOR_DEFAULTS;
  });

  const saveIndicatorConfigs = (updated: Record<string, any>) => {
    setIndicatorConfigs(updated);
    localStorage.setItem('pro_trader_indicator_custom_defaults_v1', JSON.stringify(updated));
  };

  const handleUpdateIndicatorConfigField = (indicatorId: string, fieldKey: string, val: any) => {
    const updated = {
      ...indicatorConfigs,
      [indicatorId]: {
        ...(indicatorConfigs[indicatorId] || {}),
        [fieldKey]: val
      }
    };
    saveIndicatorConfigs(updated);

    // Sync with App's indicatorParams to update both TradingView and Gemini capture!
    if (setIndicatorParams && indicatorParams) {
      if (['sma', 'ema', 'rsi', 'macd', 'adx'].includes(indicatorId)) {
        if (indicatorId === 'macd') {
          setIndicatorParams({
            ...indicatorParams,
            macd: {
              ...indicatorParams.macd,
              [fieldKey === 'param1' ? 'fast' : fieldKey === 'param2' ? 'slow' : fieldKey]: val
            }
          });
        } else {
          setIndicatorParams({
            ...indicatorParams,
            [indicatorId]: {
              ...indicatorParams[indicatorId],
              period: val
            }
          });
        }
      }
    }
  };

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  const isIndicatorShownOnChart = (indId: string): boolean => {
    if (['sma', 'ema', 'rsi', 'macd', 'adx', 'fractal'].includes(indId)) {
      return !!indicators?.[indId as keyof typeof indicators];
    }
    const mapping: Record<string, string> = {
      bb: 'BB@tv-basicstudies',
      stoch_rsi: 'StochasticRSI@tv-basicstudies',
      cci: 'CCI@tv-basicstudies',
      ichimoku: 'IchimokuCloud@tv-basicstudies',
      supertrend: 'SuperTrend@tv-basicstudies',
      psar: 'ParabolicSAR@tv-basicstudies',
      volume: 'Volume@tv-basicstudies',
    };
    const tvId = mapping[indId];
    return tvId ? !!customStudies?.includes(tvId) : false;
  };

  const handleToggleChartIndicator = (indId: string) => {
    if (['sma', 'ema', 'rsi', 'macd', 'adx', 'fractal'].includes(indId)) {
      if (setIndicators && indicators) {
        setIndicators({
          ...indicators,
          [indId]: !indicators[indId as keyof typeof indicators]
        });
      }
    } else {
      const mapping: Record<string, string> = {
        bb: 'BB@tv-basicstudies',
        stoch_rsi: 'StochasticRSI@tv-basicstudies',
        cci: 'CCI@tv-basicstudies',
        ichimoku: 'IchimokuCloud@tv-basicstudies',
        supertrend: 'SuperTrend@tv-basicstudies',
        psar: 'ParabolicSAR@tv-basicstudies',
        volume: 'Volume@tv-basicstudies',
      };
      const tvId = mapping[indId];
      if (tvId && setCustomStudies && customStudies) {
        if (customStudies.includes(tvId)) {
          setCustomStudies(customStudies.filter(id => id !== tvId));
        } else {
          setCustomStudies([...customStudies, tvId]);
        }
      }
    }
  };

  const [strategies, setStrategies] = useState<CustomStrategy[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  
  // Strategy Editor Fields
  const [stratName, setStratName] = useState('');
  const [stratDesc, setStratDesc] = useState('');
  const [logicOperator, setLogicOperator] = useState<'and' | 'or'>('and');
  const [rules, setRules] = useState<RuleCondition[]>([]);
  
  // Local Temp State for adding single new rule
  const [selectedIndicator, setSelectedIndicator] = useState<IndicatorType>('rsi');
  const [selectedCondition, setSelectedCondition] = useState('above');
  const [ruleValue, setRuleValue] = useState<number>(50);
  const [param1, setParam1] = useState<number>(14);
  const [param2, setParam2] = useState<number>(50);
  const [maType1, setMaType1] = useState<'sma' | 'ema'>('sma');
  const [maType2, setMaType2] = useState<'sma' | 'ema'>('ema');

  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // --- Real-time Trade Alert States & Synthesized Sound Helper ---
  const [lastAlertedKey, setLastAlertedKey] = useState<string>('');
  const [showTradeAlert, setShowTradeAlert] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('strategySoundEnabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [notificationPermissionState, setNotificationPermissionState] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermissionState(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermissionState(permission);
        if (permission === 'granted') {
          try {
            new Notification(
              isAr ? 'تم تفعيل إشعارات الاستراتيجيات!' : 'Strategy Trade Alerts Enabled!',
              {
                body: isAr 
                  ? 'ستتلقى إشعارات متصفح فورية عند اكتمال شروط أي استراتيجية فنية.' 
                  : 'You will receive immediate browser alerts when indicator requirements align.',
                icon: '/favicon.ico'
              }
            );
          } catch (e) {
            console.error('Failed to show permission test notification:', e);
          }
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    try {
      localStorage.setItem('strategySoundEnabled', String(nextVal));
    } catch (e) {
      console.error(e);
    }
  };

  const triggerTestTradeAlert = (testSignal: 'BUY' | 'SELL' = 'BUY') => {
    const testPrice = data.length > 0 ? data[data.length - 1].close : 63500;
    const testStrategyName = activeStrategy ? activeStrategy.name : (isAr ? 'ذهبية التقاطع البسيط' : 'SMA Golden Cross');
    
    // Play sound if enabled
    if (soundEnabled) {
      playAlertChime(testSignal);
    }

    // Standard HTML5 Browser/OS Notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const osTitle = testSignal === 'BUY'
          ? (isAr ? `🚨 إشارة شراء تجريبية لزوج ${symbol}` : `🚨 Test BUY Signal Detected - ${symbol}`)
          : (isAr ? `🚨 إشارة بيع تجريبية لزوج ${symbol}` : `🚨 Test SELL Signal Detected - ${symbol}`);
        const osBody = isAr
          ? `الاستراتيجية "${testStrategyName}" تطابقت بنسبة 100% على سعر ${testPrice.toFixed(2)}`
          : `Strategy "${testStrategyName}" rules fully aligned 100% at price ${testPrice.toFixed(2)}`;

        new Notification(osTitle, {
          body: osBody,
          icon: '/favicon.ico',
          tag: 'test-trade-alert'
        });
      } catch (e) {
        console.error('Failed to trigger OS notification', e);
      }
    }

    // Populate alert details & open the popup window
    const testAlert = {
      strategyName: testStrategyName,
      signal: testSignal,
      price: testPrice,
      time: Math.floor(Date.now() / 1000),
      rulesCount: activeStrategy ? activeStrategy.rules.length : 2,
      passedCount: activeStrategy ? activeStrategy.rules.length : 2,
      score: 1.0,
    };

    setTradeAlertData(testAlert);
    setShowTradeAlert(true);

    // Toast also
    const msg = testSignal === 'BUY'
      ? (isAr ? `🚨 تجربة: إشعار شراء محتمل للاستراتيجية "${testStrategyName}"` : `🚨 Test: Potential BUY signal formed for "${testStrategyName}"`)
      : (isAr ? `🚨 تجربة: إشعار بيع محتمل للاستراتيجية "${testStrategyName}"` : `🚨 Test: Potential SELL signal formed for "${testStrategyName}"`);
    triggerNotification(msg, 'success');
  };

  const [tradeAlertData, setTradeAlertData] = useState<{
    strategyName: string;
    signal: 'BUY' | 'SELL';
    price: number;
    time: string | number;
    rulesCount: number;
    passedCount: number;
    score: number;
  } | null>(null);

  const playAlertChime = (type: 'BUY' | 'SELL') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const now = ctx.currentTime;
      
      if (type === 'BUY') {
        // Ascending pleasant major chord dings
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now); // C5
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gain2.gain.setValueAtTime(0.12, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.45);

        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain3.gain.setValueAtTime(0.18, now + 0.2);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc3.connect(gain3);
        gain3.connect(ctx.destination);
        osc3.start(now + 0.2);
        osc3.stop(now + 0.6);
      } else {
        // Caution pitch drop warn chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(440.00, now); // A4
        osc1.frequency.exponentialRampToValueAtTime(329.63, now + 0.32); // E4
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(329.63, now + 0.12); // E4
        gain2.gain.setValueAtTime(0.15, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.62);
      }
    } catch (error) {
      console.warn('Audio synthesis failed:', error);
    }
  };

  // --- Initialize Strategies ---
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_STRATEGIES_KEY);
    const defaults = generateDefaultStrategies(language);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          // Translate default strategies in place if language changes
          const updated = parsed.map((s: CustomStrategy) => {
            const freshDef = defaults.find(d => d.id === s.id);
            if (freshDef) {
              return {
                ...s,
                name: freshDef.name,
                description: freshDef.description,
                isDefault: true,
                rules: freshDef.rules // Keep rules synchronized for default templates
              };
            }
            return s;
          });
          
          // Append any newly added default strategies that the user doesn't have in local storage
          const missingDefaults = defaults.filter(def => !parsed.some((s: any) => s.id === def.id));
          const finalStrategies = [...updated, ...missingDefaults];
          
          setStrategies(finalStrategies);
          localStorage.setItem(LOCAL_STORAGE_STRATEGIES_KEY, JSON.stringify(finalStrategies));
          return;
        }
      } catch (e) {
        console.error('Failed to parse saved strategies', e);
      }
    }
    setStrategies(defaults);
    localStorage.setItem(LOCAL_STORAGE_STRATEGIES_KEY, JSON.stringify(defaults));
  }, [language]);

  // --- Save custom strategies in localStorage when changed ---
  const saveStrategiesToStorage = (updatedList: CustomStrategy[]) => {
    setStrategies(updatedList);
    localStorage.setItem(LOCAL_STORAGE_STRATEGIES_KEY, JSON.stringify(updatedList));
  };

  const handleRestoreDefaultStrategies = () => {
    const defaults = generateDefaultStrategies(language);
    setStrategies(defaults);
    localStorage.setItem(LOCAL_STORAGE_STRATEGIES_KEY, JSON.stringify(defaults));
    setActiveStrategyId(defaults[0]?.id || null);
    triggerNotification(
      isAr 
        ? 'تم استعادة الاستراتيجيات الافتراضية وقوالب العمل بنجاح.' 
        : 'Default strategies restored successfully.'
    );
  };

  // Trigger notification toast helper
  const triggerNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Update conditions based on selected indicator in editor ---
  useEffect(() => {
    const config = indicatorConfigs[selectedIndicator] || {};
    
    // Determine dynamic default condition
    let defaultCond = 'above';
    if (selectedIndicator === 'rsi') defaultCond = 'below';
    else if (selectedIndicator === 'macd') defaultCond = 'bullish_cross';
    else if (selectedIndicator === 'ma_cross') defaultCond = 'fast_cross_above';
    else if (selectedIndicator === 'price_ma') defaultCond = 'price_above_ma';
    else if (selectedIndicator === 'fractal') defaultCond = 'bullish_breakout';
    else if (selectedIndicator === 'bb') defaultCond = 'price_below_lower';
    else if (['stoch', 'stoch_rsi'].includes(selectedIndicator)) defaultCond = 'k_cross_above_d';
    else if (selectedIndicator === 'supertrend') defaultCond = 'bullish';
    else if (selectedIndicator === 'vwap') defaultCond = 'price_above_vwap';
    else if (selectedIndicator === 'obv') defaultCond = 'rising';
    else if (['roc', 'awesome'].includes(selectedIndicator)) defaultCond = 'above_zero';
    else if (selectedIndicator === 'volume') defaultCond = 'above_average';
    
    setSelectedCondition(defaultCond);

    // Sync state parameters from local defaults config or saved configurations
    if (selectedIndicator === 'rsi') {
      setRuleValue(config.value ?? 30);
      setParam1(config.param1 ?? 14);
    } else if (selectedIndicator === 'macd') {
      setParam1(config.param1 ?? 12);
      setParam2(config.param2 ?? 26);
    } else if (selectedIndicator === 'ma_cross') {
      setParam1(config.param1 ?? 20);
      setParam2(config.param2 ?? 50);
      setMaType1(config.maType1 ?? 'sma');
      setMaType2(config.maType2 ?? 'ema');
    } else if (selectedIndicator === 'price_ma') {
      setParam1(config.param1 ?? 50);
      setMaType1(config.maType1 ?? 'sma');
    } else if (selectedIndicator === 'fractal') {
      setParam1(config.param1 ?? 2);
    } else if (selectedIndicator === 'bb') {
      setParam1(config.param1 ?? 20);
    } else if (['adx', 'atr', 'cci', 'mfi', 'roc', 'williams_r', 'stoch', 'stoch_rsi'].includes(selectedIndicator)) {
      setParam1(config.param1 ?? (selectedIndicator === 'cci' ? 20 : selectedIndicator === 'roc' ? 9 : 14));
      setRuleValue(config.value ?? (selectedIndicator === 'williams_r' ? -80 : selectedIndicator === 'adx' ? 25 : selectedIndicator === 'atr' ? 1.5 : selectedIndicator === 'cci' ? 100 : 80));
    } else if (selectedIndicator === 'supertrend') {
      setParam1(config.param1 ?? 10);
      setParam2(config.param2 ?? 3);
    } else if (['ema', 'sma'].includes(selectedIndicator)) {
      setParam1(config.param1 ?? 20);
    }
  }, [selectedIndicator, indicatorConfigs]);

  // --- Retrieve currently active strategy ---
  const activeStrategy = useMemo(() => {
    return strategies.find(s => s.id === activeStrategyId) || null;
  }, [strategies, activeStrategyId]);

  // --- Calculate Evaluation Signal for the dashboard ---
  const strategyEvaluation = useMemo(() => {
    if (!activeStrategy || data.length === 0) return null;
    return evaluateStrategy(activeStrategy, data);
  }, [activeStrategy, data]);

  // --- Calculate Sentiment Index (0 to 100) from Signal Strength & Direction ---
  const sentimentIndex = useMemo(() => {
    if (!strategyEvaluation) return 50;
    const { signal, score } = strategyEvaluation;
    if (signal === 'BUY') {
      return Math.round(50 + (score * 50));
    }
    if (signal === 'SELL') {
      return Math.round(50 - (score * 50));
    }
    return 50;
  }, [strategyEvaluation]);

  // Push strategy instruction updates back to App level custom prompt
  useEffect(() => {
    if (activeStrategy) {
      const ruleTexts = activeStrategy.rules.map((r, i) => `${i + 1}. ${translateRuleToText(r, language)}`).join('\n');
      const instructions = language === 'en'
        ? `You MUST analyze the chart based on the rules of the current active strategy: "${activeStrategy.name}"
Strategy details:
- Description: ${activeStrategy.description}
- Logical Combination: ${activeStrategy.logicOperator === 'and' ? 'Match All Conditions (AND)' : 'Match Any Condition (OR)'}
- Configured Mathematical Rules:
${ruleTexts}

Please focus the Technical Analysis report on verifying these specific parameters and their current market completeness or price correspondence status.`
        : `يجب تحليل الشارت بناءً على قواعد الاستراتيجية النشطة الحالية: "${activeStrategy.name}"
تفاصيل الاستراتيجية:
- الوصف: ${activeStrategy.description}
- نمط الدمج المنطقي: ${activeStrategy.logicOperator === 'and' ? 'تطابق جميع الشروط (AND)' : 'تحقق أي من الشروط (OR)'}
- الشروط المحددة والمستهدفة رياضياً:
${ruleTexts}

الرجاء التركيز في تقرير التحليل الفني على فحص ورصد هذه النقاط الفنية بدقة والتحقق من مدى اكتمالها في السوق حالياً ومطابقتها السعرية.`;
      onStrategyChange(instructions);
    } else {
      onStrategyChange('');
    }
  }, [activeStrategy, onStrategyChange, language]);

  // --- Real-time Potential Trade Alert Monitoring ---
  useEffect(() => {
    if (!activeStrategy || !strategyEvaluation || data.length === 0) return;
    
    const currentSignal = strategyEvaluation.signal;
    if (currentSignal === 'NEUTRAL') return;

    const lastCandle = data[data.length - 1];
    const alertKey = `${activeStrategy.id}_${currentSignal}_${lastCandle.time}`;

    if (alertKey !== lastAlertedKey) {
      setLastAlertedKey(alertKey);
      
      const newAlert = {
        strategyName: activeStrategy.name,
        signal: currentSignal,
        price: lastCandle.close,
        time: lastCandle.time,
        rulesCount: activeStrategy.rules.length,
        passedCount: strategyEvaluation.detailedResults.filter(r => r.isPassed).length,
        score: strategyEvaluation.score,
      };
      
      setTradeAlertData(newAlert);
      setShowTradeAlert(true);
      
      // Play Synthesized sound
      if (soundEnabled) {
        playAlertChime(currentSignal);
      }
      
      const alertMsgAr = currentSignal === 'BUY'
        ? `🚨 فرصة شراء محتملة! الاستراتيجية "${activeStrategy.name}" على سعر ${lastCandle.close.toFixed(2)}`
        : `🚨 فرصة بيع محتملة! الاستراتيجية "${activeStrategy.name}" على سعر ${lastCandle.close.toFixed(2)}`;
      
      const alertMsgEn = currentSignal === 'BUY'
        ? `🚨 Potential BUY trade detected! Strategy "${activeStrategy.name}" at price ${lastCandle.close.toFixed(2)}`
        : `🚨 Potential SELL trade detected! Strategy "${activeStrategy.name}" at price ${lastCandle.close.toFixed(2)}`;
        
      // Trigger browser/OS level notification if granted
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const osTitle = currentSignal === 'BUY'
            ? (isAr ? `📈 إشارة شراء جديدة لزوج ${symbol}` : `📈 New BUY Signal Formed - ${symbol}`)
            : (isAr ? `📉 إشارة بيع جديدة لزوج ${symbol}` : `📉 New SELL Signal Formed - ${symbol}`);
          
          new Notification(osTitle, {
            body: isAr ? alertMsgAr : alertMsgEn,
            icon: '/favicon.ico',
            tag: `trade-alert-${lastCandle.time}`
          });
        } catch (e) {
          console.error('[Notification] failed to dispatch trade OS alert:', e);
        }
      }

      // Also show global UI Toast
      triggerNotification(isAr ? alertMsgAr : alertMsgEn, currentSignal === 'BUY' ? 'success' : 'error');
    }
  }, [activeStrategy, strategyEvaluation, data, lastAlertedKey, soundEnabled, isAr, symbol]);

  // --- Handler: Add or Edit rule in the active builder list ---
  const handleAddRule = () => {
    const targetId = editingRuleId || `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newRule: RuleCondition = {
      id: targetId,
      indicator: selectedIndicator,
      condition: selectedCondition,
      value: ['rsi', 'adx', 'atr', 'cci', 'stoch', 'stoch_rsi', 'mfi', 'williams_r', 'cmf', 'cmo'].includes(selectedIndicator) ? ruleValue : undefined,
      param1: ['rsi', 'macd', 'ma_cross', 'price_ma', 'fractal', 'bb', 'adx', 'atr', 'cci', 'stoch', 'stoch_rsi', 'supertrend', 'mfi', 'roc', 'williams_r', 'ema', 'sma', 'cmf', 'cmo'].includes(selectedIndicator) ? param1 : undefined,
      param2: ['macd', 'ma_cross', 'supertrend'].includes(selectedIndicator) ? param2 : undefined,
      maType1: ['ma_cross', 'price_ma'].includes(selectedIndicator) ? maType1 : undefined,
      maType2: selectedIndicator === 'ma_cross' ? maType2 : undefined,
    };

    if (editingRuleId) {
      setRules(rules.map(r => r.id === editingRuleId ? newRule : r));
      setEditingRuleId(null);
      triggerNotification(
        isAr ? 'تم تعديل وتحديث الشرط في الجدول بنجاح.' : 'Rule condition updated successfully.'
      );
    } else {
      setRules([...rules, newRule]);
      triggerNotification(
        isAr ? 'تم إضافة الشرط لجدول الاستراتيجية بنجاح.' : 'Rule condition added successfully.'
      );
    }
  };

  const handleEditRuleClick = (rl: RuleCondition) => {
    setEditingRuleId(rl.id);
    setSelectedIndicator(rl.indicator);
    setSelectedCondition(rl.condition);
    if (rl.value !== undefined) setRuleValue(rl.value);
    if (rl.param1 !== undefined) setParam1(rl.param1);
    if (rl.param2 !== undefined) setParam2(rl.param2);
    if (rl.maType1) setMaType1(rl.maType1);
    if (rl.maType2) setMaType2(rl.maType2);
    
    triggerNotification(
      isAr 
        ? 'تم تحميل المعايير في لوحة الإدخال للتعديل.' 
        : 'Rule criteria loaded into input panel for modifications.'
    );
  };

  // --- Handler: Remove rule from active builder list ---
  const handleRemoveRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
    if (editingRuleId === id) {
      setEditingRuleId(null);
    }
  };

  // --- Handler: Save strategy object ---
  const handleSaveStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stratName.trim()) {
      triggerNotification(
        isAr ? 'يرجى تحديد اسم مناسب للاستراتيجية.' : 'Please enter a valid strategy name.', 
        'error'
      );
      return;
    }
    if (rules.length === 0) {
      triggerNotification(
        isAr ? 'يرجى إضافة شرط واحد على الأقل للاستراتيجية.' : 'Please add at least one condition first.', 
        'error'
      );
      return;
    }

    const newStrategy: CustomStrategy = {
      id: isEditingId || `strat-${Date.now()}`,
      name: stratName.trim(),
      description: stratDesc.trim() || (isAr ? 'استراتيجية تداول مخصصة تم صياغتها بواسطة صانع الاستراتيجيات.' : 'Custom trading strategy formulated with Strategy Builder.'),
      rules: [...rules],
      logicOperator,
      isDefault: false
    };

    let updatedList;
    if (isEditingId) {
      updatedList = strategies.map(s => s.id === isEditingId ? newStrategy : s);
      triggerNotification(
        isAr ? 'تم تحديث الاستراتيجية وحفظ التعديلات.' : 'Strategy updated successfully.'
      );
    } else {
      updatedList = [...strategies, newStrategy];
      triggerNotification(
        isAr ? 'تم إنشاء وحفظ الاستراتيجية بنجاح!' : 'Strategy created and saved successfully!'
      );
    }

    saveStrategiesToStorage(updatedList);
    setActiveStrategyId(newStrategy.id); // auto-apply
    
    // Reset form states
    setShowEditor(false);
    setIsEditingId(null);
    setStratName('');
    setStratDesc('');
    setRules([]);
  };

  // --- Handler: Copy Predefined Pro Strategy with One-Click ---
  const handleCopyPredefinedTemplate = (template: PredefinedTemplate) => {
    // Generate a unique ID so we don't have collisions
    const newId = `template-${template.id}-${Date.now()}`;
    
    // Construct rules with dynamic ids
    const clonedRules: RuleCondition[] = template.rules.map((rule, index) => ({
      ...rule,
      id: `rule-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`
    })) as RuleCondition[];

    const newStrategy: CustomStrategy = {
      id: newId,
      name: isAr ? template.nameAr : template.nameEn,
      description: isAr ? template.descAr : template.descEn,
      rules: clonedRules,
      logicOperator: template.logicOperator,
      isDefault: false
    };

    const updated = [...strategies, newStrategy];
    saveStrategiesToStorage(updated);
    setActiveStrategyId(newId);
    
    // Play sound if enabled
    if (soundEnabled) {
      playAlertChime('BUY');
    }
    
    triggerNotification(
      isAr 
        ? `تم نسخ استراتيجية "${template.nameAr}" الاحترافية وتفعيلها فوراً في لائحة التقييم!`
        : `Successfully copied "${template.nameEn}" and activated it in the list!`
    );
    
    // Smooth transition back to strategies view
    setActiveTab('strategies');
  };

  // --- Handler: Edit existing strategy ---
  const handleEditStrategyClick = (s: CustomStrategy) => {
    setIsEditingId(s.id);
    setStratName(s.name);
    setStratDesc(s.description);
    setLogicOperator(s.logicOperator);
    setRules([...s.rules]);
    setShowEditor(true);
  };

  // --- Handler: Delete custom strategy ---
  const handleDeleteStrategyClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent select action
    const target = strategies.find(s => s.id === id);
    if (!target) return;

    const updated = strategies.filter(s => s.id !== id);
    saveStrategiesToStorage(updated);
    
    // If the active strategy is deleted, switch back to another strategy or null
    if (activeStrategyId === id) {
      setActiveStrategyId(updated[0]?.id || null);
    }

    triggerNotification(
      isAr ? 'تم حذف الاستراتيجية بنجاح.' : 'Strategy deleted successfully.'
    );
  };

  return (
    <div className={`space-y-6 ${isAr ? 'dir-rtl text-right' : 'dir-ltr text-left'}`} dir={isAr ? 'rtl' : 'ltr'} id="trading-strategy-suite-card">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border text-sm font-bold ${
              notification.type === 'error'
                ? 'bg-[#ef5350]/20 border-[#ef5350]/30 text-red-400'
                : 'bg-[#26a69a]/20 border-[#26a69a]/30 text-emerald-400'
            }`}
          >
            {notification.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{notification.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Potential Trade Alert Modal */}
      <AnimatePresence>
        {showTradeAlert && tradeAlertData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.25 }}
              className={`w-full max-w-lg bg-[#1e222d] border ${
                tradeAlertData.signal === 'BUY' ? 'border-emerald-500/40 shadow-[0_0_40px_rgba(16,185,129,0.15)]' : 'border-rose-500/40 shadow-[0_0_40px_rgba(239,83,80,0.15)]'
              } rounded-2xl overflow-hidden relative`}
            >
              {/* Top visual glow bar */}
              <div className={`h-1.5 w-full ${tradeAlertData.signal === 'BUY' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-red-400'}`} />
              
              {/* Subtle geometric neon background shapes */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="p-6">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl flex items-center justify-center ${
                      tradeAlertData.signal === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    } animate-bounce`}>
                      <Bell size={24} className="animate-pulse" />
                    </div>
                    <div className={isAr ? 'text-right' : 'text-left'}>
                      <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase font-mono">
                        {isAr ? 'تنبيه صفقة فوري من المحرك' : 'REAL-TIME TRADE SIGNAL'}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">
                        {isAr ? 'تغير إشارة السوق بنجاح!' : 'New Market Signal Formed'}
                      </h3>
                    </div>
                  </div>
                  
                  {/* Close/Mute toolbar */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`p-2 rounded-lg border transition-all ${
                        soundEnabled 
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' 
                          : 'bg-gray-800 border-white/5 text-gray-500 hover:text-white'
                      }`}
                      title={isAr ? (soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت') : (soundEnabled ? 'Mute Sound' : 'Enable Sound')}
                    >
                      {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTradeAlert(false)}
                      className="p-2 rounded-lg bg-gray-800 border border-white/5 text-gray-400 hover:text-white transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Active Highlight Panel (Signal Card) */}
                <div className={`p-5 rounded-xl border mb-5 flex flex-col items-center text-center justify-center relative overflow-hidden ${
                  tradeAlertData.signal === 'BUY' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'
                }`}>
                  <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1">
                    {isAr ? 'الاستراتيجية النشطة حالياً' : 'Active Strategy Context'}
                  </span>
                  <span className="text-sm font-black text-white px-3 py-1 bg-black/40 rounded-lg border border-white/5 mb-3">
                    {tradeAlertData.strategyName}
                  </span>

                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className={`text-2xl font-black py-2 px-6 rounded-2xl border flex items-center gap-3 shadow-lg ${
                      tradeAlertData.signal === 'BUY' 
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_20px_rgba(239,83,80,0.2)]'
                    }`}
                  >
                    <TrendingUp size={22} className={tradeAlertData.signal === 'SELL' ? 'rotate-180' : ''} />
                    {tradeAlertData.signal === 'BUY' ? (isAr ? 'شراء محتملة (BUY)' : 'POTENTIAL BUY') : (isAr ? 'بيع محتملة (SELL)' : 'POTENTIAL SELL')}
                  </motion.div>

                  {/* Quick Metrics */}
                  <div className="grid grid-cols-2 gap-4 w-full mt-4 pt-4 border-t border-white/5 text-[11px] font-mono">
                    <div className="text-center">
                      <span className="text-gray-400 block mb-0.5">{isAr ? 'سعر الإغلاق الأخير:' : 'Live Execution Close:'}</span>
                      <span className="text-white font-bold text-xs">{tradeAlertData.price.toFixed(2)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-400 block mb-0.5">{isAr ? 'معدل تطابق الشروط:' : 'Matching Criteria Rate:'}</span>
                      <span className={`font-bold text-xs ${tradeAlertData.score === 1 ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {tradeAlertData.passedCount}/{tradeAlertData.rulesCount} ({(tradeAlertData.score * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action guidance notice */}
                <p className={`text-[11.5px] leading-relaxed text-gray-400 mb-5 ${isAr ? 'text-right' : 'text-left'}`}>
                  {isAr 
                    ? 'تطابقت المؤشرات الفنية المبرمجة مع السعر الحالي لتوليد هذه الإشارة الفورية. انقر على الزر أدناه للانتقال السريع للرسم البياني وتوليد تقرير تحليل فني مالي تفصيلي بذكاء اصطناعي فائق لتأكيد القوة ودقة الدخول.'
                    : 'All programmed mathematical indicators have aligned with the latest market candle to trigger this strategic signal. Click the button below to return to the interactive chart and trigger a comprehensive expert AI technical analysis report.'}
                </p>

                {/* Buttons Row */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTradeAlert(false);
                      if (onNavigateToChart) {
                        onNavigateToChart();
                      }
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 border text-black hover:brightness-110 cursor-pointer ${
                      tradeAlertData.signal === 'BUY' 
                        ? 'bg-gradient-to-r from-emerald-500 to-green-400 border-emerald-400 shadow-emerald-500/10' 
                        : 'bg-gradient-to-r from-rose-500 to-red-400 border-rose-400 shadow-rose-500/10'
                    }`}
                  >
                    <Sparkles size={14} />
                    {isAr ? 'الانتقال للرسم البياني والبدء بالتحليل الخبير' : 'Go to Interactive Chart for AI Analysis'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTradeAlert(false)}
                    className="px-4 py-3 rounded-xl bg-gray-800 border border-white/5 text-gray-300 font-bold hover:bg-gray-750 hover:text-white text-xs transition-all cursor-pointer"
                  >
                    {isAr ? 'إغلاق ومراقبة بصمت' : 'Dismiss / Keep Monitoring'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Segmented Tab Switcher */}
      <div className="flex border-b border-[#2a2e39]/50 gap-4 md:gap-6 pb-px justify-start">
        <button
          type="button"
          onClick={() => setActiveTab('strategies')}
          className={`pb-3 text-xs font-black transition-all relative ${
            activeTab === 'strategies' ? 'text-blue-400' : 'text-gray-500 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Layers size={14} />
            {isAr ? 'لوحة تقييم وصناعة الاستراتيجيات' : 'Strategy Evaluation & Maker'}
          </span>
          {activeTab === 'strategies' && (
            <motion.div layoutId="active-suite-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('dictionary')}
          className={`pb-3 text-xs font-black transition-all relative ${
            activeTab === 'dictionary' ? 'text-blue-400' : 'text-gray-500 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Activity size={14} />
            {isAr ? 'مستودع المؤشرات وحفظ النسب' : 'Indicators Catalog & Presets'}
          </span>
          {activeTab === 'dictionary' && (
            <motion.div layoutId="active-suite-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      </div>

      {activeTab === 'strategies' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: List of saved Strategies */}
        <div className="bg-[#1e222d] rounded-2xl p-6 border border-[#2a2e39] shadow-2xl relative overflow-hidden lg:col-span-1">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-400">
                <Layers size={18} />
              </div>
              <div className={isAr ? 'text-right' : 'text-left'}>
                <h3 className="font-bold text-white text-sm">{text.myStrategies}</h3>
                <p className="text-[10px] text-gray-400">{text.subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRestoreDefaultStrategies}
                className="p-1.5 px-2.5 bg-black/40 hover:bg-black/60 border border-[#2a2e39]/80 hover:border-gray-650/80 text-gray-400 hover:text-white text-[10px] font-bold rounded-xl transition-all flex items-center gap-1 shadow-md"
                title={isAr ? 'استعادة الاستراتيجيات الافتراضية' : 'Restore Default Templates'}
              >
                <RotateCcw size={10} />
                <span>{isAr ? 'الافتراضي' : 'Defaults'}</span>
              </button>

              <button
                onClick={() => {
                  setIsEditingId(null);
                  setStratName('');
                  setStratDesc('');
                  setRules([]);
                  setEditingRuleId(null);
                  setShowEditor(true);
                }}
                className="p-1 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-blue-600/15"
              >
                <Plus size={14} />
                {text.newBtn}
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
            <AnimatePresence mode="popLayout">
              {strategies.map((strat) => {
                const isActive = activeStrategyId === strat.id;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    whileHover={{ 
                      scale: 1.015, 
                      y: -2,
                      boxShadow: isActive 
                        ? "0 8px 24px rgba(37,99,235,0.12)" 
                        : "0 8px 24px rgba(0,0,0,0.3)",
                      borderColor: isActive 
                        ? "rgba(59,130,246,0.6)" 
                        : "rgba(100,116,139,0.5)"
                    }}
                    whileTap={{ scale: 0.992 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    key={strat.id}
                    onClick={() => setActiveStrategyId(strat.id)}
                    className={`p-4 rounded-xl border transition-colors duration-250 cursor-pointer relative group ${
                      isAr ? 'text-right' : 'text-left'
                    } ${
                      isActive 
                        ? 'bg-blue-600/10 border-blue-500/30 text-white shadow-[0_4px_16px_rgba(37,99,235,0.06)]' 
                        : 'bg-black/20 border-[#2a2e39]/50 hover:bg-black/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="font-bold text-xs truncate max-w-[150px]">{strat.name}</span>
                      
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        {strat.isDefault && (
                          <span className="text-[8px] bg-blue-600/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-black uppercase flex-shrink-0">{isAr ? 'قالب' : 'Template'}</span>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditStrategyClick(strat); }}
                          className="text-gray-400 hover:text-blue-400 transition-colors tooltip p-1"
                          title={text.editStrategy}
                        >
                          <Settings size={12} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteStrategyClick(strat.id, e); }}
                          className="text-gray-400 hover:text-red-400 transition-colors p-1"
                          title={text.deleteStrategy}
                        >
                          <Trash size={12} />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed mb-3 pr-0.5">{strat.description}</p>
                    
                    <div className="flex items-center justify-between mt-auto text-[9px] text-gray-400 font-mono">
                      <span className="bg-black/30 px-2 py-0.5 rounded border border-[#2a2e39]/30 font-bold uppercase">
                        {text.rulesLabel}: {strat.rules.length}
                      </span>
                      <span className="opacity-80">
                        {text.logicOperatorLabel}: {strat.logicOperator === 'and' ? text.logicAndLabel : text.logicOrLabel}
                      </span>
                    </div>

                    {isActive && (
                      <motion.div 
                        layoutId="active-strategy-glow" 
                        className={`absolute inset-y-0 ${isAr ? 'right-0 rounded-r-xl' : 'left-0 rounded-l-xl'} w-1 bg-blue-500`} 
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {strategies.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-xs">{text.noCustomStrategies}</p>
                <p className="text-[10px] mt-1">{text.makeFirstStrategy}</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Live Engine Stats / Report on Active Strategy */}
        <div className="bg-[#1e222d] rounded-2xl p-6 border border-[#2a2e39] lg:col-span-2 flex flex-col justify-between shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#2a2e39]/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-600/10 rounded-2xl border border-indigo-500/20 text-indigo-400 animate-pulse">
                  <Activity size={18} />
                </div>
                <div className={isAr ? 'text-right' : 'text-left'}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{text.liveEngineTitle}</h3>
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-green-500/10 rounded border border-green-500/20">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                      <span className="text-[8px] text-green-400 font-bold uppercase">{text.liveBadge}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{text.liveEngineDesc}</p>
                </div>
              </div>

              {/* Visual Consensus Signal Display */}
              {activeStrategy && strategyEvaluation && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{text.currentSignal}</span>
                  <motion.div
                    key={strategyEvaluation.signal}
                    initial={{ scale: 0.82, opacity: 0, y: -4 }}
                    animate={{
                      scale: strategyEvaluation.signal !== 'NEUTRAL' ? [1, 1.05, 0.98, 1.02, 1] : 1,
                      opacity: 1,
                      y: 0,
                      backgroundColor: strategyEvaluation.signal === 'BUY'
                        ? 'rgba(16,185,129,0.14)'
                        : strategyEvaluation.signal === 'SELL'
                        ? 'rgba(239,83,80,0.14)'
                        : 'rgba(245,158,11,0.08)',
                      borderColor: strategyEvaluation.signal === 'BUY'
                        ? 'rgba(16,185,129,0.4)'
                        : strategyEvaluation.signal === 'SELL'
                        ? 'rgba(239,83,80,0.4)'
                        : 'rgba(245,158,11,0.25)',
                      boxShadow: strategyEvaluation.signal === 'BUY'
                        ? '0 0 18px rgba(16,185,129,0.3)'
                        : strategyEvaluation.signal === 'SELL'
                        ? '0 0 18px rgba(239,83,80,0.3)'
                        : '0 0 10px rgba(245,158,11,0.1)'
                    }}
                    whileHover={{ scale: 1.04, filter: 'brightness(1.15)' }}
                    transition={{
                      scale: { duration: 0.6, ease: "easeOut" },
                      opacity: { duration: 0.45 },
                      y: { duration: 0.4, ease: "easeOut" },
                      backgroundColor: { duration: 0.5 },
                      borderColor: { duration: 0.5 },
                      boxShadow: { duration: 0.5 }
                    }}
                    className={`px-4 py-1.5 rounded-xl border text-xs font-black tracking-widest uppercase flex items-center gap-2 cursor-default transition-all duration-300 ${
                      strategyEvaluation.signal === 'BUY' 
                        ? 'text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] md:animate-[pulse_2s_infinite]' 
                        : strategyEvaluation.signal === 'SELL' 
                        ? 'text-rose-400 shadow-[0_0_15px_rgba(239,83,80,0.15)] md:animate-[pulse_2s_infinite]' 
                        : 'text-yellow-500 border-yellow-500/20'
                    }`}
                  >
                    {strategyEvaluation.signal === 'BUY' && (
                      <>
                        <TrendingUp size={14} className="animate-bounce" />
                        <span>{text.signalBuy}</span>
                      </>
                    )}
                    {strategyEvaluation.signal === 'SELL' && (
                      <>
                        <TrendingUp size={14} className="rotate-180 animate-bounce" />
                        <span>{text.signalSell}</span>
                      </>
                    )}
                    {strategyEvaluation.signal === 'NEUTRAL' && (
                      <>
                        <HelpCircle size={14} className="animate-pulse" />
                        <span>{text.signalNeutral}</span>
                      </>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
 
            {/* Control Panel: Sound, Browser Permissions & Test Triggers */}
            <div className="mb-6 p-4 bg-[#131722] rounded-2xl border border-blue-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
              <div className="flex items-center gap-3">
                <div className={`p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 ${soundEnabled ? 'animate-pulse' : ''}`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">
                    {isAr ? 'مركز التحكم في تنبيهات الصفقات المحتملة واختبار المحاكاة' : 'Potential Trade Alerts & Signal Tester'}
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isAr 
                      ? 'تحقق من تفعيل جرس الصوت وإذن إشعارات المتصفح، واختبر شكل وصوت الإشارة الفورية فوراً' 
                      : 'Configure real-time sound chimes, check web notification settings, and mock trade signals instantly.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Browser Permission status */}
                <button
                  type="button"
                  onClick={requestNotificationPermission}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                    notificationPermissionState === 'granted'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : notificationPermissionState === 'denied'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/15 animate-[pulse_3s_infinite]'
                  }`}
                  title={isAr ? 'حالة إذن إشعارات المتصفح' : 'Browser Permission Status'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    notificationPermissionState === 'granted' ? 'bg-emerald-500' : notificationPermissionState === 'denied' ? 'bg-rose-500' : 'bg-yellow-500 animate-ping'
                  }`} />
                  <span>
                    {notificationPermissionState === 'granted' 
                      ? (isAr ? 'إشعارات المتصفح: نشطة' : 'Browser Alerts: Active') 
                      : notificationPermissionState === 'denied'
                      ? (isAr ? 'إشعارات المتصفح: مرفوضة' : 'Browser Alerts: Denied')
                      : (isAr ? 'تفعيل إشعارات المتصفح' : 'Enable Web Alerts')}
                  </span>
                </button>

                {/* Sound toggle button */}
                <button
                  type="button"
                  onClick={handleToggleSound}
                  className={`p-1.5 px-2.5 rounded-xl border transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5 ${
                    soundEnabled
                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                      : 'bg-black/20 border-white/5 text-gray-500 hover:text-white hover:bg-black/30'
                  }`}
                  title={isAr ? (soundEnabled ? 'كتم الصوت' : 'تفعيل الصوت') : (soundEnabled ? 'Mute Sound' : 'Enable Sound')}
                >
                  {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  <span>{soundEnabled ? (isAr ? 'الصوت مفعّل' : 'Audio ON') : (isAr ? 'الصوت مكتوم' : 'Audio MUTED')}</span>
                </button>

                {/* Buy Signal testing button */}
                <button
                  type="button"
                  onClick={() => triggerTestTradeAlert('BUY')}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-500/20 rounded-xl text-[10px] font-black tracking-wider transition-all flex items-center gap-1 shadow-md shadow-emerald-600/15 cursor-pointer"
                >
                  <TrendingUp size={11} />
                  <span>{isAr ? 'تجربة شراء فوري' : 'Test Potential BUY'}</span>
                </button>

                {/* Sell Signal testing button */}
                <button
                  type="button"
                  onClick={() => triggerTestTradeAlert('SELL')}
                  className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white border border-rose-500/20 rounded-xl text-[10px] font-black tracking-wider transition-all flex items-center gap-1 shadow-md shadow-rose-600/15 cursor-pointer"
                >
                  <TrendingUp size={11} className="rotate-180" />
                  <span>{isAr ? 'تجربة بيع فوري' : 'Test Potential SELL'}</span>
                </button>
              </div>
            </div>

            {activeStrategy ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-4">
                {/* Column 2a: Strategy Details & Configured Rules Info */}
                <div className="space-y-4">
                  <div className={`p-4 bg-black/40 rounded-xl border border-white/5 ${isAr ? 'text-right' : 'text-left'}`}>
                    <h4 className="font-bold text-white text-xs mb-1">{text.appliedStrategy} {activeStrategy.name}</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{activeStrategy.description}</p>
                    
                    {/* Dynamic Match rate progress bar */}
                    {strategyEvaluation && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>{text.requirementsMatchRate}</span>
                          <span className="font-mono font-bold text-blue-400">{(strategyEvaluation.score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${strategyEvaluation.score * 100}%` }}
                            className={`h-full rounded-full ${
                              strategyEvaluation.score === 1 
                                ? 'bg-gradient-to-r from-emerald-500 to-green-400' 
                                : strategyEvaluation.score > 0 
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-400' 
                                : 'bg-gray-600'
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Overall Market Sentiment Gauge Card representing sentiment calculated from signal strength */}
                  <div className={`p-4 bg-[#131722]/60 rounded-xl border border-white/5 space-y-4 ${isAr ? 'text-right' : 'text-left'}`}>
                    <div>
                      <h4 className="font-bold text-white text-xs mb-0.5">
                        {isAr ? 'مؤشر معنويات السوق الكلي' : 'Overall Market Sentiment'}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {isAr 
                          ? 'يقيس معنويات التداول وقوة الاتجاه الحالية بناءً على شروط وقواعد الاستراتيجية المفعلة' 
                          : 'Aggregated trading orientation and consensus strength based on active algorithm rules.'}
                      </p>
                    </div>

                    <SentimentGauge 
                      sentiment={sentimentIndex} 
                      signal={strategyEvaluation?.signal || 'NEUTRAL'} 
                      language={isAr ? 'ar' : 'en'} 
                    />
                  </div>

                  {/* Configured Rules list for side-by-side comparison */}
                  <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-[#2a2e39]/50">
                    <h5 className={`text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none ${isAr ? 'text-right' : 'text-left'}`}>
                      {isAr ? 'القواعد المبرمجة بالاستراتيجية' : 'Configured Strategy Parameters'}
                    </h5>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                      {activeStrategy.rules.map((rl, index) => (
                        <div key={rl.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl bg-black/40 border border-white/5 text-[11px] font-sans text-gray-300 ${isAr ? 'text-right' : 'text-left'}`}>
                          <span className="text-[9px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-black font-mono">#{index + 1}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-bold block text-white text-[10px] uppercase tracking-wide opacity-80 mb-0.5">
                              {isAr ? `الشرط الفني ${index + 1}` : `Technical Condition ${index + 1}`}
                            </span>
                            <span className="text-gray-400 text-[10.5px] font-mono leading-relaxed block break-all">
                              {translateRuleToText(rl, language)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2b: Evaluation Live Status & Checkpoints */}
                <div className="space-y-4">
                  {strategyEvaluation && (
                    <div className="space-y-3">
                      <h5 className={`text-[10px] font-black text-gray-500 uppercase tracking-widest pr-1 ${isAr ? 'text-right' : 'text-left'}`}>{text.rulesCheckpointTitle}</h5>
                      <div className="space-y-2.5 max-h-[410px] overflow-y-auto custom-scrollbar">
                        {strategyEvaluation.detailedResults.map((rl, index) => {
                          const targetRule = activeStrategy.rules.find(r => r.id === rl.ruleId);
                          return (
                            <div 
                              key={index} 
                              className={`p-3.5 rounded-xl border flex items-center justify-between font-mono gap-3 transition-all duration-300 hover:border-[#2a2e39] ${
                                rl.isPassed 
                                  ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.02)]' 
                                  : 'bg-black/20 border-[#2a2e39]/40'
                              }`}
                            >
                              <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className={`text-[10px] text-gray-400 font-sans truncate w-full ${isAr ? 'text-right' : 'text-left'}`}>
                                  {targetRule ? translateRuleToText(targetRule, language) : (isAr ? 'شرط مخصص' : 'Custom condition')}
                                </span>
                                <span className={`text-[10.5px] text-gray-300 font-semibold truncate w-full mt-1 ${isAr ? 'text-right' : 'text-left'}`}>
                                  {rl.ruleDescription || (isAr ? 'الشرط لم يتحقق بعد في الشمعة الأخيرة' : 'Condition not met yet in current candle')}
                                </span>
                              </div>

                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  rl.isPassed
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                                    : 'bg-gray-800 text-gray-500'
                                }`}>
                                  {rl.currentValueText}
                                </span>
                                
                                <div className="flex items-center gap-1">
                                  {rl.isPassed ? (
                                    <div className="p-0.5 bg-emerald-500 text-black rounded-full shadow-[0_0_10px_rgba(16,185,129,0.45)]" title={isAr ? 'متحقق' : 'Passed'}>
                                      <Check size={8} strokeWidth={4} />
                                    </div>
                                  ) : (
                                    <div className="p-0.5 bg-gray-800 text-gray-500 rounded-full border border-gray-750" title={isAr ? 'غير متطابق' : 'Unmatched'}>
                                      <X size={8} strokeWidth={4} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center gap-3">
                <AlertCircle className="text-gray-600 animate-bounce" size={28} />
                <div>
                  <h4 className="font-bold text-white text-xs">{text.noActiveStrategy}</h4>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-sm">
                    {text.selectStrategyHint}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 border-t border-[#2a2e39]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-blue-500" />
              {text.aiNotice}
            </span>
            <span className="font-mono">{text.databaseLabel} Binance Gold {data.length > 0 ? `${data.length} ${text.candlesCount}` : text.noData}</span>
          </div>

        </div>

      </div>
      )}

      {/* Dictionary / indicators list view tab */}
      {activeTab === 'dictionary' && (
        <div className="space-y-6">
          
          {/* Top Search Controls Card */}
          <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600/10 rounded-2xl border border-blue-500/20 text-blue-400">
                  <Activity size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {dictionarySubTab === 'templates'
                      ? (isAr ? 'قوالب ومعارض الاستراتيجيات الاحترافية الجاهزة' : 'Predefined Professional Strategy Templates Gallery')
                      : (isAr ? 'مستودع وقاموس المؤشرات الفنية المتقدمة' : 'Technical Indicators Catalog & Custom Defaults')}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {dictionarySubTab === 'templates'
                      ? (isAr 
                          ? 'استعرض وانسخ أفضل استراتيجيات التداول الاحترافية بضغطة واحدة وفعلها فوراً على الشارت المباشر.' 
                          : 'Explore and copy top predefined professional strategies into your list with a single click.')
                      : (isAr 
                          ? 'ابحث في كافة المؤشرات الفنية، مع إمكانية تعديل قيمها ونسبها الافتراضية وحفظها أو استعادتها وتوظيفها فوراً.' 
                          : 'Explore supported indicators, modify their default settings, save or restore fast inputs, and use them immediately in strategy rules.')}
                  </p>
                </div>
              </div>
              
              {/* Search input field */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  value={indicatorSearchQuery}
                  onChange={(e) => setIndicatorSearchQuery(e.target.value)}
                  placeholder={
                    dictionarySubTab === 'templates'
                      ? (isAr ? 'ابحث باسم الاستراتيجية أو فكرتها...' : 'Search strategy templates...')
                      : (isAr ? 'ابحث باسم المؤشر أو تفاصيله...' : 'Search for indicator or keyword...')
                  }
                  className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500/50 transition-colors pr-9"
                />
                {indicatorSearchQuery && (
                  <button 
                    onClick={() => setIndicatorSearchQuery('')}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-white text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sub-Tab Switcher inside Dictionary */}
          <div className="flex border-b border-[#2a2e39]/30 gap-6 pb-px justify-start">
            <button
              type="button"
              onClick={() => {
                setDictionarySubTab('templates');
                setIndicatorSearchQuery('');
              }}
              className={`pb-2.5 text-xs font-black transition-all relative cursor-pointer ${
                dictionarySubTab === 'templates' ? 'text-blue-400 font-extrabold' : 'text-gray-500 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={13} className={dictionarySubTab === 'templates' ? 'text-blue-400' : 'text-gray-500'} />
                {isAr ? 'قوالب ومعارض الاستراتيجيات الاحترافية' : 'Pro Strategy Templates Gallery'}
              </span>
              {dictionarySubTab === 'templates' && (
                <motion.div layoutId="active-dictionary-subtab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setDictionarySubTab('indicators');
                setIndicatorSearchQuery('');
              }}
              className={`pb-2.5 text-xs font-black transition-all relative cursor-pointer ${
                dictionarySubTab === 'indicators' ? 'text-blue-400 font-extrabold' : 'text-gray-500 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <Activity size={13} className={dictionarySubTab === 'indicators' ? 'text-blue-400' : 'text-gray-500'} />
                {isAr ? 'قاموس ودليل المؤشرات الفنية المتقدمة' : 'Indicators Glossary & Defaults'}
              </span>
              {dictionarySubTab === 'indicators' && (
                <motion.div layoutId="active-dictionary-subtab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          </div>

          {/* Sub-Tab Content */}
          {dictionarySubTab === 'templates' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PREDEFINED_TEMPLATES.filter(template => {
                const q = indicatorSearchQuery.toLowerCase();
                const name = (isAr ? template.nameAr : template.nameEn).toLowerCase();
                const desc = (isAr ? template.descAr : template.descEn).toLowerCase();
                return name.includes(q) || desc.includes(q);
              }).map((template) => (
                <motion.div 
                  key={template.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.018, 
                    y: -3, 
                    boxShadow: "0 10px 40px rgba(37,99,235,0.08)",
                    borderColor: "rgba(59,130,246,0.35)"
                  }}
                  whileTap={{ scale: 0.995 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-2xl flex flex-col justify-between transition-colors duration-250 relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/2 rounded-full blur-2xl pointer-events-none" />
                  
                  <div className="flex flex-col h-full justify-between space-y-4">
                    <div>
                      {/* Header with name and logic type badge */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#2a2e39]/50">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
                            <Sparkles size={14} />
                          </div>
                          <h4 className="font-extrabold text-white text-[12px]" title={isAr ? template.nameAr : template.nameEn}>
                            {isAr ? template.nameAr : template.nameEn}
                          </h4>
                        </div>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                          template.logicOperator === 'and'
                            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                            : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
                        }`}>
                          {template.logicOperator === 'and' ? (isAr ? 'دمج: الكل (AND)' : 'COMBINE: ALL (AND)') : (isAr ? 'دمج: أي منهم (OR)' : 'COMBINE: ANY (OR)')}
                        </span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-[10.5px] text-gray-400 leading-relaxed mt-3 min-h-[55px] text-start">
                        {isAr ? template.descAr : template.descEn}
                      </p>

                      {/* Configured Rules Lists */}
                      <div className="mt-4 space-y-2">
                        <span className="text-[8.5px] font-black text-gray-500 tracking-wider block text-start">
                          {isAr ? 'المؤشرات والشروط المُبرمجة' : 'CONFIGURED RULES & CRITERIA'}
                        </span>
                        
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {template.rules.map((rule, idx) => (
                            <div 
                              key={idx} 
                              className="text-[10px] text-gray-300 bg-[#131722]/60 p-2.5 rounded-xl border border-white/5 flex items-center gap-2 text-start"
                            >
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                              <span className="font-sans line-clamp-2" title={translateRuleToText(rule as RuleCondition, language)}>
                                {translateRuleToText(rule as RuleCondition, language)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Copy/Instantiate Strategy Action Button */}
                    <div className="pt-3 border-t border-[#2a2e39]/30">
                      <button
                        type="button"
                        onClick={() => handleCopyPredefinedTemplate(template)}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
                      >
                        <Copy size={13} />
                        <span>{isAr ? 'تطبيق ونسخ إلى قائمة الإستراتيجيات' : 'Copy & Activate Template'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {PREDEFINED_TEMPLATES.filter(template => {
                const q = indicatorSearchQuery.toLowerCase();
                const name = (isAr ? template.nameAr : template.nameEn).toLowerCase();
                const desc = (isAr ? template.descAr : template.descEn).toLowerCase();
                return name.includes(q) || desc.includes(q);
              }).length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500 text-xs">
                  {isAr ? 'لا توجد قوالب استراتيجيات مطابقة لبحثك.' : 'No strategy templates match your search query.'}
                </div>
              )}
            </div>
          ) : (
            /* Indicators Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {INDICATORS_DETAILS_CATALOG.filter(ind => {
              const q = indicatorSearchQuery.toLowerCase();
              const name = (isAr ? ind.nameAr : ind.nameEn).toLowerCase();
              const desc = (isAr ? ind.descAr : ind.descEn).toLowerCase();
              return name.includes(q) || desc.includes(q);
            }).map((ind) => {
              const currentConf = indicatorConfigs[ind.id] || {};
              
              return (
                <div 
                  key={ind.id}
                  className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-2xl flex flex-col justify-between hover:border-blue-500/30 transition-all relative overflow-hidden group"
                >
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-[#2a2e39]/50">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-6 bg-blue-500 rounded-full group-hover:bg-blue-400 transition-colors" />
                          <h4 className="font-extrabold text-white text-[12px]">{isAr ? ind.nameAr : ind.nameEn}</h4>
                        </div>
                        <span className="text-[8px] font-mono text-blue-400 bg-blue-500/5 border border-blue-500/20 px-1.5 py-0.5 rounded uppercase font-black">
                          {ind.id}
                        </span>
                      </div>
                      
                      {/* Description */}
                      <p className="text-[10.5px] text-gray-400 leading-relaxed mb-4 min-h-[50px]">
                        {isAr ? ind.descAr : ind.descEn}
                      </p>

                      {/* Parameters Customizer Form */}
                      {ind.fields && ind.fields.length > 0 && (
                        <div className="bg-black/20 p-3.5 rounded-xl border border-[#2a2e39]/40 space-y-3.5 mb-5 relative">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8.5px] font-black text-gray-400 uppercase tracking-widest block">
                              {isAr ? 'تخصيص القيم والنسب الافتراضية' : 'Default Preset Parameter Values'}
                            </span>
                            <span className="text-[8px] text-emerald-400 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              {isAr ? 'حفظ تلقائي' : 'Auto-Saved'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3.5">
                            {ind.fields.map((field) => {
                              const val = currentConf[field.key] !== undefined ? currentConf[field.key] : field.def;
                              
                              return (
                                <div key={field.key} className="space-y-1">
                                  <label className="text-[9px] text-gray-400 block truncate" title={isAr ? field.labelAr : field.labelEn}>
                                    {isAr ? field.labelAr : field.labelEn}
                                  </label>
                                  
                                  {field.type === 'select' ? (
                                    <select
                                      value={val}
                                      onChange={(e) => handleUpdateIndicatorConfigField(ind.id, field.key, e.target.value)}
                                      className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-2.5 py-2.5 rounded-lg focus:outline-none focus:border-blue-500/40"
                                    >
                                      {field.options?.map((opt) => (
                                        <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <input
                                      type="number"
                                      value={val}
                                      min={field.min}
                                      max={field.max}
                                      step={field.key === 'value' && ind.id === 'atr' ? 0.1 : 1}
                                      onChange={(e) => {
                                        let v = parseFloat(e.target.value);
                                        if (isNaN(v)) v = typeof field.def === 'number' ? field.def : 0;
                                        handleUpdateIndicatorConfigField(ind.id, field.key, v);
                                      }}
                                      className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-blue-500/40"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Area */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3.5 border-t border-[#2a2e39]/30 mt-auto">
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            const restored = {
                              ...indicatorConfigs,
                              [ind.id]: FACTORY_INDICATOR_DEFAULTS[ind.id]
                            };
                            saveIndicatorConfigs(restored);
                            triggerNotification(
                              isAr 
                                ? `تم استعادة المعايير الأساسية لمؤشر ${ind.id.toUpperCase()}` 
                                : `Restored standard parameters for ${ind.id.toUpperCase()}`
                            );
                          }}
                          className="px-2.5 py-2 bg-[#2a2e39]/40 hover:bg-[#2a2e39]/80 border border-[#2a2e39] text-gray-400 hover:text-white text-[10px] font-bold rounded-lg transition-all"
                        >
                          {isAr ? 'الافتراضي' : 'Default'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleChartIndicator(ind.id)}
                          className={`px-2.5 py-2 text-[10px] font-bold rounded-lg transition-all border flex items-center gap-1 ${
                            isIndicatorShownOnChart(ind.id)
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-black/40 border-[#2a2e39] text-gray-500 hover:text-white'
                          }`}
                          title={isAr ? 'عرض أو إخفاء المؤشر على الشارت' : 'Toggle indicator visibility on TradingView'}
                        >
                          <Eye size={11} className={isIndicatorShownOnChart(ind.id) ? 'text-emerald-400' : ''} />
                          <span>{isIndicatorShownOnChart(ind.id) ? (isAr ? 'معروض' : 'Shown') : (isAr ? 'شارت' : 'Chart')}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const c = currentConf;
                          // If editor is already open, APPEND the rule to the current draft rules!
                          if (showEditor) {
                            const newId = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                            const cond = c.condition ?? (ind.conditions && ind.conditions[0] ? ind.conditions[0].value : 'above');
                            
                            const appendedRule: RuleCondition = {
                              id: newId,
                              indicator: ind.id as IndicatorType,
                              condition: cond,
                              value: ['rsi', 'adx', 'atr', 'cci', 'stoch', 'stoch_rsi', 'mfi', 'williams_r', 'cmf', 'cmo'].includes(ind.id)
                                ? (c.value ?? (ind.id === 'williams_r' ? -80 : ind.id === 'adx' ? 25 : ind.id === 'atr' ? 1.5 : ind.id === 'cci' ? 100 : ind.id === 'cmf' ? 0 : 80))
                                : undefined,
                              param1: ['rsi', 'macd', 'ma_cross', 'price_ma', 'fractal', 'bb', 'adx', 'atr', 'cci', 'stoch', 'stoch_rsi', 'supertrend', 'mfi', 'roc', 'williams_r', 'ema', 'sma', 'cmf', 'cmo'].includes(ind.id)
                                ? (c.param1 ?? (ind.id === 'cci' ? 20 : ind.id === 'roc' ? 9 : ind.id === 'supertrend' ? 10 : ind.id === 'cmf' ? 20 : 14))
                                : undefined,
                              param2: ['macd', 'ma_cross', 'supertrend'].includes(ind.id)
                                ? (c.param2 ?? (ind.id === 'macd' ? 26 : ind.id === 'ma_cross' ? 50 : 3))
                                : undefined,
                              maType1: ['ma_cross', 'price_ma'].includes(ind.id) ? (c.maType1 ?? 'sma') : undefined,
                              maType2: ind.id === 'ma_cross' ? (c.maType2 ?? 'ema') : undefined,
                            };
                            
                            setRules([...rules, appendedRule]);
                            triggerNotification(
                              isAr
                                ? `تم إضافة "${isAr ? ind.nameAr : ind.nameEn}" كشرط إضافي للاستراتيجية المفتوحة حالياً!`
                                : `Added "${ind.nameEn}" as an additional condition to current strategy!`
                            );
                            return;
                          }

                          setSelectedIndicator(ind.id);
                          
                          // Set standard values based on what is currently defined in currentConf
                          if (ind.id === 'rsi') {
                            setRuleValue(c.value ?? 30);
                            setParam1(c.param1 ?? 14);
                          } else if (ind.id === 'macd') {
                            setParam1(c.param1 ?? 12);
                            setParam2(c.param2 ?? 26);
                          } else if (ind.id === 'ma_cross') {
                            setParam1(c.param1 ?? 20);
                            setParam2(c.param2 ?? 50);
                            setMaType1(c.maType1 ?? 'sma');
                            setMaType2(c.maType2 ?? 'ema');
                          } else if (ind.id === 'price_ma') {
                            setParam1(c.param1 ?? 50);
                            setMaType1(c.maType1 ?? 'sma');
                          } else if (ind.id === 'fractal') {
                            setParam1(c.param1 ?? 2);
                          } else if (ind.id === 'bb') {
                            setParam1(c.param1 ?? 20);
                          } else if (['adx', 'atr', 'cci', 'mfi', 'roc', 'williams_r', 'stoch', 'stoch_rsi', 'cmf', 'cmo'].includes(ind.id)) {
                            setParam1(c.param1 ?? (ind.id === 'cci' ? 20 : ind.id === 'roc' ? 9 : 14));
                            setRuleValue(c.value ?? (ind.id === 'williams_r' ? -80 : ind.id === 'adx' ? 25 : ind.id === 'atr' ? 1.5 : ind.id === 'cci' ? 100 : ind.id === 'cmf' ? 0 : 80));
                          } else if (ind.id === 'supertrend') {
                            setParam1(c.param1 ?? 10);
                            setParam2(c.param2 ?? 3);
                          } else if (['ema', 'sma'].includes(ind.id)) {
                            setParam1(c.param1 ?? 20);
                          }

                          // Open the editor
                          setIsEditingId(null);
                          setStratName('');
                          setStratDesc('');
                          setRules([]);
                          setShowEditor(true);
                          
                          triggerNotification(
                            isAr 
                              ? `تم التهيئة واستدعاء مُقيم ومصمم استراتيجيات ${isAr ? ind.nameAr : ind.nameEn}!` 
                              : `Loaded customized ${ind.nameEn} defaults into the builder!`
                          );
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-[10px] font-black rounded-lg transition-all flex items-center gap-1 shadow-lg shadow-blue-600/15"
                      >
                        <Plus size={11} strokeWidth={2.5} />
                        {isAr ? 'توظيف كشرط' : 'Inject as Rule'}
                      </button>
                    </div>

                </div>
              </div>
              );
            })}
          </div>
          )}
        </div>
      )}

      {/* Strategy Editor Popup Modal Dialog */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowEditor(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl w-full max-w-4xl p-6 shadow-2xl my-8 space-y-6 relative ml-auto mr-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#2a2e39]/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600/10 rounded-xl border border-blue-500/20 text-blue-400 font-extrabold">
                    <Settings size={18} />
                  </div>
                  <div className={isAr ? 'text-right' : 'text-left'}>
                    <h3 className="font-bold text-white text-sm">
                      {isEditingId ? text.editorEditTitle : text.editorCreateTitle}
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {text.editorDesc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="px-3 py-1.5 bg-[#2a2e39]/50 hover:bg-[#2a2e39] text-gray-400 hover:text-white rounded-lg transition-colors text-xs font-bold"
                >
                  {text.closeBtn}
                </button>
              </div>

              {/* Form starts */}
              <form onSubmit={handleSaveStrategy} className="space-y-6">
                
                {/* Meta Inputs: Name and Description */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-right flex flex-col items-end">
                    <label className="text-[10px] text-gray-400 font-bold block pr-1">
                      {text.stratName} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={stratName}
                      onChange={(e) => setStratName(e.target.value)}
                      placeholder={text.stratNamePlaceholder}
                      className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50"
                      required
                    />
                  </div>
                  
                  <div className="space-y-1.5 text-right flex flex-col items-end">
                    <label className="text-[10px] text-gray-400 font-bold block pr-1">
                      {text.stratDesc}
                    </label>
                    <input
                      type="text"
                      value={stratDesc}
                      onChange={(e) => setStratDesc(e.target.value)}
                      placeholder={text.stratDescPlaceholder}
                      className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>

                {/* Comb Logic Selection */}
                <div className="space-y-2 p-4 bg-black/20 rounded-xl border border-[#2a2e39]/50 text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    {text.logicOperatorMode}
                  </span>
                  <div className="flex gap-4 justify-start">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        name="logicOperator"
                        checked={logicOperator === 'and'}
                        onChange={() => setLogicOperator('and')}
                        className="accent-blue-500"
                      />
                      <span>{text.logicAndLabel}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                      <input
                        type="radio"
                        name="logicOperator"
                        checked={logicOperator === 'or'}
                        onChange={() => setLogicOperator('or')}
                        className="accent-blue-500"
                      />
                      <span>{text.logicOrLabel}</span>
                    </label>
                  </div>
                </div>

                {/* Technical Rule Maker Section */}
                <div className="border-t border-[#2a2e39]/40 pt-4 text-right">
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-4">
                    {text.addNewRuleTitle}
                  </span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  
                  {/* Select Indicator - Searchable Custom Dropdown */}
                  <div className="relative">
                    <label className="text-[10px] text-gray-400 block mb-2 pr-1 font-bold">{text.selectIndicator}</label>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-3.5 py-[11px] rounded-xl focus:outline-none focus:border-blue-500/50 flex items-center justify-between"
                    >
                      <span className="truncate">
                        {(() => {
                          const item = INDICATORS_DETAILS_CATALOG.find(i => i.id === selectedIndicator);
                          return item ? (isAr ? item.nameAr : item.nameEn) : selectedIndicator.toUpperCase();
                        })()}
                      </span>
                      <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-[280px] bg-[#1e222d] border border-[#2a2e39] rounded-xl p-3 shadow-2xl space-y-2 flex flex-col">
                        <div className="relative">
                          <input
                            type="text"
                            value={dropdownSearch}
                            onChange={(e) => setDropdownSearch(e.target.value)}
                            placeholder={isAr ? 'ابحث عن مؤشر فني...' : 'Search indicators...'}
                            className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-3 py-2 rounded-lg focus:outline-none pl-8 text-right pr-3"
                            autoFocus
                          />
                          <Search size={12} className="absolute left-2.5 top-3 text-gray-500" />
                        </div>
                        
                        <div className="overflow-y-auto max-h-48 custom-scrollbar space-y-1">
                          {INDICATORS_DETAILS_CATALOG.filter(ind => {
                            const q = dropdownSearch.toLowerCase();
                            const name = (isAr ? ind.nameAr : ind.nameEn).toLowerCase();
                            const id = ind.id.toLowerCase();
                            return name.includes(q) || id.includes(q);
                          }).map(ind => (
                            <button
                              key={ind.id}
                              type="button"
                              onClick={() => {
                                setSelectedIndicator(ind.id);
                                setIsDropdownOpen(false);
                                setDropdownSearch('');
                              }}
                              className={`w-full text-right px-3 py-2 rounded-lg text-xs hover:bg-blue-600/10 hover:text-white transition-colors flex items-center justify-between ${
                                selectedIndicator === ind.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-gray-300'
                              }`}
                            >
                              <span className="truncate max-w-[190px]">{isAr ? ind.nameAr : ind.nameEn}</span>
                              <span className="text-[9px] font-mono text-gray-500 uppercase">{ind.id}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Conditions based on select */}
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-2 pr-1">{text.absoluteCondition}</label>
                    <select
                      value={selectedCondition}
                      onChange={(e) => setSelectedCondition(e.target.value)}
                      className="w-full bg-[#131722] border border-[#2a2e39]/80 text-gray-200 text-xs px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-blue-500/50"
                    >
                      {(() => {
                        const targetItem = INDICATORS_DETAILS_CATALOG.find(i => i.id === selectedIndicator);
                        return targetItem?.conditions?.map(cond => (
                          <option key={cond.value} value={cond.value}>
                            {isAr ? cond.labelAr : cond.labelEn}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  {/* Dynamic inputs based on indicator catalog fields */}
                  <div className="md:col-span-1">
                    {(() => {
                      const fields = INDICATORS_DETAILS_CATALOG.find(i => i.id === selectedIndicator)?.fields || [];
                      if (fields.length === 0) {
                        return (
                          <div className="text-[10px] text-gray-500 py-2.5">
                            {isAr ? 'لا توجد مدخلات إضافية.' : 'No extra settings needed.'}
                          </div>
                        );
                      }
                      return (
                        <div className="grid grid-cols-2 gap-2">
                          {fields.map(field => {
                            const val = field.key === 'param1' ? param1 
                                      : field.key === 'param2' ? param2 
                                      : field.key === 'value' ? ruleValue 
                                      : field.key === 'maType1' ? maType1 
                                      : maType2;
                                      
                            const setter = field.key === 'param1' ? setParam1 :
                                           field.key === 'param2' ? setParam2 :
                                           field.key === 'value' ? setRuleValue :
                                           field.key === 'maType1' ? setMaType1 :
                                           setMaType2;
                                           
                            return (
                              <div key={field.key} className="space-y-1">
                                <label className="text-[9px] text-gray-400 block truncate" title={isAr ? field.labelAr : field.labelEn}>
                                  {isAr ? field.labelAr : field.labelEn}
                                </label>
                                {field.type === 'select' ? (
                                  <select
                                    value={val as string}
                                    onChange={(e) => setter(e.target.value as any)}
                                    className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-2 py-2.5 rounded-lg focus:outline-none"
                                  >
                                    {field.options?.map(opt => (
                                      <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="number"
                                    value={val as number}
                                    min={field.min}
                                    max={field.max}
                                    step={field.key === 'value' && selectedIndicator === 'atr' ? 0.1 : 1}
                                    onChange={(e) => {
                                      const parsed = parseFloat(e.target.value);
                                      setter(isNaN(parsed) ? (field.def as any) : parsed);
                                    }}
                                    className="w-full bg-[#131722] border border-[#2a2e39] text-white text-xs px-2 py-2 rounded-lg focus:outline-none"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Add button */}
                  <div className="flex gap-2">
                    {editingRuleId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRuleId(null);
                          // Default reset
                          const config = indicatorConfigs[selectedIndicator] || {};
                          setRuleValue(config.value ?? 50);
                          setParam1(config.param1 ?? 14);
                          setParam2(config.param2 ?? 50);
                        }}
                        className="px-4 py-2.5 bg-[#2a2e39]/50 hover:bg-[#2a2e39] text-gray-450 hover:text-white rounded-xl text-xs font-bold transition-colors border border-[#2a2e39]"
                      >
                        {isAr ? 'إلغاء' : 'Cancel'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddRule}
                      className="flex-1 py-2.5 bg-[#10b981] hover:bg-emerald-500 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-500/15"
                    >
                      {editingRuleId ? <Check size={14} strokeWidth={2.5} /> : <Plus size={14} strokeWidth={2.5} />}
                      {editingRuleId ? (isAr ? 'حفظ وتحديث الشرط الحالي' : 'Update & Save Condition') : text.addRuleBtn}
                    </button>
                  </div>

                </div>
              </div>

              {/* Rule list inside modal editor */}
              <div className="space-y-3">
                <h5 className="text-[11px] font-black text-gray-400 uppercase tracking-widest block mb-2 pr-1">{text.rulesListHeading} ({rules.length})</h5>
                
                <div className="space-y-2 max-h-[360px] overflow-y-auto custom-scrollbar">
                  {rules.map((rl, index) => (
                    <div 
                      key={rl.id} 
                      className={`p-3 bg-black/40 rounded-xl border flex items-center justify-between ${
                        editingRuleId === rl.id ? 'border-blue-500/50 bg-blue-500/5' : 'border-[#2a2e39]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded font-bold font-mono">#{index + 1}</span>
                        <span className="text-xs text-gray-200 font-sans font-bold">{translateRuleToText(rl, language)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditRuleClick(rl)}
                          className="text-gray-500 hover:text-blue-400 transition-colors p-1"
                          title={isAr ? 'تعديل هذا الشرط' : 'Edit this rule'}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveRule(rl.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          title={isAr ? 'حذف هذا الشرط' : 'Delete this rule'}
                        >
                          <Trash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {rules.length === 0 && (
                    <div className="text-center py-6 text-gray-500 bg-black/10 rounded-xl border border-dashed border-[#2a2e39]">
                      <p className="text-xs">{text.noRulesInList}</p>
                      <p className="text-[10px] mt-1">{text.noRulesHint}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons to save or cancel */}
              <div className="flex items-center gap-3 justify-end pt-4 border-t border-[#2a2e39]/50">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditor(false);
                    setIsEditingId(null);
                  }}
                  className="px-5 py-3 bg-black/20 hover:bg-black/30 border border-[#2a2e39] text-gray-400 hover:text-white rounded-xl text-xs font-bold transition-all"
                >
                  {text.cancel}
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2"
                >
                  <Save size={14} />
                  <span>{isEditingId ? text.saveBtnEditPost : text.saveBtnCreatePost}</span>
                </button>
              </div>

            </form>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
