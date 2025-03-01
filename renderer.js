const WebSocket = require('ws');
const { ipcRenderer } = require('electron');
let settings = JSON.parse(localStorage.getItem('btcSettings') || '{"btcAmount":0,"showPortfolio":false}');

ipcRenderer.on('settings-changed', (event, newSettings) => {
    settings = newSettings;
    localStorage.setItem('btcSettings', JSON.stringify(settings));
});

const priceElement = document.getElementById('price');
const ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');

let currentPrice = 0;

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    currentPrice = parseFloat(data.c).toFixed(2);
    const percentChange = parseFloat(data.P).toFixed(2);
    const changeColor = percentChange >= 0 ? '#4CAF50' : '#FF5252';
    
    let html = `
        <div class="price-row">
            <img src="icon.png" class="bitcoin-icon" alt="BTC">
            <span class="main-price">$${currentPrice}</span>
            <span class="price-change" style="color: ${changeColor}">
                ${percentChange}%
            </span>
        </div>`;
    
    if (settings.showPortfolio && settings.btcAmount > 0) {
        const portfolioValue = (settings.btcAmount * parseFloat(currentPrice)).toFixed(2);
        html += `
            <div class="portfolio-value">
                ${settings.btcAmount} BTC ($${portfolioValue})
            </div>`;
    }
    
    priceElement.innerHTML = html;
};

document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

let isDragging = false;

priceElement.addEventListener('mousedown', (e) => {
    if (e.button === 2) { 
        e.preventDefault();
        e.stopPropagation();
        
        const bounds = window.getBoundingClientRect();
        
        const x = Math.round(e.x);
        const y = Math.round(e.y);
        
        ipcRenderer.send('show-context-menu', {
            price: currentPrice,
            x: x,
            y: y,
            bounds: {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height
            }
        });
    }
});

priceElement.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    ipcRenderer.send('show-context-menu', {
        price: currentPrice,
        mouseX: e.x,
        mouseY: e.y
    });
});

window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

ws.onerror = (error) => {
    priceElement.textContent = 'Error';
    console.error('WebSocket error:', error);
};

ws.onclose = () => {
    priceElement.textContent = 'Disconnected';
    setTimeout(() => {
        location.reload();
    }, 5000);
};
