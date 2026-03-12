const noble = require('@abandonware/noble');

// Variables needed for the web server and real-time communication
const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static('public'));
const PORT = 3000;


console.log('Starting radar...');
noble.on('stateChange', async(state) => {
    if (state === 'poweredOn') {
        console.log('Scanning for devices...');
        await noble.startScanningAsync([], true);
    } else {
        console.log(`Bluetooth state: ${state}. Please turn it on to start scanning.`);
    }
});

noble.on('discover', (peripheral) => {
    const name = peripheral.advertisement.localName || 'Unknown Peripheral';
    const ID = peripheral.id || 'Unknown ID';
    const rssi = peripheral.rssi;
    const address = peripheral.address !== 'unknown' ? peripheral.address : peripheral.id;
    const privacyLeak = peripheral.advertisement.localName ? 'Data Leak : Name Public' : 'Private';
    const mfgData = peripheral.advertisement.manufacturerData;
    let mfgName = "Unknown Manufacturer";
    
    // Check if mfgData exists AND has at least 2 bytes before reading
    if (Buffer.isBuffer(mfgData) && mfgData.length >= 2) {
      const code = mfgData.readUInt16LE(0); 
      
      if (code === 0x004C) mfgName = "Apple Inc.";
      else if (code === 0x0059) mfgName = "Nordic Semiconductor";
      else if (code === 0x0006) mfgName = "Microsoft";
      else mfgName = `ID: 0x${code.toString(16).toUpperCase()}`;
    }
    console.log('------------------------------------------------------------');
    console.log(`Device Name: ${name}`);
    console.log(`ID: ${ID}`);
    console.log(`Address: ${address}`);
    console.log(`RSSI: ${rssi} dBm`);
    console.log(`Manufacturer Name: ${mfgName}`);
    console.log(`Privacy Leak: ${privacyLeak}`);

    const devicesData = {
        id: ID,
        name: name,
        address: address,
        rssi: rssi,
        lastSeen: new Date().toLocaleTimeString(),
        mfg: mfgName,
        privacy: privacyLeak
    };
    
    // Send the device data to the web UI in real-time
    io.emit('device-spotted', devicesData);
});

server.listen(3000, () => {
    console.log('[\u{1F310}] Dashboard ready at http://localhost:3000');
});