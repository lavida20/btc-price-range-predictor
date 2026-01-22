import { NextResponse } from 'next/server';

export const revalidate = 900;

export async function GET() {
  try {
    const historyData = await fetchHistoricalData();
    if (!historyData) {
      return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
    }

    const prices = historyData.prices.map((p: [number, number]) => p[1]);
    const volumes = historyData.volumes.map((v: [number, number]) => v[1]);
    const currentPrice = prices[prices.length - 1];

    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const bbands = calculateBollingerBands(prices);
    const atr = calculateATR(prices);
    const supportResistance = calculateSupportResistance(prices);
    const volumeProfile = calculateVolumeProfile(prices, volumes);
    
    const avgVolume = volumes.slice(-24).reduce((a: number, b: number) => a + b, 0) / 24;
    const currentVolume = volumes[volumes.length - 1];
    const volumeRatio = currentVolume / avgVolume;

    const sentiment = await fetchSentiment();
    const onchainMetrics = await fetchOnchainMetrics();
    const newsSentiment = await fetchNewsSentiment();
    const marketHours = getMarketHoursByTimezone();

    const predictions = generatePredictions(currentPrice, rsi, macd, bbands, atr, supportResistance, sentiment, volumeRatio, onchainMetrics, newsSentiment, marketHours);

    return NextResponse.json({
      predictions,
      sentiment,
      newsSentiment,
      indicators: {
        rsi,
        macd,
        atr: atr.toFixed(2),
        bollingerBands: bbands,
        volumeRatio: volumeRatio.toFixed(2),
        supportResistance,
        volumeProfile,
      },
      onchainMetrics,
      marketHours,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

async function fetchHistoricalData(): Promise<{ prices: [number, number][]; volumes: [number, number][] } | null> {
  const sources = [
    { name: 'Binance', fetch: fetchBinanceHistory },
    { name: 'Kraken', fetch: fetchKrakenHistory },
    { name: 'CoinGecko', fetch: fetchCoinGeckoHistory },
  ];

  for (const source of sources) {
    try {
      const data = await source.fetch();
      if (data) {
        console.log(`Got historical data from ${source.name}`);
        return data;
      }
    } catch (error) {
      console.warn(`${source.name} historical fetch failed`);
      continue;
    }
  }
  return null;
}

async function fetchBinanceHistory(): Promise<{ prices: [number, number][]; volumes: [number, number][] } | null> {
  const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=168');
  if (!response.ok) throw new Error('Binance history error');
  const data = await response.json();

  const prices: [number, number][] = data.map((candle: any[]) => [candle[0], parseFloat(candle[4])]);
  const volumes: [number, number][] = data.map((candle: any[]) => [candle[0], parseFloat(candle[7])]);

  return { prices, volumes };
}

async function fetchKrakenHistory(): Promise<{ prices: [number, number][]; volumes: [number, number][] } | null> {
  const response = await fetch('https://api.kraken.com/0/public/OHLC?pair=XBTUSDT&interval=60&since=' + (Math.floor(Date.now() / 1000) - 604800));
  if (!response.ok) throw new Error('Kraken history error');
  const data = await response.json();

  if (!data.result?.XBTUSDT) throw new Error('No Kraken data');

  const candles = data.result.XBTUSDT.slice(0, -1);
  const prices: [number, number][] = candles.map((candle: any[]) => [candle[0] * 1000, parseFloat(candle[4])]);
  const volumes: [number, number][] = candles.map((candle: any[]) => [candle[0] * 1000, parseFloat(candle[7])]);

  return { prices, volumes };
}

async function fetchCoinGeckoHistory(): Promise<{ prices: [number, number][]; volumes: [number, number][] } | null> {
  const response = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7&interval=hourly');
  if (!response.ok) throw new Error('CoinGecko history error');
  const data = await response.json();

  return { prices: data.prices, volumes: data.total_volumes };
}

function calculateRSI(prices: number[], period = 14): number {
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function calculateMACD(prices: number[]): number {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  return ema12 - ema26;
}

function calculateEMA(prices: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = prices[prices.length - period];
  for (let i = prices.length - period + 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function calculateBollingerBands(prices: number[], period = 20) {
  const recentPrices = prices.slice(-period);
  const sma = recentPrices.reduce((a, b) => a + b) / period;
  const variance = recentPrices.reduce((a, p) => a + Math.pow(p - sma, 2)) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: sma + stdDev * 2, middle: sma, lower: sma - stdDev * 2 };
}

function calculateATR(prices: number[], period = 14): number {
  const tr: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const highLow = prices[i] - prices[i - 1];
    tr.push(Math.abs(highLow));
  }
  const recentTR = tr.slice(-period);
  return recentTR.reduce((a, b) => a + b, 0) / period;
}

function calculateSupportResistance(prices: number[]) {
  const recentPrices = prices.slice(-50);
  let resistance = Math.max(...recentPrices);
  let support = Math.min(...recentPrices);
  
  const sorted = [...recentPrices].sort((a, b) => a - b);
  const support2 = sorted[Math.floor(sorted.length * 0.25)];
  const resistance2 = sorted[Math.floor(sorted.length * 0.75)];
  
  return { resistance, resistance2, support, support2 };
}

function calculateVolumeProfile(prices: number[], volumes: number[]) {
  const recentData = prices.slice(-24).map((price, i) => ({ price, volume: volumes[volumes.length - 24 + i] }));
  
  const priceRanges: Record<string, number> = {};
  recentData.forEach(({ price, volume }) => {
    const range = Math.floor(price / 100) * 100;
    priceRanges[range] = (priceRanges[range] || 0) + volume;
  });
  
  return priceRanges;
}

async function fetchSentiment(): Promise<{ reddit: number; x: number }> {
  try {
    const [cointrendzSentiment, santimentSentiment] = await Promise.all([
      fetchCoinTrendzSentiment(),
      fetchSantimentSentiment(),
    ]);

    return { reddit: cointrendzSentiment, x: santimentSentiment };
  } catch (error) {
    console.error('Sentiment fetch error:', error);
    return { reddit: 0, x: 0 };
  }
}

async function fetchCoinTrendzSentiment(): Promise<number> {
  try {
    const response = await fetch('https://api.cointrendz.com/api/v1/social-sentiment?coin=bitcoin&interval=1h', {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) throw new Error('CoinTrendz API error');
    
    const data = await response.json();
    const sentiment = (data.sentiment - 50) / 50;
    return Math.max(-1, Math.min(1, sentiment));
  } catch (error) {
    console.error('CoinTrendz error:', error);
    return 0;
  }
}

async function fetchSantimentSentiment(): Promise<number> {
  try {
    const response = await fetch('https://api.santiment.net/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ crowdsentiment(selector: {slugs: ["bitcoin"], source: SANTIMENT_TWITTER}) { datetime sentiment } }`,
      }),
    });

    if (!response.ok) throw new Error('Santiment API error');

    const data = await response.json();
    
    if (data.data?.crowdsentiment && data.data.crowdsentiment.length > 0) {
      const sentiment = data.data.crowdsentiment[data.data.crowdsentiment.length - 1].sentiment;
      return Math.max(-1, Math.min(1, sentiment));
    }
    
    return 0;
  } catch (error) {
    console.error('Santiment error:', error);
    return 0;
  }
}

async function fetchOnchainMetrics(): Promise<any> {
  try {
    const metrics = {
      whaleTransactions: 0,
      activeAddresses: 0,
      exchangeInflow: 0,
      exchangeOutflow: 0,
      mempoolSize: 0,
      fearGreedIndex: 0,
      largeTransactions: [],
      txVolume24h: 0,
      networkHealth: 'good',
    };

    try {
      const fgResponse = await fetch('https://api.alternative.me/fng/?limit=1&format=json');
      const fgData = await fgResponse.json();
      if (fgData.data && fgData.data.length > 0) {
        metrics.fearGreedIndex = (parseInt(fgData.data[0].value) - 50) / 50;
      }
    } catch (e) {
      console.error('Fear & Greed error:', e);
    }

    try {
      const txResponse = await fetch('https://blockchain.info/q/txrate');
      const txRate = await txResponse.text();
      metrics.mempoolSize = parseInt(txRate) || 0;
    } catch (e) {
      console.error('Blockchain.com error:', e);
    }

    return metrics;
  } catch (error) {
    console.error('On-chain metrics error:', error);
    return {};
  }
}

async function fetchNewsSentiment(): Promise<number> {
  try {
    const response = await fetch('https://cryptopanic.com/api/v1/posts/?auth_token=&currencies=BTC&kind=news&limit=10');
    
    if (!response.ok) throw new Error('CryptoPanic API error');
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      let sentiment = 0;
      data.results.forEach((news: any) => {
        if (news.kind === 'news') {
          if (news.title.toLowerCase().includes('bull') || news.title.toLowerCase().includes('surge')) sentiment += 1;
          if (news.title.toLowerCase().includes('crash') || news.title.toLowerCase().includes('fall')) sentiment -= 1;
        }
      });
      return Math.max(-1, Math.min(1, sentiment / data.results.length));
    }
    
    return 0;
  } catch (error) {
    console.error('News sentiment error:', error);
    return 0;
  }
}

function getMarketHoursByTimezone() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  const markets = {
    asia: { active: utcHour >= 0 && utcHour < 8, peak: utcHour >= 1 && utcHour <= 5, timezone: 'JST/HKT' },
    europe: { active: utcHour >= 7 && utcHour < 16, peak: utcHour >= 9 && utcHour <= 11, timezone: 'GMT/CET' },
    us: { active: utcHour >= 13 && utcHour < 22, peak: utcHour >= 14 && utcHour <= 20, timezone: 'EST/CST' },
  };
  
  return { markets, utcTime: now.toISOString() };
}

function generatePredictions(currentPrice: number, rsi: number, macd: number, bbands: any, atr: number, supportResistance: any, sentiment: any, volumeRatio: number, onchainMetrics: any, newsSentiment: number, marketHours: any) {
  const timeframes = [
    { label: '1h', hours: 1, volatilityMultiplier: 0.5 },
    { label: '2h', hours: 2, volatilityMultiplier: 0.7 },
    { label: '3h', hours: 3, volatilityMultiplier: 0.85 },
    { label: '5h', hours: 5, volatilityMultiplier: 1 },
  ];

  return timeframes.map((tf) => {
    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    let priceTarget = currentPrice;
    let confidence = 0.5;
    let reasoning: string[] = [];

    const volatilityAdj = (atr / currentPrice) * tf.volatilityMultiplier;

    if (rsi > 70) {
      direction = 'down';
      confidence += 0.15;
      reasoning.push('RSI overbought');
      priceTarget -= atr * 1.5;
    } else if (rsi < 30) {
      direction = 'up';
      confidence += 0.15;
      reasoning.push('RSI oversold');
      priceTarget += atr * 1.5;
    }

    if (macd > 0) {
      if (direction !== 'down') {
        direction = 'up';
        confidence += 0.12;
      }
      reasoning.push('MACD positive');
      priceTarget += atr * 0.8;
    } else if (macd < -50) {
      if (direction !== 'up') {
        direction = 'down';
        confidence += 0.12;
      }
      reasoning.push('MACD negative');
      priceTarget -= atr * 0.8;
    }

    if (currentPrice > bbands.upper * 1.02) {
      direction = 'down';
      confidence += 0.2;
      reasoning.push('Price at resistance');
      priceTarget = supportResistance.support2;
    } else if (currentPrice < bbands.lower * 0.98) {
      direction = 'up';
      confidence += 0.2;
      reasoning.push('Price at support');
      priceTarget = supportResistance.resistance2;
    }

    if (volumeRatio > 1.5 && direction === 'up') {
      confidence += 0.15;
      reasoning.push('High volume bullish');
      priceTarget *= 1.01;
    } else if (volumeRatio > 1.5 && direction === 'down') {
      confidence += 0.15;
      reasoning.push('High volume bearish');
      priceTarget *= 0.99;
    }

    const avgSentiment = (sentiment.reddit + sentiment.x) / 2;
    if (avgSentiment > 0.2) {
      confidence += 0.1;
      reasoning.push('Strong bullish sentiment');
      priceTarget *= 1.005;
    } else if (avgSentiment < -0.2) {
      confidence += 0.1;
      reasoning.push('Strong bearish sentiment');
      priceTarget *= 0.995;
    }

    if (newsSentiment > 0.3) {
      confidence += 0.08;
      reasoning.push('Positive news');
      priceTarget *= 1.003;
    } else if (newsSentiment < -0.3) {
      confidence += 0.08;
      reasoning.push('Negative news');
      priceTarget *= 0.997;
    }

    confidence = Math.max(0.5, Math.min(0.95, confidence));

    const stopLoss = direction === 'up' ? currentPrice - (atr * 2) : currentPrice + (atr * 2);
    const takeProfit = priceTarget;
    const riskAmount = Math.abs(currentPrice - stopLoss);
    const rewardAmount = Math.abs(takeProfit - currentPrice);
    const riskReward = rewardAmount / riskAmount;

    return {
      timeframe: tf.label,
      prediction: parseFloat(priceTarget.toFixed(2)),
      direction,
      confidence: parseFloat((confidence * 100).toFixed(1)),
      reasoning: reasoning.join(' + '),
      riskReward: parseFloat(riskReward.toFixed(2)),
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      takeProfit: parseFloat(takeProfit.toFixed(2)),
    };
  });
}
