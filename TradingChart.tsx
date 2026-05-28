/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { useEffect, useState, memo } from "react";

interface TradingChartProps {
  symbol: string;
  timeframe: string;
  studies?: string[];
}

const areEqual = (prevProps: TradingChartProps, nextProps: TradingChartProps) => {
  if (prevProps.symbol !== nextProps.symbol) return false;
  if (prevProps.timeframe !== nextProps.timeframe) return false;
  
  const prevStudies = prevProps.studies || [];
  const nextStudies = nextProps.studies || [];
  if (prevStudies.length !== nextStudies.length) return false;
  for (let i = 0; i < prevStudies.length; i++) {
    if (prevStudies[i] !== nextStudies[i]) return false;
  }
  
  return true;
};

const TradingChart = memo(function TradingChart({ symbol, timeframe, studies = [] }: TradingChartProps) {
  // Map internal timeframe to TradingView timeframe
  // TradingView uses '1', '5', '15', '30', '60', '240', 'D', 'W'
  const mapTimeframe = (tf: string) => {
    switch (tf) {
      case '1m': return '1';
      case '5m': return '5';
      case '15m': return '15';
      case '30m': return '30';
      case '1h': return '60';
      case '4h': return '240';
      case '1d': return 'D';
      default: return '5';
    }
  };

  // Map symbols to TradingView format
  const mapSymbol = (s: string) => {
    if (s.includes(':')) return s;
    return `BINANCE:${s}`;
  };

  return (
    <div className="w-full h-[500px] lg:h-[650px] rounded-2xl overflow-hidden border border-[#2a2e39] bg-[#131722]">
      <AdvancedRealTimeChart 
        theme="dark"
        symbol={mapSymbol(symbol)}
        interval={mapTimeframe(timeframe) as any}
        autosize
        allow_symbol_change={false}
        details
        hotlist
        calendar
        show_popup_button={true}
        popup_width="1000"
        popup_height="650"
        studies={studies as any[]}
      />
    </div>
  );
}, areEqual);

export default TradingChart;
