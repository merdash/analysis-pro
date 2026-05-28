/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, useRef, useMemo, lazy, Suspense } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Menu,
  X,
  Maximize2,
  BarChart3,
  BrainCircuit,
  Camera,
  Loader2,
  ArrowRightLeft,
  RefreshCw,
  RotateCcw,
  Save,
  Check,
  Zap,
  Settings,
  Key,
  Globe,
  Trash2,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
  AlertCircle,
  Smartphone,
  Download,
  PlusSquare,
  Share
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { domToPng } from 'modern-screenshot';
import { fetchBinanceData } from './services/dataService';
import { OhlcData, calculateFractals } from './lib/calculations';
import ReactMarkdown from 'react-markdown';
import { translations } from './lib/translations';
import { CustomStrategy, StrategyEvaluationResult } from './types';
import { evaluateStrategy, generateDefaultStrategies } from './lib/strategyEvaluator';
import SkeletonLoader from './components/SkeletonLoader';

const TradingChart = lazy(() => import('./components/TradingChart'));
const StrategySuite = lazy(() => import('./components/StrategySuite'));

export default function App() {
  // LocalStorage Keys
  const STORAGE_KEY = 'pro_trader_settings';

  // --- PWA Installation Support States ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPwaBanner, setShowPwaBanner] = useState(false);

  useEffect(() => {
    // 1. Detect if running standalone
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 2. Detect iOS device
    const detectIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent);
      setIsIos(isIphoneOrIpad);
    };
    detectIos();

    // 3. Listen for native browser PWA prompt event
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = localStorage.getItem('pro_trade_pwa_dismissed') === 'true';
      if (!isDismissed) {
        setShowPwaBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);

    // If it's iOS and not standalone, show elegant installation guidance card after a short delay
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (isIosDevice && !isStandaloneMode) {
      const isDismissed = localStorage.getItem('pro_trade_pwa_dismissed') === 'true';
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setShowPwaBanner(true);
        }, 5000); // 5 seconds smooth delay
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPwaBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handlePwaDismiss = () => {
    setShowPwaBanner(false);
    localStorage.setItem('pro_trade_pwa_dismissed', 'true');
  };

  const handleResetPwaPrompt = () => {
    localStorage.removeItem('pro_trade_pwa_dismissed');
    if (deferredPrompt || isIos) {
      setShowPwaBanner(true);
    } else {
      alert(language === 'ar' 
        ? 'تم تفعيل معايير التثبيت الذاتي! يمكنك تثبيت التطبيق الآن مباشرة بالضغط على النقاط الثلاث بجوار شريط العنوان بمتصفحك ثم تحديد "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".'
        : 'Self-install standards activated! You can install the application now by clicking the browser menu (three dots icon) and choosing "Install App" or "Add to Home Screen".'
      );
    }
  };

  const [data, setData] = useState<OhlcData[]>([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('PAXGUSDT');
  const [timeframe, setTimeframe] = useState('5m');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [groqApiKey, setGroqApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzingModel, setAnalyzingModel] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [activeView, setActiveView] = useState<'chart' | 'strategy' | 'analysis'>('chart');
  const [language, setLanguage] = useState<'ar' | 'en'>('ar');
  const t = translations[language] || translations.ar;

  // --- Conditional Alert System for Fractal Breakouts ---
  interface InAppAlert {
    id: string;
    type: 'resistance_break' | 'test';
    title: string;
    body: string;
    time: number;
    symbol: string;
    price: number;
    resistanceValue: number;
  }

  const [inAppAlerts, setInAppAlerts] = useState<InAppAlert[]>([]);
  const [notifiedFractals, setNotifiedFractals] = useState<number[]>([]);
  const [fractalAlertEnabled, setFractalAlertEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fractalAlertEnabled') === 'true';
    } catch {
      return false;
    }
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('fractalSoundEnabled') !== 'false';
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
              language === 'ar' ? 'تم تفعيل التنبيهات بنجاح!' : 'Notifications Enabled Successfully!',
              {
                body: language === 'ar' 
                  ? 'ستتلقى إشعارات فورية عند اختراق مستويات الفركتلات العلوية.' 
                  : 'You will receive live notifications when price breaks fractal resistance.',
                icon: '/favicon.ico'
              }
            );
          } catch (e) {
            console.error('Failed to show test notification', e);
          }
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  const handleToggleAlerts = () => {
    const nextVal = !fractalAlertEnabled;
    setFractalAlertEnabled(nextVal);
    localStorage.setItem('fractalAlertEnabled', String(nextVal));
    
    if (nextVal && notificationPermissionState !== 'granted') {
      requestNotificationPermission();
    }
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('fractalSoundEnabled', String(nextVal));
  };

  const triggerTestAlert = () => {
    const title = language === 'ar' ? '🚨 تجربة نظام التنبيهات الفنية' : '🚨 Test Technical Alert System';
    const body = language === 'ar' 
      ? `هذا تنبيه تجريبي! تم اختراق مستوى مقاومة افتراضي لزوج ${symbol}` 
      : `This is a test notification! Default resistance level breached on ${symbol}`;
    
    if (soundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } catch (audioErr) {
        console.warn('Audio play failed', audioErr);
      }
    }

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch (e) {
        console.error('Browser Notification failed', e);
      }
    }

    const testAlert: InAppAlert = {
      id: Date.now().toString(),
      type: 'test',
      title,
      body,
      time: Date.now(),
      symbol,
      price: data.length > 0 ? data[data.length - 1].close : 2000,
      resistanceValue: data.length > 0 ? data[data.length - 1].close - 10 : 1990
    };

    setInAppAlerts(prev => [testAlert, ...prev].slice(0, 10));
  };
  
  const [customStudies, setCustomStudies] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>('golden-cross-rsi');
  const [strategyPrompt, setStrategyPrompt] = useState<string>('');

  const strategiesList = useMemo(() => {
    const saved = localStorage.getItem('pro_trader_custom_saved_strategies');
    const defaults = generateDefaultStrategies(language);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          const updated = parsed.map((s: CustomStrategy) => {
            const freshDef = defaults.find(d => d.id === s.id);
            if (freshDef) {
              return {
                ...s,
                name: freshDef.name,
                description: freshDef.description,
                isDefault: true,
                rules: freshDef.rules
              };
            }
            return s;
          });
          
          const missingDefaults = defaults.filter(def => !parsed.some((s: any) => s.id === def.id));
          return [...updated, ...missingDefaults];
        }
      } catch (e) {
        console.error('Failed to parse saved strategies in App useMemo', e);
      }
    }
    return defaults;
  }, [language, activeStrategyId, activeView]);

  const activeStrategy = useMemo(() => {
    return strategiesList.find(s => s.id === activeStrategyId) || strategiesList[0] || null;
  }, [strategiesList, activeStrategyId]);

  const activeStrategyEval = useMemo(() => {
    if (!activeStrategy || !data || data.length === 0) return null;
    return evaluateStrategy(activeStrategy, data);
  }, [activeStrategy, data]);
  
  const [indicatorParams, setIndicatorParams] = useState({
    sma: { period: 20 },
    ema: { period: 50 },
    rsi: { period: 14 },
    macd: { fast: 12, slow: 26, signal: 9 },
    adx: { period: 14 },
    fractal: { period: 2 }
  });
  
  const [indicators, setIndicators] = useState({
    sma: true,
    ema: false,
    rsi: true,
    macd: false,
    adx: false,
    fractal: true
  });

  const memoizedStudies = useMemo(() => {
    return [
      ...(indicators.sma ? ['MASimple@tv-basicstudies'] : []),
      ...(indicators.ema ? ['MAExp@tv-basicstudies'] : []),
      ...(indicators.rsi ? ['RSI@tv-basicstudies'] : []),
      ...(indicators.macd ? ['MACD@tv-basicstudies'] : []),
      ...(indicators.adx ? ['AverageDirectionalIndex@tv-basicstudies'] : []),
      ...(indicators.fractal ? ['WilliamsFractal@tv-basicstudies'] : []),
      ...customStudies
    ];
  }, [indicators, customStudies]);

  const clientFractals = useMemo(() => {
    if (!data || data.length === 0) return { resistance: [], support: [] };
    const period = indicatorParams.fractal?.period || 2;
    const calc = calculateFractals(data, period);
    
    // Scan recent candles backwards to collect top distinct support (lows) and resistance (highs) levels
    const resis: { time: number; value: number }[] = [];
    const supp: { time: number; value: number }[] = [];
    
    for (let i = calc.length - 1; i >= 0; i--) {
      if (calc[i].highFractal !== null && resis.length < 5) {
        const val = calc[i].highFractal as number;
        if (!resis.some(r => Math.abs(r.value - val) < (val * 0.0001))) {
          resis.push({ time: calc[i].time, value: val });
        }
      }
      if (calc[i].lowFractal !== null && supp.length < 5) {
        const val = calc[i].lowFractal as number;
        if (!supp.some(s => Math.abs(s.value - val) < (val * 0.0001))) {
          supp.push({ time: calc[i].time, value: val });
        }
      }
    }
    
    return {
      resistance: resis,
      support: supp
    };
  }, [data, indicatorParams.fractal]);

  const chartAreaRef = useRef<HTMLDivElement>(null);
  const captureAreaRef = useRef<HTMLDivElement>(null);

  // Load Settings
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.symbol) setSymbol(parsed.symbol);
        if (parsed.timeframe) setTimeframe(parsed.timeframe);
        if (parsed.indicators) setIndicators(parsed.indicators);
        if (parsed.indicatorParams) setIndicatorParams(parsed.indicatorParams);
        if (parsed.customStudies) setCustomStudies(parsed.customStudies);
        if (parsed.customPrompt) setCustomPrompt(parsed.customPrompt);
        if (parsed.selectedModel) setSelectedModel(parsed.selectedModel);
        if (parsed.activeStrategyId) setActiveStrategyId(parsed.activeStrategyId);
        if (parsed.language) setLanguage(parsed.language);
        if (parsed.groqApiKey) {
          setGroqApiKey(parsed.groqApiKey);
          setTempApiKey(parsed.groqApiKey);
        }
      } catch (e) {
        console.error('Failed to load settings', e);
      }
    }
  }, []);

  // Save Settings
  useEffect(() => {
    const settings = { symbol, timeframe, indicators, indicatorParams, groqApiKey, selectedModel, customStudies, customPrompt, activeStrategyId, language };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [symbol, timeframe, indicators, indicatorParams, groqApiKey, selectedModel, customStudies, customPrompt, activeStrategyId, language]);

  const handleSaveSettings = () => {
    const settings = { symbol, timeframe, indicators, indicatorParams, selectedModel, groqApiKey, customStudies, customPrompt, activeStrategyId, language };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const handleSaveApiKey = () => {
    setGroqApiKey(tempApiKey);
    setIsEditingKey(false);
    
    const saved = localStorage.getItem(STORAGE_KEY);
    const settings = saved ? JSON.parse(saved) : {};
    settings.groqApiKey = tempApiKey;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const handleCancelEditKey = () => {
    setTempApiKey(groqApiKey);
    setIsEditingKey(false);
  };

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const ohlc = await fetchBinanceData(symbol, timeframe);
      setData(ohlc);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Conditional Alert System breakout monitor
  useEffect(() => {
    if (!fractalAlertEnabled || !data || data.length === 0 || !indicators.fractal) return;
    
    const mostRecentResistance = clientFractals.resistance[0];
    if (!mostRecentResistance) return;

    const lastPrice = data[data.length - 1].close;
    const prevPriceRef = data.length > 1 ? data[data.length - 2].close : lastPrice;

    // Trigger alert if price broke above the resistance level
    const isBreakout = lastPrice > mostRecentResistance.value && prevPriceRef <= mostRecentResistance.value;

    if (isBreakout && !notifiedFractals.includes(mostRecentResistance.time)) {
      const title = language === 'ar' ? '🚨 اختراق مقاومة الفركتل!' : '🚨 Fractal Resistance Breakout!';
      const body = language === 'ar' 
        ? `اخترق السعر المباشر (${lastPrice.toLocaleString()}) مستوى المقاومة الأخير للفركتل (${mostRecentResistance.value.toLocaleString()}) في زوج ${symbol}.`
        : `Live price (${lastPrice.toLocaleString()}) broke above the latest fractal resistance level (${mostRecentResistance.value.toLocaleString()}) on ${symbol}.`;

      // 1. Browser Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: `fractal-alert-${mostRecentResistance.time}`
          });
        } catch (e) {
          console.error('[Notification] Error triggering browser notification:', e);
        }
      }

      // 2. Audio Beep Tone
      if (soundEnabled) {
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
          gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start();
          oscillator.stop(audioCtx.currentTime + 0.35);
        } catch (audioErr) {
          console.warn('Audio alert not permitted or skipped', audioErr);
        }
      }

      // 3. Register in-app alert
      const newAlert: InAppAlert = {
        id: `${mostRecentResistance.time}-${Date.now()}`,
        type: 'resistance_break',
        title,
        body,
        time: Date.now(),
        symbol,
        price: lastPrice,
        resistanceValue: mostRecentResistance.value
      };

      setInAppAlerts(prev => [newAlert, ...prev].slice(0, 10));

      // Append to notified list
      setNotifiedFractals(prev => [...prev, mostRecentResistance.time]);
    }
  }, [data, clientFractals, fractalAlertEnabled, indicators.fractal, notifiedFractals, symbol, language, soundEnabled]);

  useEffect(() => {
    // 1. Fetch initial historical database candles
    loadData();

    // 2. Establish a real-time WebSocket connection to Binance Stream Service
    let socket: WebSocket | null = null;
    let fallbackInterval: number | null = null;

    const connectWS = () => {
      try {
        const cleanSymbol = symbol.toLowerCase();
        // Connect to Binance Kline WebSocket Stream
        const wsUrl = `wss://stream.binance.com:9443/ws/${cleanSymbol}@kline_${timeframe}`;
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setWsConnected(true);
          console.log(`[WebSocket] Connected to stream: ${wsUrl}`);
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.e === 'kline' && message.k) {
              const k = message.k;
              const candleTime = Math.floor(k.t / 1000);

              const streamCandle = {
                time: candleTime,
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v)
              };

              setData(prevData => {
                if (!prevData || prevData.length === 0) return [streamCandle];

                const lastCandle = prevData[prevData.length - 1];
                if (lastCandle.time === candleTime) {
                  // Update current active candle with latest tick
                  const nextData = [...prevData];
                  nextData[nextData.length - 1] = streamCandle;
                  return nextData;
                } else if (candleTime > lastCandle.time) {
                  // Roll over onto a new candle when the kline period updates
                  const nextData = [...prevData, streamCandle];
                  if (nextData.length > 500) {
                    nextData.shift();
                  }
                  return nextData;
                }
                return prevData;
              });
            }
          } catch (err) {
            console.error('[WebSocket] Error parsing kline payload:', err);
          }
        };

        socket.onclose = () => {
          setWsConnected(false);
          console.log('[WebSocket] Connection closed');
        };

        socket.onerror = (err) => {
          setWsConnected(false);
          console.error('[WebSocket] Error occurred:', err);
        };
      } catch (err) {
        setWsConnected(false);
        console.error('[WebSocket] Failed to instantiate socket:', err);
      }
    };

    connectWS();

    // 3. Fallback polling interval to fetch data via REST proxy if the socket is closed or fails
    fallbackInterval = window.setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        loadData(true);
      }
    }, 10000);

    return () => {
      if (socket) {
        socket.close();
      }
      if (fallbackInterval) {
        window.clearInterval(fallbackInterval);
      }
    };
  }, [symbol, timeframe]);

  const handleRefresh = () => {
    loadData(false);
  };

  const handleResetDefaults = () => {
    setSymbol('PAXGUSDT');
    setTimeframe('5m');
    setIndicators({
      sma: true,
      ema: false,
      rsi: true,
      macd: false,
      adx: false,
      fractal: true
    });
    setIndicatorParams({
      sma: { period: 20 },
      ema: { period: 50 },
      rsi: { period: 14 },
      macd: { fast: 12, slow: 26, signal: 9 },
      adx: { period: 14 },
      fractal: { period: 2 }
    });
    setCustomStudies([]);
    setCustomPrompt('');
    setAnalysis(null);
    setLanguage('ar');
  };

  const handleAddStudy = (study: string) => {
    if (study && !customStudies.includes(study)) {
      setCustomStudies([...customStudies, study]);
    }
  };

  const handleRemoveStudy = (study: string) => {
    setCustomStudies(customStudies.filter(s => s !== study));
  };

  const toggleIndicator = (key: keyof typeof indicators) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpdateParam = (key: string, field: string, value: number) => {
    setIndicatorParams(prev => ({
      ...prev,
      [key]: {
        ...(prev as any)[key],
        [field]: value
      }
    }));
  };

  const handleAnalyze = async () => {
    const elementToCapture = captureAreaRef.current || chartAreaRef.current;
    if (!elementToCapture) return;
    
    // Validate Groq Key if needed
    if (selectedModel.startsWith('groq/') && (!groqApiKey || !groqApiKey.startsWith('gsk_'))) {
      setAnalysis('⚠️ **مفتاح Groq API مفقود أو غير صالح**\n\nيرجى إدخال مفتاح API صالح يبدأ بـ `gsk_` في قسم "إعدادات API" بالجانب الأيمن لتتمكن من استخدام هذا النموذج.');
      if (!isSidebarOpen) setIsSidebarOpen(true);
      return;
    }
    
    setIsAnalyzing(true);
    setAnalysis(null);
    setActiveView('analysis');
    
    try {
      // Small delay to ensure any layout shifts are done
      await new Promise(r => setTimeout(r, 100));

      const imageData = await domToPng(elementToCapture, {
        backgroundColor: '#131722',
        scale: 1.5, // Slightly lower scale for faster processing and better compatibility
        width: captureAreaRef.current ? 1000 : undefined,
        height: captureAreaRef.current ? 600 : undefined
      });

      if (!imageData || imageData.length < 100) {
        throw new Error('Failed to capture chart image');
      }

      const payload = { 
        symbol, 
        timeframe,
        image: imageData,
        data,
        model: selectedModel,
        groqApiKey,
        indicatorParams,
        customPrompt: customPrompt 
          ? (strategyPrompt ? `${customPrompt}\n\n${strategyPrompt}` : customPrompt) 
          : strategyPrompt,
        customStudies
      };

      // Detect Capacitor Android context
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

      // Send to server for Gemini analysis
      const response = await fetch(`${proxyBaseUrl}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      
      if (response.status === 401 || result.code === 'INVALID_API_KEY') {
        setAnalysis(`⚠️ **مفتاح API غير صالح**
        
النموذج المختار (${selectedModel}) يحتاج لمفتاح Groq صالح. المفتاح الحالي تم رفضه من قبل المزود. 

يرجى التأكد من المفتاح في الإعدادات.`);
        return;
      }

      if (response.status === 429 || response.status === 503 || result.code === 'QUOTA_EXHAUSTED' || result.code === 'SERVICE_UNAVAILABLE') {
        const lastMod = result.lastModel || selectedModel;
        setAnalysis(`⚠️ **عذراً، المحلل يواجه ضغطاً كبيراً حالياً**
        
لقد حاول النظام استخدام عدة نماذج بديلة (آخرها: ${lastMod}) لكنها جميعاً مشغولة حالياً. يرجى:
1. الانتظار لمدة 30-60 ثانية.
2. المحاولة مرة أخرى، وسنكون جاهزين لتحليل الشارت الخاص بك.

*تلميح: يمكنك تجربة نماذج Groq إذا كان لديك مفتاح API، فهي عادة ما تكون أسرع في أوقات الذروة.*`);
        return;
      }

      if (result.error) throw new Error(result.error);
      
      setAnalysis(result.analysis);
      setAnalyzingModel(result.model || selectedModel);
    } catch (error: any) {
      console.error('Analysis failed:', error);
      setAnalysis(`فشل التحليل: ${error.message || 'عذراً، حدث خطأ غير متوقع. حاول مرة أخرى لاحقاً.'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`flex h-screen w-screen bg-[#131722] text-[#d1d4dc] font-sans selection:bg-blue-500/30 overflow-hidden ${language === 'ar' ? 'dir-rtl' : 'dir-ltr'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* PWA Direct Installation Assistant Banner */}
      <AnimatePresence>
        {showPwaBanner && !isStandalone && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed bottom-6 ${language === 'ar' ? 'right-6' : 'left-6'} left-6 right-6 md:left-auto md:w-[400px] bg-[#1e222d] border border-blue-500/20 rounded-3xl p-6 shadow-2xl z-[99999] overflow-hidden`}
            style={{
              boxShadow: '0 20px 50px -12px rgba(37, 99, 235, 0.35)',
            }}
          >
            {/* Background design elements */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between text-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl text-blue-400 border border-blue-500/10">
                    <Smartphone size={24} className="animate-pulse" />
                  </div>
                  <div className="text-start">
                    <h4 className="font-extrabold text-white text-md">
                      {language === 'ar' ? 'تثبيت التطبيق على الجوال' : 'Install on Your Device'}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-mono">
                      PROGRESSIVE WEB APP (PWA)
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePwaDismiss}
                  className="p-1 px-1.5 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-all border border-transparent hover:border-white/5 cursor-pointer text-xs flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Instructions and Description */}
              <div className="text-start text-xs text-gray-400 leading-relaxed bg-[#131722]/60 p-4 rounded-2xl border border-white/5 space-y-3">
                <p>
                  {language === 'ar'
                    ? 'قم بتحويل المحلل الفني الفائق إلى تطبيق جوال حقيقي مدمج وثابت على هاتفك لتتلقى التنبيهات مع استهلاك منخفض جداً للبطارية!'
                    : 'Transform this professional analyst into a native, high-performance standalone app on your home screen today!'}
                </p>

                {isIos ? (
                  /* Custom step guide for Apple iOS users */
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <p className="font-bold text-gray-200">
                      {language === 'ar' ? 'للآيفون والآيباد (iOS):' : 'For iPhone & iPad (iOS):'}
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 ml-2 mr-2 text-[11px] text-gray-300">
                      <li>
                        {language === 'ar' ? 'اضغط على زر المشاركة' : 'Tap the Share icon'}{' '}
                        <Share size={12} className="inline text-blue-400 mx-1" />{' '}
                        {language === 'ar' ? 'في متصفح سفاري.' : 'in your Safari navigator.'}
                      </li>
                      <li>
                        {language === 'ar' ? 'اسحب للأسفل واختر' : 'Scroll down and tap'}{' '}
                        <span className="font-bold text-blue-400">
                          {language === 'ar' ? 'إضافة للشاشة الرئيسية' : 'Add to Home Screen'}
                        </span>{' '}
                        <PlusSquare size={12} className="inline text-blue-400 mx-1" />.
                      </li>
                      <li>
                        {language === 'ar' ? 'انقر على "إضافة" في الأعلى لتثبيته فوراً!' : 'Tap "Add" on the top right to install instantly!'}
                      </li>
                    </ol>
                  </div>
                ) : (
                  /* Custom instructions for Android/Chrome/PC users */
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <p className="font-bold text-gray-200 text-[11px]">
                      {language === 'ar' ? 'طريقة التثبيت السريع:' : 'Quick Installation steps:'}
                    </p>
                    <p className="text-[11px]">
                      {deferredPrompt 
                        ? (language === 'ar' ? 'انقر على زر "تثبيت الآن" بالأسفل لبدء التثبيت المباشر بنقرة واحدة.' : 'Tap the "Install Now" button below to load the application package instantly.')
                        : (language === 'ar' ? 'افتح قائمة الخيارات (المثلث أو الثلاث نقاط الأعلى) بالمتصفح، ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".' : 'Click your browser menu options (three dots beside navigation bar), then choose "Install App" or "Add to Home Screen" option.')
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                {deferredPrompt ? (
                  <button
                    onClick={handlePwaInstall}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Download size={14} />
                    <span>{language === 'ar' ? 'تثبيت الآن كتطبيق' : 'Install Standalone App'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePwaDismiss}
                    className="flex-1 py-3 px-4 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Check size={14} />
                    <span>{language === 'ar' ? 'فهمت المعنى' : 'Got it, thanks'}</span>
                  </button>
                )}
                
                <button
                  onClick={handlePwaDismiss}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-bold border border-white/5 cursor-pointer transition-all active:scale-95"
                >
                  {language === 'ar' ? 'لاحقاً' : 'Later'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <header className="lg:hidden h-16 border-b border-[#2a2e39] bg-[#1e222d] flex items-center justify-between px-4 z-30 w-full fixed top-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-white/5 rounded-lg text-white"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-lg text-white">{t.appTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="p-2 border border-[#2a2e39] bg-[#1e222d] text-xs font-bold rounded-lg text-blue-400 hover:text-white transition-all flex items-center gap-1"
          >
            <Globe size={14} />
            <span>{language === 'ar' ? 'EN' : 'العربية'}</span>
          </button>
          <button 
            onClick={handleRefresh}
            className="p-2 text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 rounded-lg border border-blue-600/30">
            <span className="text-blue-400 font-mono text-sm font-bold">{symbol}</span>
          </div>
        </div>
      </header>

      {/* Sidebar - Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Content */}
      <aside className={`
        fixed lg:static inset-y-0 ${language === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} w-72 bg-[#1e222d] border-[#2a2e39] z-50 
        transition-transform duration-300 transform 
        ${isSidebarOpen ? 'translate-x-0' : (language === 'ar' ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')}
        flex flex-col p-6
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
              <TrendingUp size={22} className="text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white uppercase italic">PRO TRADER v2</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400">
            <X size={20} />
          </button>
        </div>

        {/* Language Switcher Section */}
        <div className="mb-6 flex items-center justify-between p-3 bg-black/20 rounded-xl border border-[#2a2e39]/50">
          <span className="text-[10px] uppercase font-black tracking-tight text-gray-500 flex items-center gap-1.5">
            <Globe size={12} />
            <span>{t.languageToggle}</span>
          </span>
          <div className="flex bg-[#131722] p-0.5 rounded-lg border border-[#2a2e39]">
            <button
              onClick={() => setLanguage('ar')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                language === 'ar'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              العربية
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                language === 'en'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              English
            </button>
          </div>
        </div>

        <div className="mb-6 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="flex flex-col text-start">
            <span className="text-[10px] font-black text-green-500 uppercase tracking-tighter">{t.aiStatusLabel}</span>
            <span className="text-xs text-white font-bold">{t.aiStatus}</span>
          </div>
        </div>

        <nav className="space-y-8 flex-1 overflow-y-auto custom-scrollbar pr-1">
          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 block text-start">
              {t.aiModel}
            </label>
            <div className="space-y-2 mb-6">
              {[
                { id: 'gemini-3.1-flash-lite', label: language === 'ar' ? 'Gemini 3.1 Flash (الافتراضي)' : 'Gemini 3.1 Flash (Default)', description: language === 'ar' ? 'أحدث نسخة - فلاش 3.1 لايت' : 'Latest version - Flash 3.1 Lite' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedModel(m.id); setIsSidebarOpen(false); }}
                  className={`w-full text-start px-4 py-3 rounded-xl border transition-all ${
                    selectedModel === m.id 
                      ? 'bg-indigo-600/20 border-indigo-600/40 text-white' 
                      : 'border-transparent text-gray-500 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-start">{m.label}</p>
                      <p className="text-[10px] opacity-60 text-start">{m.description}</p>
                    </div>
                    {selectedModel === m.id && <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse mr-2 ml-2" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 block text-start">
              {t.availableMarkets}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { name: 'PAXGUSDT', label: t.gold }
              ].map((s) => (
                <button
                  key={s.name}
                  onClick={() => { setSymbol(s.name); setIsSidebarOpen(false); }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all border ${
                    symbol === s.name 
                      ? 'bg-blue-600/20 text-blue-400 border-blue-600/40 shadow-inner' 
                      : 'hover:bg-white/5 text-gray-400 border-transparent'
                  }`}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-bold text-xs opacity-50">{s.label}</span>
                    <span className="font-medium text-sm">{s.name}</span>
                  </div>
                  {symbol === s.name && <motion.div layoutId="symbol-active" className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 block text-start">
              {t.timeframeLabel}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['1m', '5m', '15m', '30m', '1h', '4h', '1d'].map((itv) => (
                <button
                  key={itv}
                  onClick={() => { setTimeframe(itv); setIsSidebarOpen(false); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all border ${
                    timeframe === itv
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-black/20 text-gray-400 border-transparent hover:bg-white/5'
                  }`}
                >
                  {itv}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 block flex items-center gap-2 text-start">
              <Zap size={12} className="text-blue-400" />
              {t.customLogicLabel}
            </label>
            <div className="space-y-3">
              <textarea 
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder={t.customLogicPlaceholder}
                className="w-full bg-[#131722] border border-[#2a2e39] text-gray-300 text-[11px] p-3 rounded-xl focus:outline-none focus:border-blue-500/50 min-h-[100px] resize-none leading-relaxed text-start"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 block text-start flex items-center gap-1.5">
              <Smartphone size={12} className="text-blue-400" />
              <span>{language === 'ar' ? 'تثبيت التطبيق وميزات PWA' : 'App Setup & PWA Install'}</span>
            </label>
            <div className="p-4 bg-black/20 rounded-xl border border-[#2a2e39] mb-4 text-start space-y-3">
              {isStandalone ? (
                <div className="py-1.5 px-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-bold flex items-center gap-2 justify-center">
                  <Check size={14} />
                  <span>{language === 'ar' ? 'تطبيق مثبت ومفعّل' : 'Standalone App Active'}</span>
                </div>
              ) : (
                <button
                  onClick={handleResetPwaPrompt}
                  className="w-full py-2.5 bg-blue-600/15 hover:bg-blue-600/30 text-blue-400 hover:text-white rounded-lg text-[10.5px] font-black border border-blue-600/20 hover:border-blue-500/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download size={12} />
                  <span>{language === 'ar' ? 'تثبيت التطبيق على الجوال' : 'Install Standalone App'}</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 block text-start">
               {t.infoLabel}
            </label>
            <div className="p-4 bg-black/20 rounded-xl border border-[#2a2e39] mb-4 text-start">
              <button 
                onClick={handleResetDefaults}
                className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-bold text-gray-500 hover:text-white border border-gray-600/30 hover:border-gray-500 rounded-lg transition-all"
              >
                <RotateCcw size={12} />
                {t.restoreDefaults}
              </button>
            </div>
            
            <button 
              onClick={handleSaveSettings}
              className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                showSaveSuccess 
                  ? 'bg-green-600/20 text-green-400 border border-green-600/40' 
                  : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
              }`}
            >
              {showSaveSuccess ? <Check size={14} /> : <Save size={14} />}
              {showSaveSuccess ? t.saveSuccess : t.saveSettings}
            </button>
          </div>
        </nav>

        <div className="mt-8 pt-6 border-t border-[#2a2e39]">
          <button 
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={`
              w-full py-4 px-4 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all
              ${isAnalyzing 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-600/30 active:scale-[0.98]'}
            `}
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
            {isAnalyzing ? t.analyzingState : t.analyzeBtn}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-[#131722] relative pt-16 lg:pt-0 animate-fade-in">
        {/* Desktop Top Header */}
        <header className="hidden lg:flex h-16 border-b border-[#2a2e39] bg-[#1e222d]/60 backdrop-blur-xl sticky top-0 z-20 items-center justify-between px-8">
          <div className="flex items-center gap-6">
            <h2 className="text-base font-bold text-white flex items-center gap-3">
              <div className="px-3 py-1 bg-blue-600/10 rounded-lg border border-blue-600/20 text-blue-400">
                {symbol}
              </div>
              <span className="text-gray-500 font-medium">{language === 'ar' ? 'بيانات حية من بينانس' : 'Binance Real-Time'}</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-all duration-300 ${
              wsConnected 
                ? 'bg-[#10b981]/5 border-[#10b981]/10 text-[#10b981]' 
                : 'bg-[#f59e0b]/5 border-[#f59e0b]/10 text-[#f59e0b]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-[#10b981] animate-ping' : 'bg-[#f59e0b] animate-pulse'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono flex items-center gap-1">
                <Zap size={10} className={wsConnected ? 'fill-[#10b981] text-[#10b981]' : 'fill-[#f59e0b] text-[#f59e0b]'} />
                {wsConnected ? t.liveStreamWs : t.liveStreamRest}
              </span>
            </div>
            
            {/* Desktop Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="p-2.5 border border-[#2a2e39] bg-[#1e222d]/60 text-xs font-bold rounded-xl text-blue-400 hover:text-white transition-all flex items-center gap-1.5 shadow"
            >
              <Globe size={14} />
              <span>{language === 'ar' ? 'EN' : 'العربية'}</span>
            </button>

            <button 
              onClick={handleRefresh}
              className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all group"
              title={language === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform duration-500'} />
            </button>
            <div className="flex items-center gap-8 px-6 py-2 bg-black/40 rounded-2xl border border-[#2a2e39]">
               <div className="text-right">
                 <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">{t.livePrice}</p>
                 <AnimatePresence mode="wait">
                   <motion.p 
                     key={data.length > 0 ? data[data.length-1].close : '0'}
                     initial={{ y: 2, opacity: 0 }}
                     animate={{ y: 0, opacity: 1 }}
                     className="text-sm text-green-400 font-mono font-bold"
                   >
                     {data.length > 0 ? data[data.length-1].close.toLocaleString() : '---'}
                   </motion.p>
                 </AnimatePresence>
               </div>
               <div className="h-6 w-px bg-gray-800" />
               <div className="text-right">
                 <p className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">{t.volume}</p>
                 <p className="text-sm text-white font-mono font-bold">1.24B</p>
               </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-6">
          {/* Segmented Tab Switcher */}
          <div className="flex border-b border-[#2a2e39]/50 gap-4 md:gap-6 pb-px justify-start items-center relative mb-6">
            <button
              type="button"
              onClick={() => setActiveView('chart')}
              className={`pb-3 text-xs md:text-sm font-black transition-all relative ${
                activeView === 'chart' ? 'text-blue-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <BarChart3 size={16} />
                <span>{language === 'ar' ? 'الرسم البياني وتفاعل الأسعار' : 'Interactive Price Chart'}</span>
              </span>
              {activeView === 'chart' && (
                <motion.div layoutId="app-view-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView('strategy')}
              className={`pb-3 text-xs md:text-sm font-black transition-all relative ${
                activeView === 'strategy' ? 'text-blue-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <BrainCircuit size={16} />
                <span>{language === 'ar' ? 'لوحة تقييم وصناعة الاستراتيجيات' : 'Strategy Build & Evaluate'}</span>
              </span>
              {activeView === 'strategy' && (
                <motion.div layoutId="app-view-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>

            {(analysis || isAnalyzing) && (
              <button
                type="button"
                onClick={() => setActiveView('analysis')}
                className={`pb-3 text-xs md:text-sm font-black transition-all relative ${
                  activeView === 'analysis' ? 'text-blue-400' : 'text-gray-500 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Activity className={`w-4 h-4 text-blue-400 ${isAnalyzing ? 'animate-pulse' : ''}`} />
                  <span>{language === 'ar' ? 'تقرير التحليل الفني والذكي' : 'Expert AI Analysis Report'}</span>
                  {isAnalyzing && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                    </span>
                  )}
                </span>
                {activeView === 'analysis' && (
                  <motion.div layoutId="app-view-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeView === 'chart' && (
              <motion.div
                key="custom-chart"
                initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: 16, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                className="space-y-6"
              >
                {/* Chart Container */}
                <div 
                  ref={chartAreaRef} 
                  className="bg-[#1e222d] rounded-2xl p-4 lg:p-6 border border-[#2a2e39] relative"
                  id="chart-capture-area"
                >
                  <div className="flex items-center justify-between mb-4 lg:hidden">
                     <span className="text-xs font-bold text-[#6b7280] uppercase">{symbol} CHART</span>
                     <button onClick={handleAnalyze} className="p-2 bg-[#2563eb]/20 text-[#60a5fa] rounded-lg">
                        <Camera size={18} />
                     </button>
                  </div>
                  {loading ? (
                    <SkeletonLoader type="chart" />
                  ) : (
                    <>
                      <Suspense fallback={<SkeletonLoader type="chart" />}>
                        <TradingChart 
                          symbol={symbol} 
                          timeframe={timeframe} 
                          studies={memoizedStudies}
                        />
                      </Suspense>

                      {/* Premium AI Chart Analysis Button directly under the chart */}
                      <div className="mt-5 flex justify-center w-full">
                        <motion.button
                          whileHover={{ scale: 1.015, filter: 'brightness(1.1)' }}
                          whileTap={{ scale: 0.985 }}
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className={`
                            w-full py-4 px-6 rounded-2xl flex items-center justify-center gap-3 font-bold text-xs uppercase tracking-wider transition-all duration-300 border cursor-pointer
                            ${isAnalyzing
                              ? 'bg-gray-850 text-gray-500 cursor-not-allowed border-white/5 shadow-none'
                              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-blue-500/30'
                            }
                          `}
                          style={{
                            boxShadow: isAnalyzing ? 'none' : '0 10px 30px -10px rgba(79, 70, 229, 0.45)',
                          }}
                        >
                          {isAnalyzing ? (
                            <Loader2 className="animate-spin" size={18} />
                          ) : (
                            <BrainCircuit className="animate-pulse" size={18} />
                          )}
                          <span>
                            {isAnalyzing 
                              ? (language === 'ar' ? 'جاري تحليل الشمعات والمؤشرات فنياً...' : 'ANALYZING LIVE MARKET INDICATORS & CANDLES...') 
                              : (language === 'ar' ? 'البدء في التحليل الفني والمالي الاحترافي بالذكاء الاصطناعي' : 'Generate Expert AI Technical & Financial Analysis')}
                          </span>
                        </motion.button>
                      </div>

                      {/* Fractal Levels Dashboard Section */}
                      {indicators.fractal && clientFractals.resistance.length > 0 && (
                        <div className="space-y-6 mt-6">
                          {/* Fractal Breakout Alarms Control Panel */}
                          <div className="bg-[#131722] rounded-2xl p-6 border border-blue-500/10 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2a2e39]/50 pb-5 mb-5 text-start">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                                  <Bell size={20} className={fractalAlertEnabled ? "animate-pulse" : ""} />
                                </div>
                                <div>
                                  <h4 className="font-bold text-white text-sm">
                                    {language === 'ar' ? 'نظام إنذار اختراق الفركتلات الفوري' : 'Real-time Fractal Breakout Alert System'}
                                  </h4>
                                  <p className="text-[10px] text-gray-500 mt-0.5">
                                    {language === 'ar' 
                                      ? 'تلقي إشعارات متصفح وصوتية فورية عندما يتخطى السعر مستوى المقاومة الأخير للفركتل' 
                                      : 'Receive instant browser and audio alerts when price breaks above the last fractal resistance'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                {/* Alert toggle */}
                                <button
                                  onClick={handleToggleAlerts}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                    fractalAlertEnabled 
                                      ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/20' 
                                      : 'bg-black/20 border-gray-700/80 text-gray-400 hover:text-white hover:bg-black/30'
                                  }`}
                                >
                                  {fractalAlertEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                                  <span>
                                    {fractalAlertEnabled 
                                      ? (language === 'ar' ? 'الإنذار مفعل' : 'Alarms Active') 
                                      : (language === 'ar' ? 'تفعيل الإنذار' : 'Enable Alarms')}
                                  </span>
                                </button>

                                {/* Sound Toggle */}
                                <button
                                  onClick={handleToggleSound}
                                  title={language === 'ar' ? 'تفعيل/كتم صوت جرس التنبيه' : 'Mute/Unmute audio alert tone'}
                                  className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                    soundEnabled 
                                      ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                      : 'bg-black/20 border-gray-700/80 text-gray-500 hover:text-gray-400'
                                  }`}
                                >
                                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                                </button>

                                {/* Trigger Test Alarm */}
                                <button
                                  onClick={triggerTestAlert}
                                  className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-indigo-500/20 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                                >
                                  {language === 'ar' ? 'تجربة إشارة التنبيه' : 'Test Alert Trigger'}
                                </button>
                              </div>
                            </div>

                            {/* Alert Status Info Badge */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-3.5 bg-black/40 rounded-xl border border-[#2a2e39]/50 text-start flex items-start gap-3">
                                <div className="p-1.5 bg-[#1e222d] rounded-lg text-gray-400 mt-0.5">
                                  <AlertCircle size={15} />
                                </div>
                                <div className="text-xs">
                                  <div className="font-semibold text-gray-300">
                                    {language === 'ar' ? 'إذن إشعارات المتصفح' : 'Web Browser Permissions'}
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1.5">
                                    <span className={`inline-block w-2 h-2 rounded-full ${
                                      notificationPermissionState === 'granted' 
                                        ? 'bg-emerald-500' 
                                        : notificationPermissionState === 'denied' 
                                          ? 'bg-red-500' 
                                          : 'bg-amber-500'
                                    }`} />
                                    <span>
                                      {notificationPermissionState === 'granted' 
                                        ? (language === 'ar' ? 'مسموح بها بالكامل للإنذارات' : 'Allowed / Active') 
                                        : notificationPermissionState === 'denied' 
                                          ? (language === 'ar' ? 'مرفوضة! يرجى السماح بالإشعارات من قفل المتصفح' : 'Denied! Please grant permission in browser controls') 
                                          : (language === 'ar' ? 'غير مسجلة (سيطلب الإذن عند التفعيل)' : 'Default / Click enable to request')}
                                    </span>
                                  </div>
                                  {notificationPermissionState === 'default' && (
                                    <button 
                                      onClick={requestNotificationPermission}
                                      className="text-blue-400 hover:text-blue-300 underline font-semibold text-[10px] block mt-1.5"
                                    >
                                      {language === 'ar' ? 'اطلب إذن المتصفح يدوياً وكامل الصلاحية' : 'Manually Request Browser Permission'}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="p-3.5 bg-black/40 rounded-xl border border-[#2a2e39]/50 text-start flex items-start gap-3">
                                <div className="p-1.5 bg-[#1e222d] rounded-lg text-gray-400 mt-0.5">
                                  <TrendingUp size={15} />
                                </div>
                                <div className="text-xs">
                                  <div className="font-semibold text-gray-300">
                                    {language === 'ar' ? 'المستوى المستهدف الحالي للكسر' : 'Active Target Resistance Level'}
                                  </div>
                                  <div className="text-[10px] text-gray-500 mt-1">
                                    {clientFractals.resistance[0] ? (
                                      <span className="font-mono">
                                        {language === 'ar' ? 'سعر كسر الفركتل المقاوم:' : 'Ceiling level breakout target:'}{" "}
                                        <b className="text-red-400 text-xs">{clientFractals.resistance[0].value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}</b>
                                        {" "} ({language === 'ar' ? 'أحدث سقف فركتل' : 'latest high'})
                                      </span>
                                    ) : (
                                      <span>{language === 'ar' ? 'غير متوفر' : 'Not available'}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Triggered Alarms History Ledger */}
                            {inAppAlerts.length > 0 && (
                              <div className="mt-5 border-t border-[#2a2e39]/30 pt-4">
                                <div className="flex items-center justify-between mb-3 text-start">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    {language === 'ar' ? 'سجل التنبيهات الأخيرة' : 'Recent Alarms History'}
                                  </span>
                                  <button
                                    onClick={() => setInAppAlerts([])}
                                    className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Trash2 size={12} />
                                    <span>{language === 'ar' ? 'مسح السجل' : 'Clear ledger'}</span>
                                  </button>
                                </div>

                                <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                  <AnimatePresence initial={false}>
                                    {inAppAlerts.map((alert) => (
                                      <motion.div
                                        key={alert.id}
                                        initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="p-3 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between text-start gap-3 font-mono"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className={`p-1.5 rounded-lg mt-0.5 ${
                                            alert.type === 'test' 
                                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          }`}>
                                            <Bell size={12} />
                                          </div>
                                          <div>
                                            <div className="text-xs font-bold text-gray-200">{alert.title}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{alert.body}</div>
                                          </div>
                                        </div>
                                        <div className="flex flex-col items-end flex-shrink-0 text-right">
                                          <span className="text-[9px] text-gray-500">
                                            {new Date(alert.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                          </span>
                                          <span className="text-[9px] text-purple-400 font-bold mt-1 bg-purple-500/5 px-1.5 py-0.5 rounded border border-purple-500/10">
                                            {alert.type === 'test' ? (language === 'ar' ? 'اختبار تجريبي' : 'Test Signal') : (language === 'ar' ? 'تجاوز المقاومة' : 'Ceiling Breached')}
                                          </span>
                                        </div>
                                      </motion.div>
                                    ))}
                                  </AnimatePresence>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Columns displaying resistance and support */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Resistance Levels Highs */}
                            <div className="bg-[#131722] rounded-2xl p-6 border border-red-500/10 shadow-lg relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500">
                                  <TrendingUp size={18} className="rotate-45" />
                                </div>
                                <div className="text-start">
                                  <h4 className="font-bold text-white text-sm text-start">{language === 'ar' ? 'مستويات مقاومة الفركتلات (العلوية)' : 'Williams Fractal Resistance (Highs)'}</h4>
                                  <p className="text-[10px] text-gray-500 text-start">{language === 'ar' ? 'حواجز مقاومة السعر التي حددها نموذج الفركتل' : 'Price resistance barriers detected by fractal model'}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                {clientFractals.resistance.map((lvl, index) => {
                                  const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
                                  const gapPercent = ((lvl.value - lastPrice) / lastPrice) * 100;
                                  return (
                                    <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-[#2a2e39]/50 hover:border-red-500/20 transition-all font-mono">
                                      <div className="flex flex-col text-start">
                                        <span className="text-[10px] text-gray-500">{language === 'ar' ? 'مقاومة #' : 'Resistance #'}{index + 1}</span>
                                        <span className="text-sm font-semibold text-red-400 font-bold text-start">
                                          {lvl.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                                        </span>
                                      </div>
                                      <div className={`${language === 'ar' ? 'text-left' : 'text-right'} flex flex-col items-end`}>
                                        <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase font-bold mb-1">
                                          {gapPercent >= 0 ? `+${gapPercent.toFixed(2)}%` : `${gapPercent.toFixed(2)}%`}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-mono">
                                          {new Date(lvl.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Support Levels Lows */}
                            <div className="bg-[#131722] rounded-2xl p-6 border border-green-500/10 shadow-lg relative overflow-hidden">
                              <div className="absolute bottom-0 left-0 w-32 h-32 bg-green-500/5 rounded-full blur-2xl pointer-events-none" />
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20 text-green-500">
                                  <TrendingUp size={18} className="translate-y-0.5" />
                                </div>
                                <div className="text-start">
                                  <h4 className="font-bold text-white text-sm text-start">{language === 'ar' ? 'مستويات دعم الفركتلات (السفلية)' : 'Williams Fractal Support (Lows)'}</h4>
                                  <p className="text-[10px] text-gray-500 text-start">{language === 'ar' ? 'مستويات الدعم وحماية السعر المحسوبة' : 'Calculated support and price floor barriers'}</p>
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                {clientFractals.support.map((lvl, index) => {
                                  const lastPrice = data.length > 0 ? data[data.length - 1].close : 0;
                                  const gapPercent = ((lvl.value - lastPrice) / lastPrice) * 100;
                                  return (
                                    <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-[#2a2e39]/50 hover:border-green-500/20 transition-all font-mono">
                                      <div className="flex flex-col text-start">
                                        <span className="text-[10px] text-gray-500">{language === 'ar' ? 'دعم #' : 'Support #'}{index + 1}</span>
                                        <span className="text-sm font-semibold text-green-400 font-bold text-start">
                                          {lvl.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 5 })}
                                        </span>
                                      </div>
                                      <div className={`${language === 'ar' ? 'text-left' : 'text-right'} flex flex-col items-end`}>
                                        <span className="text-[9px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded uppercase font-bold mb-1">
                                          {gapPercent >= 0 ? `+${gapPercent.toFixed(2)}%` : `${gapPercent.toFixed(2)}%`}
                                        </span>
                                        <span className="text-[9px] text-gray-500 font-mono">
                                          {new Date(lvl.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Unified inline bottom switcher hint */}
                      <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 text-start">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                            <BrainCircuit size={20} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-white text-sm text-start">{language === 'ar' ? 'هل تود فحص شروطك الفنية واختبار استراتيجيتك؟' : 'Ready to evaluate indicators and build your custom strategy?'}</h4>
                            <p className="text-[10.5px] text-gray-400 mt-0.5 text-start">{language === 'ar' ? 'انتقل للوحة تصميم الاستراتيجيات ومقارنة نتائج المؤشرات مع الأسعار الحية.' : 'Switch to the custom Strategy Designer panel to examine criteria under live rates.'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveView('strategy')}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all shadow-lg shadow-blue-600/15"
                        >
                          {language === 'ar' ? 'فتح لوحة التقييم الكاملة' : 'Open Evaluator Board'}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Floating Analyze Button for Mobile */}
                <div className="lg:hidden fixed bottom-6 left-6 right-6 z-30">
                   <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || loading}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 font-bold disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <BrainCircuit size={20} />}
                    {isAnalyzing ? t.analyzingState : t.analyzeBtn}
                  </button>
                </div>
              </motion.div>
            )}

            {activeView === 'strategy' && (
              <motion.div
                key="strategy-dashboard"
                initial={{ opacity: 0, x: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                className="space-y-6"
              >
                {/* Advanced Dashboard Header Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Card 1: Evaluation Metrics */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-2xl relative overflow-hidden flex items-center justify-between text-start">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block text-start">{language === 'ar' ? 'حالة قاعدة البيانات الحية' : 'Live Cache Candles'}</span>
                      <h3 className="text-xl font-extrabold text-white font-mono mt-1 text-start">
                        {data.length} <span className="text-xs text-gray-400 font-bold">{language === 'ar' ? 'شمعة مؤرشفة' : 'archived bars'}</span>
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5 text-start">{language === 'ar' ? `مزامنة تامة عبر ${timeframe}` : `Synced across ${timeframe}`}</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400 font-bold font-mono text-xs uppercase mr-2 ml-2">
                      {symbol}
                    </div>
                  </div>

                  {/* Card 2: Current Market Price Counter */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-2xl relative overflow-hidden flex items-center justify-between text-start">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div>
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block text-start">{language === 'ar' ? 'سعر التداول المباشر' : 'Live Market Price'}</span>
                      <h3 className="text-xl font-extrabold text-emerald-400 font-mono mt-1 text-start">
                        {data.length > 0 ? data[data.length - 1].close.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '---'}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5 text-start">{language === 'ar' ? 'تحديث فوري عبر WebSocket بث مباشر' : 'Real-time WebSocket active stream'}</p>
                    </div>
                    <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                      <TrendingUp size={20} />
                    </div>
                  </div>

                  {/* Card 3: Dashboard Quick Actions */}
                  <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-5 shadow-2xl relative overflow-hidden flex items-center justify-between text-start">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="text-start">
                      <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest block text-start">{language === 'ar' ? 'مشروع صناعة الاستراتيجيات' : 'Strategy Builder Space'}</span>
                      <p className="text-xs text-white font-extrabold mt-1 text-start">{language === 'ar' ? 'صمّم واختبر شروطك وقارنها بالذكاء الاصطناعي' : 'Build, save and test criteria under Gemini'}</p>
                      <button
                        onClick={() => setActiveView('chart')}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-bold mt-1 block hover:underline text-start px-0 border-0 bg-transparent"
                      >
                        {language === 'ar' ? '← العودة لخط السعر والرسم البياني' : '← Return to Interactive Chart'}
                      </button>
                    </div>
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                      <Activity size={20} />
                    </div>
                  </div>
                </div>

                {/* Main full-screen wide StrategySuite container */}
                <div role="region" aria-label="Strategy Maker Dashboard" className="bg-[#1e222d] rounded-2xl p-6 border border-[#2a2e39] shadow-3xl">
                  <Suspense fallback={<SkeletonLoader type="strategy" />}>
                    <StrategySuite 
                      data={data}
                      activeStrategyId={activeStrategyId}
                      setActiveStrategyId={setActiveStrategyId}
                      onStrategyChange={setStrategyPrompt}
                      language={language}
                      indicators={indicators}
                      setIndicators={setIndicators}
                      indicatorParams={indicatorParams}
                      setIndicatorParams={setIndicatorParams}
                      customStudies={customStudies}
                      setCustomStudies={setCustomStudies}
                      onNavigateToChart={() => setActiveView('chart')}
                      symbol={symbol}
                    />
                  </Suspense>
                </div>
              </motion.div>
            )}

            {activeView === 'analysis' && (
              <motion.div
                key="analysis-dashboard"
                initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -16, filter: 'blur(4px)' }}
                transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
                className="space-y-6"
              >
                {/* Advanced Dynamic AI Analysis Report with embedded strategy evaluation details */}
                <div 
                  style={{ backgroundColor: 'rgba(37, 99, 235, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}
                  className="border rounded-3xl p-6 lg:p-8 relative overflow-hidden group shadow-3xl bg-[#1e222d]"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <BrainCircuit size={140} />
                  </div>
                  
                  {/* Top bar with signal badge, models information, and actions */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2a2e39]/50 pb-6 mb-6">
                    <div className="flex items-center gap-3 text-start">
                      <div className={`p-3 rounded-xl ${
                        analysis && (analysis.includes('شراء') || analysis.includes('BUY')) ? 'bg-green-600 shadow-lg shadow-green-500/10' : 
                        analysis && (analysis.includes('بيع') || analysis.includes('SELL')) ? 'bg-red-600 shadow-lg shadow-red-500/10' : 'bg-blue-600 shadow-lg shadow-blue-500/10'
                      }`}>
                        <Activity size={22} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-white text-xl tracking-tight">
                          {t.technicalReport}
                        </h3>
                        {analyzingModel && (
                          <p className="text-[10.5px] text-blue-400 font-mono mt-0.5">
                            {t.byModel}: <span className="font-bold">{analyzingModel}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {isAnalyzing ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 font-mono text-xs">
                          <Loader2 className="animate-spin" size={13} />
                          <span>{language === 'ar' ? 'جاري التحليل السحابي...' : 'Computing Report...'}</span>
                        </div>
                      ) : (
                        <>
                          {analysis && (analysis.includes('شراء') || analysis.includes('BUY')) && (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-xl animate-pulse">
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                              <span className="text-[11px] font-black text-green-400 uppercase tracking-widest">{t.buySignal}</span>
                            </div>
                          )}
                          {analysis && (analysis.includes('بيع') || analysis.includes('SELL')) && (
                            <div className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-xl animate-pulse">
                              <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                              <span className="text-[11px] font-black text-red-400 uppercase tracking-widest">{t.sellSignal}</span>
                            </div>
                          )}
                          {analysis && (analysis.includes('مشغول') || analysis.includes('تجاوزت')) && (
                            <button 
                              onClick={handleAnalyze}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              {t.retryNow}
                            </button>
                          )}
                        </>
                      )}

                      {/* Close Analysis Panel View Button */}
                      <button 
                        onClick={() => {
                          setAnalysis(null);
                          setActiveView('chart');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-white/5 active:scale-95 cursor-pointer font-black text-xs"
                      >
                        <span>{language === 'ar' ? 'إغلاق وحذف التقرير الحالي' : 'Close & Reset Current Report'}</span>
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Top Content: Main MarkDown Analysis Report */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-start">
                    {/* Column 1 & 2: Main AI Textual Report */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="text-gray-300 leading-relaxed markdown-dashboard text-sm relative z-10 bg-[#131722]/85 p-6 rounded-2xl border border-[#2a2e39]/50 shadow-2xl overflow-y-auto max-h-[650px]">
                        {isAnalyzing ? (
                          <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 className="animate-spin text-blue-500" size={40} />
                            <p className="text-sm text-gray-400 animate-pulse font-mono">{language === 'ar' ? 'جاري توليد التقرير المالي الذكي...' : 'AI is processing candles and compiling metrics...'}</p>
                          </div>
                        ) : analysis ? (
                          <div className="markdown-body">
                            <ReactMarkdown>{analysis}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="py-12 text-center text-gray-500">
                            {language === 'ar' ? 'لا توجد بيانات تحليل متوفرة.' : 'No available analysis data.'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Column 3: Active Custom Strategy Metrics & Indicators bars */}
                    <div className="space-y-6">
                      {activeStrategy ? (
                        <div className="bg-[#131722]/80 border border-[#2a2e39]/80 p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-full">
                          <div className="space-y-6">
                            {/* Strategy Logo / Intro */}
                            <div className="border-b border-[#2a2e39]/50 pb-4">
                              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block mb-1">
                                {language === 'ar' ? 'الاستراتيجية النشطة المفعلة للتحليل' : 'ACTIVE EVALUATED TECHNICAL STRATEGY'}
                              </span>
                              <h4 className="text-md font-extrabold text-white flex items-center gap-2">
                                <Zap size={14} className="text-yellow-400 shrink-0" />
                                <span className="truncate">{activeStrategy.name}</span>
                              </h4>
                              <p className="text-[10.5px] text-gray-400 mt-1 leading-relaxed line-clamp-2" title={activeStrategy.description}>
                                {activeStrategy.description}
                              </p>
                            </div>

                            {/* Signal Strength & Direction Panel */}
                            <div className="p-4 bg-black/40 rounded-xl border border-[#2a2e39]/30 text-center">
                              <span className="text-[8.5px] font-black text-gray-500 uppercase tracking-widest block mb-2">
                                {language === 'ar' ? 'قوة الاتجاه وإشارة الاستراتيجية الحالية' : 'STRATEGY SIGNAL DIRECTION & FORCE'}
                              </span>
                              
                              <div className="flex flex-col items-center justify-center py-2 space-y-1">
                                {activeStrategyEval ? (
                                  <>
                                    <span className={`text-2xl font-black px-4 py-1.5 rounded-xl uppercase tracking-wider ${
                                      activeStrategyEval.signal === 'BUY' ? 'bg-green-500/10 text-green-400 border border-green-500/20 shadow-green-500/5' :
                                      activeStrategyEval.signal === 'SELL' ? 'bg-red-500/10 text-red-400 border border-red-500/20 shadow-red-500/5' :
                                      'bg-gray-500/10 text-gray-400 border border-white/5'
                                    }`}>
                                      {activeStrategyEval.signal === 'BUY' ? (language === 'ar' ? 'شراء' : 'BUY') : 
                                       activeStrategyEval.signal === 'SELL' ? (language === 'ar' ? 'بيع' : 'SELL') : 
                                       (language === 'ar' ? 'محايد' : 'NEUTRAL')}
                                    </span>
                                    
                                    {/* Strategy Strength Meter progress bar explicitly style */}
                                    <div className="w-full pt-4">
                                      <div className="flex justify-between items-center text-[10px] text-gray-400 mb-1 px-1">
                                        <span>{language === 'ar' ? 'قوة الإشارة الإجمالية:' : 'Consensus Power:'}</span>
                                        <span className="font-mono font-bold text-white">{(activeStrategyEval.score * 100).toFixed(0)}%</span>
                                      </div>
                                      
                                      <div className="w-full h-2.5 bg-[#1a1e2a] rounded-full overflow-hidden p-0.5 border border-white/5">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${activeStrategyEval.score * 100}%` }}
                                          transition={{ duration: 1.2, ease: "easeOut" }}
                                          className={`h-full rounded-full ${
                                            activeStrategyEval.signal === 'BUY' ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-md shadow-green-500/25' :
                                            activeStrategyEval.signal === 'SELL' ? 'bg-gradient-to-r from-red-500 to-orange-400 shadow-md shadow-red-500/25' :
                                            'bg-gradient-to-r from-gray-600 to-slate-400'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                    
                                    <p className="text-[10px] text-gray-500 mt-2 font-mono">
                                      {language === 'ar' ? 
                                        `تم استيفاء ${activeStrategyEval.detailedResults.filter(r => r.isPassed).length} من أصل ${activeStrategy.rules.length} شروط مبرمجة.` : 
                                        `Fulfilled ${activeStrategyEval.detailedResults.filter(r => r.isPassed).length} of ${activeStrategy.rules.length} custom constraints.`
                                      }
                                    </p>
                                  </>
                                ) : (
                                  <span className="text-xs text-gray-500 font-mono">LOADING EVALUATION...</span>
                                )}
                              </div>
                            </div>

                            {/* Indicator Compliance Matrix / Sub-bars list */}
                            <div className="space-y-3">
                              <span className="text-[9px] font-black text-gray-400 tracking-widest block">
                                {language === 'ar' ? 'نسب قوة ومطابقة المؤشرات المستخدمة' : 'INDIVIDUAL INDICATOR COMPLIANCE STRENGTH'}
                              </span>

                              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                                {activeStrategyEval?.detailedResults.map((r) => {
                                  return (
                                    <div 
                                      key={r.ruleId} 
                                      className="bg-black/20 p-3 rounded-xl border border-[#2a2e39]/40 text-xs hover:border-[#2563eb]/20 transition-all flex flex-col space-y-2"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.isPassed ? 'bg-green-400' : 'bg-gray-600'}`} />
                                          <span className="font-extrabold text-white text-[10.5px] truncate" title={r.ruleDescription}>
                                            {r.ruleDescription}
                                          </span>
                                        </div>
                                        <span className={`text-[9px] font-mono shrink-0 font-bold px-1.5 py-0.5 rounded-md ${
                                          r.isPassed 
                                            ? 'bg-green-500/10 text-green-400' 
                                            : 'bg-white/5 text-gray-500'
                                        }`}>
                                          {r.isPassed ? (language === 'ar' ? 'مستوفى' : 'PASSED') : (language === 'ar' ? 'غير مستوفى' : 'FAILED')}
                                        </span>
                                      </div>

                                      {/* Indicator Value details */}
                                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                                        <span>{language === 'ar' ? 'القيمة الحالية السعرية:' : 'Current Value:'}</span>
                                        <span className="font-mono text-gray-200 font-bold max-w-[150px] truncate" title={r.currentValueText}>
                                          {r.currentValueText || '---'}
                                        </span>
                                      </div>

                                      {/* Indicator Specific Progress Strength Bar */}
                                      <div className="w-full">
                                        <div className="w-full h-1.5 bg-[#1a1e2a] rounded-full overflow-hidden">
                                          <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: r.isPassed ? '100%' : '35%' }}
                                            transition={{ duration: 0.8 }}
                                            className={`h-full rounded-full ${r.isPassed ? 'bg-green-500' : 'bg-gray-750'}`}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Trigger Analysis Button inside Strategy column */}
                          <div className="pt-4 border-t border-[#2a2e39]/50">
                            <button
                              onClick={handleAnalyze}
                              disabled={isAnalyzing}
                              className="w-full py-2.5 px-4 bg-[#2563eb]/10 hover:bg-[#2563eb]/20 text-[#60a5fa] font-black text-xs rounded-xl border border-[#2563eb]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {isAnalyzing ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />}
                              <span>{language === 'ar' ? 'إعادة تشغيل فحص الذكاء الاصطناعي' : 'Re-run AI Analysis'}</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-gray-500 text-xs">
                          {language === 'ar' ? 'قم بتنصيب استراتيجية لتفعيل لوحة قوة المؤشرات.' : 'Set up a custom strategy to enable indicators strength board.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hidden Chart for Gemini Vision - Using a fixed size off-screen div for capture */}
          <div className="fixed top-[-5000px] left-[-5000px] pointer-events-none z-[-100]">
            <div ref={captureAreaRef} className="w-[1000px] h-[600px] bg-[#131722] p-8 flex flex-col">
               <div className="flex items-center justify-between mb-6">
                  <h1 className="text-white text-3xl font-bold">{symbol} Analysis Area</h1>
                  <div className="text-gray-400 font-mono text-sm">{new Date().toLocaleString()}</div>
               </div>
               <div className="flex gap-4 mb-8">
                 <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-600/20 flex-1">
                   <p className="text-gray-500 text-xs font-bold uppercase mb-1">Timeframe</p>
                   <p className="text-white text-xl font-bold">{timeframe}</p>
                 </div>
                 <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-600/20 flex-1">
                   <p className="text-gray-500 text-xs font-bold uppercase mb-1">Last Price</p>
                   <p className="text-white text-xl font-bold">{data.length > 0 ? (data[data.length-1].close).toFixed(2) : 'N/A'}</p>
                 </div>
                 <div className="bg-blue-600/10 p-4 rounded-xl border border-blue-600/20 flex-1">
                   <p className="text-gray-500 text-xs font-bold uppercase mb-1">Indicator: SMA</p>
                   <p className="text-white text-xl font-bold">{indicators.sma ? 'Active' : 'N/A'}</p>
                 </div>
               </div>
               
               {/* Visual Chart Bars */}
               <div className="flex-1 flex items-end gap-1 border-b border-l border-gray-800/50 p-6 bg-black/20 rounded-xl">
                 {data.slice(-50).map((d, i) => {
                    const recentData = data.slice(-50);
                    const max = Math.max(...recentData.map(x => x.high));
                    const min = Math.min(...recentData.map(x => x.low));
                    const range = max - min;
                    const h = ((d.close - min) / (range || 1)) * 100;
                    const isUp = d.close >= d.open;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                        <div 
                          className={`w-full rounded-sm ${isUp ? 'bg-[#26a69a]' : 'bg-[#ef5350]'}`}
                          style={{ height: `${Math.max(h, 2)}%` }}
                        />
                      </div>
                    );
                 })}
               </div>
               <div className="mt-4 text-center text-gray-600 text-xs italic">
                 This image represents the last 50 candles for automated analysis.
               </div>
            </div>
          </div>
        </div>
        <div className="h-20 lg:hidden" /> {/* Spacer for floating button */}
      </main>
      
      <style>{`
        .dir-rtl { direction: rtl; }
        .font-arabic { font-family: 'Inter', system-ui, sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2e39; border-radius: 10px; }
        
        /* Markdown Dashboard Styles - Ultra Modern Terminal */
        .markdown-dashboard {
          font-family: 'Inter', sans-serif;
          color: #e2e8f0;
        }
        .markdown-dashboard h3 { 
          color: #ffffff; 
          font-weight: 900; 
          margin-bottom: 1.5rem; 
          margin-top: 2.5rem;
          border-left: 4px solid #2563eb;
          padding-left: 1rem;
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          background: linear-gradient(to right, rgba(37, 99, 235, 0.1), transparent);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .markdown-dashboard h3:first-child { margin-top: 0; }
        
        .markdown-dashboard table { 
          width: 100%; 
          border-collapse: separate; 
          border-spacing: 0; 
          margin: 1.5rem 0; 
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 12px;
          overflow: hidden;
          background: rgba(10, 10, 15, 0.6);
          backdrop-filter: blur(10px);
        }
        .markdown-dashboard th { 
          background: rgba(255, 255, 255, 0.02); 
          color: #94a3b8; 
          font-weight: 700; 
          text-align: left; 
          padding: 12px 16px; 
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .markdown-dashboard td { 
          padding: 12px 16px; 
          border-bottom: 1px solid rgba(255,255,255,0.02); 
          color: #cbd5e1;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
        }
        .markdown-dashboard td strong { color: #f8fafc; }
        .markdown-dashboard td:contains("0.618"), 
        .markdown-dashboard td:contains("GOLDEN"),
        .markdown-dashboard li:contains("0.618"),
        .markdown-dashboard li:contains("GOLDEN") {
          color: #fbbf24 !important;
          text-shadow: 0 0 8px rgba(251, 191, 36, 0.3);
        }
        .markdown-dashboard tr:last-child td { border-bottom: none; }
        .markdown-dashboard tr:hover td { background: rgba(255,255,255,0.03); }
        
        /* Bar Progress Styling */
        .markdown-dashboard td:last-child {
          color: #3b82f6;
          letter-spacing: -1px;
          font-weight: 900;
          opacity: 0.8;
          font-size: 14px;
        }

        .markdown-dashboard ul { 
          list-style: none; 
          padding: 0; 
          margin: 1rem 0; 
          display: grid;
          gap: 8px;
        }
        .markdown-dashboard li { 
          padding: 10px 16px; 
          background: rgba(255,255,255,0.02); 
          border-radius: 8px; 
          border: 1px solid rgba(255,255,255,0.05);
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .markdown-dashboard li strong { 
          color: #3b82f6; 
          min-width: 100px;
          font-size: 11px;
          letter-spacing: 0.05em;
        }

        .markdown-dashboard blockquote {
          margin: 1.5rem 0;
          padding: 1rem 1.5rem;
          background: rgba(37, 99, 235, 0.05);
          border: 1px solid rgba(37, 99, 235, 0.2);
          border-radius: 12px;
          color: #ffffff;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
        }
        .markdown-dashboard blockquote p { margin: 0; }
        .markdown-dashboard strong { color: #3b82f6; }
      `}</style>
    </div>
  );
}
