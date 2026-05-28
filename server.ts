/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Proxy for Binance API to avoid CORS issues
  app.get('/api/binance/klines', async (req, res) => {
    try {
      const { symbol, interval, limit } = req.query;
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol || 'BTCUSDT'}&interval=${interval || '1h'}&limit=${limit || 500}`;
      
      const response = await fetch(binanceUrl);
      if (!response.ok) {
        throw new Error(`Binance API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Error proxying Binance API:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch from Binance' });
    }
  });

  // API Route for Chart Analysis
  app.post('/api/analyze', async (req, res) => {
    const { image, symbol, timeframe, model: requestedModel, groqApiKey, customPrompt, customStudies, indicatorParams, data } = req.body;
    
    let activeModel = requestedModel || 'gemini-3.1-flash-lite';

    // Helper to calculate recent standard Bill Williams Fractals (localized support/resistance peaks)
    const getLatestFractals = (ohlc: any[], period: number = 2) => {
      if (!ohlc || ohlc.length < period * 2 + 1) return { resistance: [], support: [] };
      const resis: number[] = [];
      const supp: number[] = [];
      const startIdx = Math.max(0, ohlc.length - 150); // scan the recent 150 candles
      
      for (let i = ohlc.length - period - 1; i >= startIdx; i--) {
        let isHighFractal = true;
        let isLowFractal = true;
        const currentHigh = parseFloat(ohlc[i].high);
        const currentLow = parseFloat(ohlc[i].low);
        
        for (let j = i - period; j <= i + period; j++) {
          if (j === i) continue;
          if (parseFloat(ohlc[j].high) > currentHigh) isHighFractal = false;
          if (parseFloat(ohlc[j].low) < currentLow) isLowFractal = false;
        }
        
        if (isHighFractal && !resis.includes(currentHigh)) {
          resis.push(currentHigh);
        }
        if (isLowFractal && !supp.includes(currentLow)) {
          supp.push(currentLow);
        }
      }
      return {
        resistance: resis.slice(0, 4), // 4 newest distinct resistance heights
        support: supp.slice(0, 4)       // 4 newest distinct support depths
      };
    };

    const fractals = data ? getLatestFractals(data, indicatorParams?.fractal?.period || 2) : { resistance: [], support: [] };
    const fractalsInfo = fractals.resistance.length > 0 || fractals.support.length > 0
      ? `\nRECENT DETECTED FRACTAL LEVELS (Mathematical Peaks & Troughs):
- Recent Resistance Peaks (Fractal Highs): [ ${fractals.resistance.map(v => v.toLocaleString()).join(', ')} ]
- Recent Support Troughs (Fractal Lows): [ ${fractals.support.map(v => v.toLocaleString()).join(', ')} ]\n`
      : '';

    try {
      if (!image) {
        return res.status(400).json({ error: 'Image is required' });
      }

      const promptText = `Analyze this chart for ${symbol} (${timeframe || 'no timeframe'}). Identify the highest-probability trading setups and formulate clear, actionable technical parameters.
          
          OUTPUT STRUCTURE (STRICT):
          
          ### ⚡ SIGNAL: [STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL]
          > **CONFIDENCE**: [0-100]% | **VOLATILITY**: [LOW/MED/HIGH]
          
          ### 🎯 HIGH-PROBABILITY TRADE SETUP
          - **ACTIONABLE SYSTEM**: [e.g., Pullback to EMA, Retest of Support, Breakout, etc.]
          - **ENTRY ZONE**: [Price level or narrow range]
          - **TARGETS (TP)**: [Target Price 1] / [Target Price 2]
          - **STOP LOSS (SL)**: [Price level/Hard invalidation point]
          - **RISK/REWARD (R:R)**: [Ratio, e.g., 1:2.4] (Aim for > 1:2 setups)
          - **INVALIDATION TRIGGER**: [Specific price action or candle close that invalidates the trade setup]
          
          ### 📈 INDICATOR MATRIX
          | INDICATOR | VALUE | STATUS | POWER |
          | :--- | :--- | :--- | :--- |
          | **RSI** | [Value] | [Status: Oversold (<30) / Overbought (>70) / Neutral] | [▓▓▓▓░░░░░░] |
          | **ADX** | [Value] | [Trend Strength] | [▓▓▓░░░░░░░] |
          | **FIB 0.618** | [Price] | [Golden Ratio] | [▓▓▓▓▓▓▓▓░░] |
          | **MACD** | [Value] | [Trend] | [▓▓▓░░░░░░░] |
          | **BOLL** | [Value] | [Zone] | [▓▓▓▓▓░░░░░] |
          | **EMA** | [Value] | [Trend] | [▓▓▓▓▓▓▓░░░] |
          | **VWAP** | [Value] | [Bias] | [▓▓▓░░░░░░░] |
          
          ### 🛰️ FIBONACCI LEVELS
          - **0.236**: [Price]
          - **0.382**: [Price]
          - **0.500**: [Price]
          - **0.618**: [Price] (GOLDEN RATIO)
          - **0.786**: [Price]
          
          ### 🏁 DECISIVE ACTIONABLE SUMMARY
          - [Specific price action trigger]
          - [Core indicators confluence factor]
          - [Definitive risk mitigation note]
          
          RULES:
          - NO ARABIC in the analysis content.
          - MAX 5 words per summary bullet. Keep them hyper-concise and packed with specific trade setup insights.
          - HIGHLIGHT the Golden Ratio (0.618) importance in parameters.
          - Specifically mention oversold (below 30) and overbought (above 70) levels in the RSI evaluation.
          - Use ONLY the progress bars [▓▓▓░░░].
          - High-contrast terminology ONLY.
          
          ${indicatorParams ? `CURRENT INDICATOR SETTINGS:
          - SMA: Period ${indicatorParams.sma?.period}
          - EMA: Period ${indicatorParams.ema?.period}
          - RSI: Period ${indicatorParams.rsi?.period}
          - MACD: Fast ${indicatorParams.macd?.fast}, Slow ${indicatorParams.macd?.slow}, Signal ${indicatorParams.macd?.signal}
          - ADX: Period ${indicatorParams.adx?.period}
          - Fractals: Period ${indicatorParams.fractal?.period || 2} (surrounding bars)` : ''}
          ${fractalsInfo}
          ${customStudies && customStudies.length > 0 ? `ADDITIONAL INDICATORS TO CONSIDER ON CHART: ${customStudies.join(', ')}` : ''}
          ${customPrompt ? `SPECIFIC USER ANALYSIS RULES: ${customPrompt}` : ''}
          `;

      // Handle Groq Models
      if (requestedModel && requestedModel.startsWith('groq/')) {
        const apiKey = groqApiKey || process.env.GROQ_API_KEY;
        if (!apiKey) {
          return res.status(400).json({ error: 'مفتاح API الخاص بـ Groq مطلوب للقيام بهذا التحليل.' });
        }

        const groq = new Groq({ apiKey });
        const groqModel = requestedModel.replace('groq/', '');

        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: promptText },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
          model: groqModel,
        });

        return res.json({ 
          analysis: completion.choices[0]?.message?.content || 'No response from Groq',
          model: `Groq/${groqModel}`
        });
      }

      // Default Gemini Logic
      const base64Data = image.split(',')[1];
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: 'image/png'
        }
      };
      const textPart = { text: promptText };

      const parts = [imagePart, textPart];

      let response;
      let retries = 0;
      const maxRetries = 5;
      const fallbackModels = [
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3-flash-preview',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-3.1-pro-preview'
      ].filter(m => m !== requestedModel);
      
      activeModel = requestedModel || fallbackModels[0];

      while (retries <= maxRetries) {
        try {
          // Use requested model first, then rotate through fallbacks
          if (retries > 0) {
            activeModel = fallbackModels[(retries - 1) % fallbackModels.length];
          } else {
            activeModel = requestedModel || fallbackModels[0];
          }
          
          console.log(`Attempting analysis with model: ${activeModel} (Retry: ${retries})`);
          
          response = await ai.models.generateContent({
            model: activeModel,
            contents: { parts }
          });
          break;
        } catch (e: any) {
          const isRetryable = e.status === 429 || e.status === 503 || 
                             JSON.stringify(e).includes('429') || 
                             JSON.stringify(e).includes('503') || 
                             JSON.stringify(e).includes('RESOURCE_EXHAUSTED') || 
                             JSON.stringify(e).includes('QUOTA_EXHAUSTED') ||
                             JSON.stringify(e).includes('UNAVAILABLE');
          
          if (isRetryable && retries < maxRetries) {
            retries++;
            // Exponential backoff
            const delay = Math.pow(2, retries) * 1000;
            console.warn(`Retryable error (${e.status || 'unknown'}) hit with ${activeModel}. Retrying with fallback model in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw e;
        }
      }

      if (!response) throw new Error('No response from AI');
      res.json({ 
        analysis: response.text,
        model: activeModel
      });
    } catch (error: any) {
      console.error('Gemini Analysis Error Full:', JSON.stringify(error));
      
      const errorStr = (error.message || '').toLowerCase();
      const status = error.status || (error.response ? error.response.status : null);
      
      const isHighDemandError = 
        status === 429 ||
        status === 503 ||
        errorStr.includes('429') || 
        errorStr.includes('503') ||
        errorStr.includes('resource_exhausted') || 
        errorStr.includes('quota') ||
        errorStr.includes('limit') ||
        errorStr.includes('high demand') ||
        errorStr.includes('unavailable');

      // Handle Authentication Errors (Invalid API Key)
      if (status === 401 || errorStr.includes('invalid api key')) {
        const isGroq = requestedModel && requestedModel.startsWith('groq/');
        return res.status(401).json({
          error: isGroq 
            ? 'مفتاح API الخاص بـ Groq غير صالح. يرجى مراجعته في الإعدادات.' 
            : 'خطأ في المصادقة مع مزود الخدمة.',
          code: 'INVALID_API_KEY'
        });
      }

      // Handle high demand / quota exhaustion / rate limits
      if (isHighDemandError) {
        return res.status(status || 429).json({ 
          error: 'يواجه النظام ضغطاً عالياً أو حصة استخدام محدودة حالياً. تم تفعيل نظام التبديل التلقائي بين النماذج، يرجى المحاولة مرة أخرى بعد ثوانٍ قليلة.',
          code: status === 503 ? 'SERVICE_UNAVAILABLE' : 'QUOTA_EXHAUSTED',
          lastModel: activeModel
        });
      }
      
      res.status(500).json({ error: error.message || 'Failed to analyze chart' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
