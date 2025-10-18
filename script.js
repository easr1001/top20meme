// 数据更新间隔：1小时 (毫秒)
const UPDATE_INTERVAL = 3600000; // 3600000ms = 1小时

// CoinGecko API端点：专属 MEME 币类别，按市值排序前20
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';

// 流行交易所映射：CEX 和 DEX（基于常见 meme 币支持）
const EXCHANGE_MAP = {
  cex: [
    { id: 'binance', name: 'Binance', url: 'https://www.binance.com' },
    { id: 'okx', name: 'OKX', url: 'https://www.okx.com' },
    { id: 'gate', name: 'Gate.io', url: 'https://www.gate.io' }
  ],
  dex: [
    { id: 'uniswap_v3', name: 'Uniswap (ETH)', url: 'https://app.uniswap.org' },
    { id: 'pancakeswap_v3', name: 'PancakeSwap (BSC)', url: 'https://pancakeswap.finance' }
  ]
};

// DOM元素
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const listEl = document.getElementById('meme-list');
const timeEl = document.getElementById('update-time');

// 获取交易所推荐函数
async function getExchangeRecommendations(coinId, symbol) {
  try {
    // 示例：查询 Binance tickers（可扩展到其他）
    const cexResponse = await fetch(`https://api.coingecko.com/api/v3/exchanges/binance/tickers?coin_ids=${coinId}`);
    const hasCex = cexResponse.ok;

    // DEX 基于链推断（简化：假设大多数 meme 为 ETH/BSC）
    const dexRec = symbol.toLowerCase().includes('bsc') || symbol.toLowerCase().includes('cake') ? EXCHANGE_MAP.dex[1] : EXCHANGE_MAP.dex[0];

    const recommendations = [];
    
    // 添加 CEX（如果有交易对）
    if (hasCex) {
      recommendations.push({
        type: 'cex',
        ...EXCHANGE_MAP.cex[0], // 默认 Binance
        link: `https://www.binance.com/en/trade/${symbol.toUpperCase()}_USDT`
      });
    } else {
      // 备选 CEX
      recommendations.push({
        type: 'cex',
        ...EXCHANGE_MAP.cex[1], // OKX
        link: `https://www.okx.com/trade-spot/${symbol.toUpperCase()}-USDT`
      });
    }
    
    // 添加 DEX
    recommendations.push({
      type: 'dex',
      ...dexRec,
      link: `${dexRec.url}/#/swap?outputCurrency=${await getTokenAddress(coinId)}` // 简化，实际需 token 地址
    });

    return recommendations.slice(0, 2); // 限 2 个
  } catch (error) {
    console.error('交易所查询错误:', error);
    // 回退静态推荐
    return [
      { type: 'cex', name: 'Binance', url: 'https://www.binance.com', link: 'https://www.binance.com/en/trade' },
      { type: 'dex', name: 'Uniswap', url: 'https://app.uniswap.org', link: 'https://app.uniswap.org/#/swap' }
    ];
  }
}

// 简化 token 地址获取（实际可从 /coins/{id} API）
async function getTokenAddress(coinId) {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    const data = await response.json();
    return data.detail_platforms?.ethereum?.contract_address || '0x...'; // 示例
  } catch {
    return '0x...'; // 占位
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
        
        const data = await response.json();
        
        // 更新时间
        timeEl.textContent = new Date().toLocaleString('zh-CN');
        
        // 渲染列表（包含交易所）
        renderList(data);
        
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

// 渲染列表（更新：添加交易所）
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
            <img src="${coin.image}" alt="Meme币 ${coin.name} 市值排名 ${i + 1}" class="meme-img" loading="lazy">
            <h2 class="meme-name">${coin.name} (${coin.symbol.toUpperCase()})</h2>
            <div class="meme-stats">
                <span>价格: $${coin.current_price.toLocaleString()}</span>
                <span>市值: $${coin.market_cap.toLocaleString()}</span>
                <span class="${coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative'}">
                    24h: ${coin.price_change_percentage_24h.toFixed(2)}%
                </span>
            </div>
            <div class="exchange-section">
                <div class="exchange-title">推荐交易所</div>
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
        "name": "Top 20 Meme Coins Market Cap Ranking",
        "description": "MEME 类型加密货币市值前20排名",
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
