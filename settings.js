const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
    const defaultSettings = {
        btcAmount: 0,
        showPortfolio: false,
        alwaysOnTop: true,
        autoHide: false,
        startWithWindows: false,
        lockPosition: false,
        opacity: 100,
        darkMode: true
    };

    const settings = JSON.parse(localStorage.getItem('btcSettings') || JSON.stringify(defaultSettings));
    
    Object.keys(settings).forEach(key => {
        const element = document.getElementById(key);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = settings[key];
            } else if (element.type === 'range') {
                element.value = settings[key];
                updateOpacityValue(settings[key]);
            } else {
                element.value = settings[key] || '';
            }
        }
    });

    const opacitySlider = document.getElementById('opacity');
    if (opacitySlider) {
        opacitySlider.addEventListener('input', (e) => {
            updateOpacityValue(e.target.value);
            updateLive();
        });
    }
});

function updateOpacityValue(value) {
    const opacityValue = document.getElementById('opacityValue');
    if (opacityValue) {
        opacityValue.textContent = `${value}%`;
        opacityValue.style.opacity = value / 100;
    }
}

function saveSettings() {
    const settings = {
        btcAmount: parseFloat(document.getElementById('btcAmount').value) || 0,
        showPortfolio: document.getElementById('showPortfolio').checked,
        alwaysOnTop: document.getElementById('alwaysOnTop').checked,
        autoHide: document.getElementById('autoHide').checked,
        startWithWindows: document.getElementById('startWithWindows').checked,
        lockPosition: document.getElementById('lockPosition').checked,
        opacity: parseInt(document.getElementById('opacity').value),
        darkMode: document.getElementById('darkMode').checked
    };
    
    localStorage.setItem('btcSettings', JSON.stringify(settings));
    ipcRenderer.send('settings-changed', settings);
    window.close();
}

function updateLive() {
    const settings = {
        btcAmount: parseFloat(document.getElementById('btcAmount').value) || 0,
        showPortfolio: document.getElementById('showPortfolio').checked,
        alwaysOnTop: document.getElementById('alwaysOnTop').checked,
        autoHide: document.getElementById('autoHide').checked,
        startWithWindows: document.getElementById('startWithWindows').checked,
        lockPosition: document.getElementById('lockPosition').checked,
        opacity: parseInt(document.getElementById('opacity').value),
        darkMode: document.getElementById('darkMode').checked
    };
    ipcRenderer.send('settings-changed', settings);
}

document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', updateLive);
        if (input.type === 'number' || input.type === 'range') {
            input.addEventListener('input', updateLive);
        }
    });
});
