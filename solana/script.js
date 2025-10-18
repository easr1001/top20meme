// 数据更新间隔：1小时 (毫秒)
const UPDATE_INTERVAL = 3600000; // 3600000ms = 1小时

// CoinGecko API端点：专属 Solana Ecosystem 中的 MEME 币，按市值排序前20
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';

// 流行交易所映射：针对 Solana meme 币优化 CEX 和 DEX
const EXCHANGE_MAP = {
  cex: [
    { id: 'binance', name: 'Binance', url: 'https://www.binance.com' },
    { id: 'okx', name: 'OKX', url: 'https://www.okx.com' },
    { id: 'gate', name: 'Gate.io', url: 'https://www.gate.io' }
  ],
  dex: [
    { id: 'raydium', name: 'Raydium (Solana DEX)', url: 'https://raydium.io/swap/' },
    { id: 'jupiter', name: 'Jupiter (Solana Aggregator)', url: 'https://jup.ag/swap' }
  ]
};

// DOM元素
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const listEl = document.getElementById('meme-list');
const timeEl = document.getElementById('update-time');

// 获取交易所推荐函数（Solana 优化）
async function getExchangeRecommendations(coinId, symbol) {
  try {
    // 查询 Binance tickers 检查 CEX 支持
    const cexResponse = await fetch(`https://api.coingecko.com/api/v3/exchanges/binance/tickers?coin_ids=${coinId}`);
    const hasCex = cexResponse.ok;

    // Solana DEX 推荐：优先 Raydium，其次 Jupiter
    const dexRec = EXCHANGE_MAP.dex[0]; // 默认 Raydium

    const recommendations = [];
    
    // 添加 CEX
    if (hasCex) {
      recommendations.push({
        type: 'cex',
        ...EXCHANGE_MAP.cex[0], // Binance
        link: `https://www.binance.com/en/trade/${symbol.toUpperCase()}_USDT`
      });
    } else {
      recommendations.push({
        type: 'cex',
        ...EXCHANGE_MAP.cex[1], // OKX 备选
        link: `https://www.okx.com/trade-spot/${symbol.toUpperCase()}-USDT`
      });
    }
    
    // 添加 DEX（Solana 特定：使用 Jupiter swap 链接，需 token 地址）
    const tokenAddress = await getTokenAddress(coinId);
    recommendations.push({
      type: 'dex',
      ...dexRec,
      link: `${dexRec.url}?inputMint=sol&outputMint=${tokenAddress || 'So11111111111111111111111111111111111111112'}` // SOL 作为 input，token 作为 output
    });

    return recommendations.slice(0, 2); // 限 2 个
  } catch (error) {
    console.error('交易所查询错误:', error);
    // 回退静态 Solana 推荐
    return [
      { type: 'cex', name: 'Binance', url: 'https://www.binance.com', link: 'https://www.binance.com/en/trade' },
      { type: 'dex', name: 'Raydium', url: 'https://raydium.io/swap/', link: 'https://raydium.io/swap/' }
    ];
  }
}

// 获取 Solana token 地址（从 CoinGecko /coins/{id}）
async function getTokenAddress(coinId) {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const data = await response.json();
    return data.platforms?.solana || 'Ez...'; // Solana 合约地址
  } catch {
    return 'Ez...'; // 占位
  }
}

// 加载数据函数
async function loadData() {
    try {
        loadingEl.style.display = 'block';
        listEl.style.display = 'none';
        errorEl.style.display = 'none';

        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('API请求失败');
        
        let data = await response.json();
        
        // 额外过滤：仅保留 meme 主题（基于 CoinGecko 标签或名称关键词，如 'meme'）
        data = data.filter(coin => coin.name.toLowerCase().includes('meme') || coin.id.includes('wif') || coin.id.includes('bonk') || coin.id.includes('popcat') || coin.categories?.includes('Meme'));
        
        // 更新时间
        timeEl.textContent = new Date().toLocaleString('zh-CN');
        
        // 渲染列表
        await renderList(data);
        
        loadingEl.style.display = 'none';
        listEl.style.display = 'grid';
        
        // 更新Schema.org
        updateSchema(data);
        
    } catch (error) {
        console.error('加载数据错误:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

// 渲染列表（异步交易所）
async function renderList(data) {
    listEl.innerHTML = '';
    for (let i = 0; i < data.length; i++) {
        const coin = data[i];
        const li = document.createElement('li');
        li.className = 'meme-item';
        
        // 获取交易所推荐
        const exchanges = await getExchangeRecommendations(coin.id, coin.symbol);
        
        li.innerHTML = `
            <div class="meme-rank">#${i + 1}</div>
            <img src="${coin.image}" alt="Solana Meme币 ${coin.name} 市值排名 ${i + 1}" class="meme-img" loading="lazy">
            <h2 class="meme-name">${coin.name} (${coin.symbol.toUpperCase()})</h2>
            <div class="meme-stats">
                <span>价格: $${coin.current_price.toLocaleString()}</span>
                <span>市值: $${coin.market_cap.toLocaleString()}</span>
                <span class="${coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative'}">
                    24h: ${coin.price_change_percentage_24h.toFixed(2)}%
                </span>
            </div>
            <div class="exchange-section">
                <div class="exchange-title">推荐交易所 (Solana 支持)</div>
                <div class="exchanges-list">
                    ${exchanges.map(ex => `
                        <div class="exchange-item">
                            <span class="exchange-type ${ex.type}">${ex.type.toUpperCase()}</span>
                            <a href="${ex.link}" target="_blank" class="exchange-link" rel="noopener noreferrer">${ex.name}</a>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        listEl.appendChild(li);
    }
}

// 更新Schema.org JSON-LD (动态注入前5项)
function updateSchema(data) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Top 20 Solana Meme Coins Market Cap Ranking",
        "description": "Solana 链上 MEME 类型加密货币市值前20排名",
        "itemListElement": data.slice(0, 5).map((coin, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": coin.name,
            "url": `https://www.coingecko.com/en/coins/${coin.id}`
        }))
    };
    // 移除旧脚本
    const oldScript = document.querySelector('script[type="application/ld+json"]');
    if (oldScript) oldScript.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

// 定时更新
setInterval(loadData, UPDATE_INTERVAL);

// 页面加载时立即执行
document.addEventListener('DOMContentLoaded', loadData);
