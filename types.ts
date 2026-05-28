/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OhlcData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type IndicatorType = 
  | 'rsi' 
  | 'macd' 
  | 'ma_cross' 
  | 'price_ma' 
  | 'fractal' 
  | 'bb'
  | 'adx'
  | 'atr'
  | 'cci'
  | 'stoch'
  | 'stoch_rsi'
  | 'supertrend'
  | 'vwap'
  | 'obv'
  | 'mfi'
  | 'roc'
  | 'williams_r'
  | 'cmf'
  | 'awesome'
  | 'psar'
  | 'ichimoku'
  | 'keltner'
  | 'donchian'
  | 'coppock'
  | 'ultimate'
  | 'vortex'
  | 'cmo'
  | 'volume'
  | 'ema'
  | 'sma';

export interface RuleCondition {
  id: string;
  indicator: IndicatorType;
  condition: string; 
  value?: number;    // Threshold (e.g., 70 for RSI)
  param1?: number;   // e.g., Fast MA period or RSI period
  param2?: number;   // e.g., Slow MA period 
  maType1?: 'sma' | 'ema';
  maType2?: 'sma' | 'ema';
}

export interface CustomStrategy {
  id: string;
  name: string;
  description: string;
  rules: RuleCondition[];
  logicOperator: 'and' | 'or'; // Whether ALL or ANY rules should trigger
  isDefault?: boolean;
}

export interface StrategyEvaluationResult {
  isTriggered: boolean;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  score: number; // e.g. rule matches out of total
  detailedResults: {
    ruleId: string;
    isPassed: boolean;
    currentValueText: string;
    ruleDescription: string;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
  }[];
}
