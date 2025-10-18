// 数据更新间隔：1小时 (毫秒)
const UPDATE_INTERVAL = 3600000; // 3600000ms = 1小时

// CoinGecko API端点：专属 MEME 币类别，按市值排序前20
const API_URL = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h';

// DOM元素
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const listEl = document.getElementById('meme-list');
const timeEl = document.getElementById('update-time');

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
        
        // 渲染列表
        renderList(data);
        
        loadingEl.style.display = 'none';
        listEl.style.display = 'grid';
        
        // 更新Schema.org (简化，只更新前5项示例)
        updateSchema(data);
        
    } catch (error) {
        console.error('加载数据错误:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

// 渲染列表
function renderList(data) {
    listEl.innerHTML = '';
    data.forEach((coin, index) => {
        const li = document.createElement('li');
        li.className = 'meme-item';
        li.innerHTML = `
            <div class="meme-rank">#${index + 1}</div>
            <img src="${coin.image}" alt="Meme币 ${coin.name} 市值排名 ${index + 1}" class="meme-img" loading="lazy">
            <h2 class="meme-name">${coin.name} (${coin.symbol.toUpperCase()})</h2>
            <div class="meme-stats">
                <span>价格: $${coin.current_price.toLocaleString()}</span>
                <span>市值: $${coin.market_cap.toLocaleString()}</span>
                <span class="${coin.price_change_percentage_24h >= 0 ? 'change-positive' : 'change-negative'}">
                    24h: ${coin.price_change_percentage_24h.toFixed(2)}%
                </span>
            </div>
        `;
        listEl.appendChild(li);
    });
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
    // 移除旧脚本，避免重复
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
