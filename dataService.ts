/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OhlcData } from '../lib/calculations';

export async function fetchBinanceData(symbol: string = 'PAXGUSDT', interval: string = '1h', limit: number = 500): Promise<OhlcData[]> {
  // Detect if running inside an Android APK (Capacitor)
  const isCapacitor = typeof window !== 'undefined' && (
    window.location.protocol === 'capacitor:' || 
    window.location.protocol === 'file:' || 
    (!window.location.host && typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor !== null)
  );

  const getProxyBaseUrl = () => {
    if (!isCapacitor) return '';
    const isPre = typeof window !== 'undefined' && window.location.href.includes('ais-pre');
    return isPre 
      ? 'https://ais-pre-nmkfzg4muu4uta7ndx62a2-539356685096.europe-west2.run.app'
      : 'https://ais-dev-nmkfzg4muu4uta7ndx62a2-539356685096.europe-west2.run.app';
  };

  const proxyBaseUrl = getProxyBaseUrl();

  try {
    // 1. Try direct Binance API first (low-latency, bypassing server proxy)
    try {
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const response = await fetch(binanceUrl);
      if (response.ok) {
        const data = await response.json();
        return data.map((d: any) => ({
          time: d[0] / 1000, // Convert ms to seconds for lightweight-charts
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }));
      }
    } catch (e) {
      console.warn('Direct Binance API failed. Falling back to server proxy...', e);
    }

    // 2. Fall back to secure server proxy
    const response = await fetch(`${proxyBaseUrl}/api/binance/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error(`Proxy responded with ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.map((d: any) => ({
      time: d[0] / 1000, // Convert ms to seconds
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5])
    }));
  } catch (error) {
    console.error('Error fetching data from Binance:', error);
    // Fallback to mock data if API fails
    return generateMockData(limit);
  }
}

function generateMockData(count: number): OhlcData[] {
  const data: OhlcData[] = [];
  let time = Math.floor(Date.now() / 1000) - count * 3600;
  let price = 2350;
  
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 15;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;
    
    data.push({
      time,
      open,
      high,
      low,
      close,
      volume: Math.random() * 100
    });
    
    price = close;
    time += 3600;
  }
  
  return data;
}
