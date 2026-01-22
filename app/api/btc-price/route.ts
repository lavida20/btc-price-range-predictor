import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  try {
    const price = await fetchBTCPrice();
    if (!price) {
      return NextResponse.json({ error: 'All price sources failed' }, { status: 500 });
    }
    return NextResponse.json({ price, timestamp: new Date().toISOString(), source: 'multi-source-fallback' });
  } catch (error) {
    console.error('Error fetching BTC price:', error);
    return NextResponse.json({ error: 'Failed to fetch price' }, { status: 500 });
  }
}

async function fetchBTCPrice(): Promise<number | null> {
  const sources = [
    { name: 'Binance', fetch: fetchBinance },
    { name: 'Kraken', fetch: fetchKraken },
    { name: 'Coinbase', fetch: fetchCoinbase },
    { name: 'Bybit', fetch: fetchBybit },
    { name: 'OKX', fetch: fetchOKX },
    { name: 'CoinGecko', fetch: fetchCoinGecko },
  ];

  for (const source of sources) {
    try {
      const price = await source.fetch();
      if (price && price > 0) {
        console.log(`Got BTC price from ${source.name}: $${price}`);
        return price;
      }
    } catch (error) {
      console.warn(`${source.name} failed`);
      continue;
    }
  }
  return null;
}

async function fetchBinance(): Promise<number | null> {
  const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', { next: { revalidate: 0 } });
  if (!response.ok) throw new Error('Binance error');
  const data = await response.json();
  return parseFloat(data.price);
}

async function fetchKraken(): Promise<number | null> {
  const response = await fetch('https://api.kraken.com/0/public/Ticker?pair=XBTUSDT', { next: { revalidate: 0 } });
  if (!response.ok) throw new Error('Kraken error');
  const data = await response.json();
  const result = data.result;
  const pair = Object.keys(result)[0];
  return parseFloat(result[pair].c[0]);
}

async function fetchCoinbase(): Promise<number | null> {
  const response = await fetch('https://api.coinbase.com/v2/prices/BTC-USD/spot', { next: { revalidate: 0 } });
  if (!response.ok) throw new Error('Coinbase error');
  const data = await response.json();
  return parseFloat(data.data.amount);
}

async function fetchBybit(): Promise<number | null> {
  const response = await fetch('https://api.bybit.com/v5/market/tickers?category=spot&symbol=BTCUSDT', { next: { revalidate: 0 } });
  if (!response.ok) throw new Error('Bybit error');
  const data = await response.json();
  if (data.result?.list?.length > 0) {
    return parseFloat(data.result.list[0].lastPrice);
  }
  throw new Error('No data from Bybit');
}

async function fetchOKX(): Promise<number | null> {
  const response = await fetch('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT', { next: { revalidate: 0 } });
  if (!response.ok) throw new Error('OKX error');
  const data = await response.json();
  if (data.data?.length > 0) {
    return parseFloat(data.data[0].last);
  }
  throw new Error('No data from OKX');
}

async function fetchCoinGecko(): Promise<number | null> {
  const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { next: { revalidate: 0 } });
  if (!response.ok) throw new Error('CoinGecko error');
  const data = await response.json();
  return data.bitcoin.usd;
}
