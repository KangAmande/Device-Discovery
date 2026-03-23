const socket = io();
const grid = document.getElementById('radar-grid');
const countEl = document.getElementById('count');
const devices = new Map();

socket.on('device-spotted', (data) => {
    devices.set(data.id, data);
    renderGrid();
});

function renderGrid() {
    countEl.innerText = devices.size;
    
    // Sort by risk first, then by strength
    const sorted = Array.from(devices.values()).sort((a, b) => {
        if (a.risk === 'High') return -1;
        return b.rssi - a.rssi;
    });

    grid.innerHTML = sorted.map(device => `
        <div class="device-card ${device.connectionType === 'ARP-Cache' ? 'net' : 'ble'} ${device.risk === 'High' ? 'high-risk' : ''}">
            <div class="header-row">
                <span class="name">${device.name}</span>
                <span class="tag">${device.category}</span>
            </div>
            <div class="meta-data">
                ID: <code>${device.id}</code><br>
                Type: ${device.connectionType}<br>
                ${device.ip ? `IP: <b>${device.ip}</b>` : `RSSI: ${device.rssi} dBm`}
            </div>
            ${device.rssi ? `
                <div class="rssi-bar">
                    <div class="rssi-fill" style="width: ${Math.min(100, Math.max(0, (device.rssi + 100) * 1.5))}%"></div>
                </div>
            ` : ''}
        </div>
    `).join('');
}

// Cleanup stale devices every 30 seconds
setInterval(() => {
    const now = Date.now();
    for (const [id, device] of devices) {
        if (now - device.lastSeen > 60000) devices.delete(id);
    }
    renderGrid();
}, 30000);