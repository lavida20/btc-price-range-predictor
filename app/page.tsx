'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface Prediction {
  timeframe: string;
  prediction: number;
  direction: 'up' | 'down' | 'neutral';
  reasoning: string;
  riskReward: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
}

export default function Dashboard() {
  const [btcPrice, setBtcPrice] = useState<number>(0);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [sentiment, setSentiment] = useState<{ reddit: number; x: number }>({ reddit: 0, x: 0 });
  const [newsSentiment, setNewsSentiment] = useState<number>(0);
  const [indicators, setIndicators] = useState<any>(null);
  const [onchainMetrics, setOnchainMetrics] = useState<any>(null);
  const [marketHours, setMarketHours] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const fetchBTCPrice = async () => {
      try {
        const response = await fetch('/api/btc-price');
        const data = await response.json();
        setBtcPrice(data.price);
        setPriceHistory((prev) => [...prev.slice(-59), { time: new Date().toLocaleTimeString(), price: data.price }]);
      } catch (error) {
        console.error('Error fetching BTC price:', error);
      }
    };

    fetchBTCPrice();
    const priceInterval = setInterval(fetchBTCPrice, 5000);
    return () => clearInterval(priceInterval);
  }, []);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const response = await fetch('/api/btc-analysis');
        const data = await response.json();
        setPredictions(data.predictions);
        setSentiment(data.sentiment);
        setNewsSentiment(data.newsSentiment);
        setIndicators(data.indicators);
        setOnchainMetrics(data.onchainMetrics);
        setMarketHours(data.marketHours);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (error) {
        console.error('Error fetching analysis:', error);
      }
    };

    fetchAnalysis();
    const analysisInterval = setInterval(fetchAnalysis, 15 * 60 * 1000);
    return () => clearInterval(analysisInterval);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-900">Loading...</div>;

  const avgSentiment = (sentiment.reddit + sentiment.x) / 2;
  const activeMarkets = marketHours?.markets ? Object.entries(marketHours.markets).filter(([_, market]: any) => market.active).map(([name]) => name) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">BTC Price Predictor</h1>
            <p className="text-slate-400">Real-time analysis: TA + FA + On-Chain + News + Sentiment</p>
          </div>
          <div className="text-right text-slate-400 text-sm">
            <p>Price: Real-time</p>
            <p>Analysis: {lastUpdate.toLocaleTimeString()}</p>
            <p className="text-green-400">Active Markets: {activeMarkets.join(', ').toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700 rounded-lg p-6 text-white">
            <p className="text-slate-300 mb-2">Current BTC Price</p>
            <p className="text-4xl font-bold">${btcPrice.toFixed(2)}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 text-white">
            <p className="text-slate-300 mb-2">Market Sentiment</p>
            <p className={`text-3xl font-bold ${avgSentiment > 0 ? 'text-green-400' : 'text-red-400'}`}>{(avgSentiment * 100).toFixed(0)}%</p>
            <p className="text-xs text-slate-400 mt-2">Social + News Combined</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 text-white">
            <p className="text-slate-300 mb-2">News Sentiment</p>
            <p className={`text-3xl font-bold ${newsSentiment > 0 ? 'text-blue-400' : 'text-orange-400'}`}>{(newsSentiment * 100).toFixed(0)}%</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-6 text-white">
            <p className="text-slate-300 mb-2">Fear & Greed</p>
            <p className={`text-3xl font-bold ${(onchainMetrics?.fearGreedIndex || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>{((onchainMetrics?.fearGreedIndex || 0) * 100).toFixed(0)}%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">RSI (14)</p>
            <p className="text-2xl font-bold">{indicators?.rsi?.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-1">{indicators?.rsi > 70 ? '⚠️ Overbought' : indicators?.rsi < 30 ? '⚠️ Oversold' : '✓ Neutral'}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">MACD</p>
            <p className="text-2xl font-bold">{indicators?.macd?.toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">{indicators?.macd > 0 ? '📈 Bullish' : '📉 Bearish'}</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">ATR (Volatility)</p>
            <p className="text-2xl font-bold">${indicators?.atr}</p>
            <p className="text-xs text-slate-400 mt-1">Price Movement Range</p>
          </div>
          <div className="bg-slate-700 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">Volume Ratio</p>
            <p className="text-2xl font-bold">{indicators?.volumeRatio}x</p>
            <p className="text-xs text-slate-400 mt-1">{(indicators?.volumeRatio > 1 ? 'Above' : 'Below')} Average</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-red-900 bg-opacity-30 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">Resistance</p>
            <p className="text-xl font-bold">${indicators?.supportResistance?.resistance?.toFixed(2)}</p>
          </div>
          <div className="bg-red-900 bg-opacity-20 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">Resistance 2</p>
            <p className="text-xl font-bold">${indicators?.supportResistance?.resistance2?.toFixed(2)}</p>
          </div>
          <div className="bg-green-900 bg-opacity-20 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">Support 2</p>
            <p className="text-xl font-bold">${indicators?.supportResistance?.support2?.toFixed(2)}</p>
          </div>
          <div className="bg-green-900 bg-opacity-30 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">Support</p>
            <p className="text-xl font-bold">${indicators?.supportResistance?.support?.toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-purple-900 bg-opacity-30 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">🐋 Whale Transactions</p>
            <p className="text-2xl font-bold">{onchainMetrics?.whaleTransactions || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Large transactions detected</p>
          </div>
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">📊 24h Volume</p>
            <p className="text-2xl font-bold">{(onchainMetrics?.txVolume24h || 0).toFixed(2)}</p>
            <p className="text-xs text-slate-400 mt-1">Transaction volume</p>
          </div>
          <div className="bg-emerald-900 bg-opacity-30 rounded-lg p-4 text-white">
            <p className="text-slate-300 mb-2 text-sm">🌐 Network Health</p>
            <p className={`text-2xl font-bold ${onchainMetrics?.networkHealth === 'good' ? 'text-green-400' : 'text-yellow-400'}`}>{onchainMetrics?.networkHealth?.toUpperCase() || 'NORMAL'}</p>
            <p className="text-xs text-slate-400 mt-1">Network status</p>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Live Price (Last 60 minutes)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h2 className="text-xl font-bold text-white mb-4">Price Predictions with Risk/Reward</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {predictions.map((pred) => (
              <div key={pred.timeframe} className="bg-slate-700 rounded-lg p-6 text-white border-l-4" style={{ borderColor: pred.direction === 'up' ? '#22c55e' : pred.direction === 'down' ? '#ef4444' : '#f59e0b' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm text-slate-300 font-semibold">{pred.timeframe}</p>
                    <p className="text-xs text-slate-400">Confidence: {pred.confidence}%</p>
                  </div>
                  <TrendingUp size={18} className={pred.direction === 'up' ? 'text-green-400' : pred.direction === 'down' ? 'text-red-400 rotate-180' : 'text-yellow-400'} />
                </div>
                <p className="text-3xl font-bold mb-2">${pred.prediction.toFixed(2)}</p>
                <div className="bg-slate-800 rounded p-3 mb-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Take Profit:</span>
                    <span className="text-green-400 font-bold">${pred.takeProfit.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stop Loss:</span>
                    <span className="text-red-400 font-bold">${pred.stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Risk/Reward:</span>
                    <span className="font-bold">{pred.riskReward.toFixed(2)}:1</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300">{pred.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
