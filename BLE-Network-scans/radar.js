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

const scanTime = 2 * 60 * 1000;

const mdns = require("multicast-dns")();
const { exec } = require('child_process');
const engine = require("./fingerprint-engine");

const COMPANY_IDS = {
  0x0006: "Microsoft",
  0x000a: "Qualcomm",
  0x004c: "Apple, Inc.",
  0x0059: "Nordic Semiconductor (DIY/IoT)",
  0x0075: "Samsung Electronics",
  0x0087: "Garmin International",
  0x00d2: "Samsung (Alternative)",
  0x00e0: "Google",
  0x0111: "ORACLE",
  0x012d: "Sony Corporation",
  0x0157: "Anker (Wonderland)",
  0x01fd: "Casio Computer",
  0x02d0: "Amazon.com",
  0x038f: "DJI (Dajiang)",
  0x0499: "Roku, Inc.",
  0x0504: "Google (Alternative)",
  0x05ac: "Apple (Secondary)",
  0x08a9: "Wyze Labs",
  0x0a5c: "Broadcom",
  0x1102: "Bose Corporation"
};

const appearanceMap = {
  0: "Unknown Ghost",
  64: "Phone",
  128: "Computer",
  193: "Sports Watch",
  384: "Remote Control",
  576: "Asset Tracker/Tag",
  832: "Thermometer",
  896: "Heart Rate Monitor",
  961: "Keyboard",
  962: "Mouse",
  963: "Gamepad"
};

const BLE_SERVICES = {
  // --- Core Infrastructure ---
  "1800": "Generic Access (Device Name/Appearance)",
  "1801": "Generic Attribute (Service Changed)",
  "180a": "Device Information (Manufacturer/Model)",
  
  // --- HID & Input ---
  "1812": "Human Interface Device (Mouse/Keyboard/Gamepad)",
  "1813": "Scan Parameters",
  
  // --- Health & Fitness ---
  "180d": "Heart Rate Monitor",
  "180e": "Phone Alert Status",
  "180f": "Battery Service",
  "1810": "Blood Pressure",
  "1814": "Running Speed and Cadence",
  "181b": "Body Composition",
  "181d": "Weight Scale",
  "181e": "Bond Management",
  "181f": "Continuous Glucose Monitoring",
  
  // --- Smart Home & Sensors ---
  "181a": "Environmental Sensing (Temp/Humidity/Lux)",
  "1815": "Automation IO",
  "1821": "Indoor Positioning",
  
  // --- Security & Proximity ---
  "1802": "Immediate Alert (Find My Device/Buzzer)",
  "1803": "Link Loss (Anti-Theft/Proximity)",
  "1804": "Tx Power Level",
  
  // --- Proprietary / Ecosystem Beacons (16-bit) ---
  "a201": "Proprietary Control Service (Custom)",
  "feaa": "Google Eddystone (Beacon)",
  "fed8": "Google Weave / Project Astra",
  "feaf": "Apple Continuity (AirDrop/Handoff)",
  "fd87": "Apple Find My (AirTag/iCloud Tracking)",
  "fee0": "Xiaomi Mi Band / Health",
  "fe9f": "Google Fast Pair Service",
  "fe59": "Nordic DFU (Wireless Firmware Update)",
  "fffe": "Alliance for Wireless Power (A4WP)",
  "fd82": "Honor/Huawei Ecosystem (Magic-Link/Nearby)",
  "fd87": "Apple Find My (AirTag/iCloud)",
  "feaa": "Google Eddystone (Beacon)",
  "fe9f": "Google Fast Pair"
};

console.log('Starting radar...');
noble.on('stateChange', async(state) => {
    console.log("Bluetooth state changed");
    if (state === 'poweredOn') {
        try{
            console.log('Scanning for devices...');
            await noble.startScanningAsync([], false);
            setTimeout(async () => {
                await noble.stopScanningAsync();
                console.log('Stopped scan after a minute.');
                process.exit(0);
            }, scanTime);
        }catch (err){
            console.error("Error starting scan: ", err);
        }
    } else {
        console.log(`Bluetooth state: ${state}. Please turn it on to start scanning.`);
    }
});

noble.on('discover', (peripheral) => {
    console.log("Discovered a device. Processing data...");
    const name = peripheral.advertisement.localName;
    const ID = peripheral.id;
    const rssi = peripheral.rssi;
    const appearance = peripheral.advertisement.appearance;
    const appearanceDesc = appearanceMap[appearance];
    const address = peripheral.address !== 'unknown' ? peripheral.address : peripheral.id;
    const privacyLeak = peripheral.advertisement.localName ? 'Data Leak : Name Public' : 'Private';
    const mfgData = peripheral.advertisement.manufacturerData;
    const serviceUuids = peripheral.advertisement.serviceUuids || [];

    let hexString = "No Data";
  
    // Map the UUIDs to their names
    const knownServices = serviceUuids
        .map(uuid => BLE_SERVICES[uuid.toLowerCase()] || '')
        .join(', ');

    let mfgName = "";
    
    // Check if mfgData exists AND has at least 2 bytes before reading
    if (mfgData && mfgData.length >= 2) {

        hexString = mfgData.toString('hex');
        const companyId = mfgData.readUInt16LE(0);
        mfgName = COMPANY_IDS[companyId] || '';
    }
    console.log('------------------------------------------------------------');
    console.log(`Device Name: ${name}`);
    console.log(`ID: ${ID}`);
    console.log(`Address: ${address}`);
    console.log(`RSSI: ${rssi} dBm`);
    console.log(`Manufacturer Name: ${mfgName}`);
    console.log(`Privacy Leak: ${privacyLeak}`);
    console.log('Appearance: ', appearanceDesc);
    if (serviceUuids.length > 0) {
        console.log(`Capabilities: ${knownServices}`);
    }
    console.log(`Raw Manufacturer Data: ${hexString}`);

    const devicesData = {
        id: ID,
        name: name,
        address: address,
        rssi: rssi,
        appearance: appearanceDesc,
        type: knownServices,
        lastSeen: new Date().toLocaleTimeString(),
        mfg: mfgName,
        rawData: hexString,
        privacy: privacyLeak
    };
    
    // Send the device data to the web UI in real-time
    io.emit('device-spotted', devicesData);
});

mdns.on("response", (response) => {
    console.log("Received mDNS response with answers");
    response.answers.forEach((answer) => {
        if (answer.type === "PTR" || answer.type === "SRV") {
            const networkDevice = {
                id: answer.data,
                name: answer.name.replace('._tcp.local', '').replace('._udp.local', ''),
                category: 'Network Service',
                connectionType: 'Wi-Fi/mDNS',
                risk: 'Low',
                rssi: -40,
                lastSeen: new Date().toLocaleTimeString()
            };
            io.emit("device-spotted", networkDevice);
        }
    });
});

let isAuditing = false;
async function runNetworkAudit() {
    if (isAuditing) return;
    isAuditing = true;

    console.log("[\u{1F50E}] Reading System ARP Cache (Low Memory Mode)...");

    // 'arp -a' is a native Windows command
    exec('arp -a', (err, stdout, stderr) => {
        if (err) {
            isAuditing = false;
            return console.error("ARP Error:", err);
        }

        const lines = stdout.split('\n');
        let processedCount = 0;

        lines.forEach(line => {
            // Regex to find: [IP Address] [MAC Address] [Type]
            // Matches patterns like: 192.168.1.1  00-11-22-33-44-55  dynamic
            const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f-]{17})/i);
            
            if (match && processedCount < 10) {
                const ip = match[1];
                const mac = match[2].replace(/-/g, ':').toLowerCase();
                
                // Skip broadcast/multicast addresses (ending in .255 or starting with 224/239)
                if (ip.endsWith('.255') || ip.startsWith('224') || ip.startsWith('239')) return;

                processedCount++;
                
                io.emit('device-spotted', {
                    id: mac,
                    name: `Network Node (${ip})`,
                    category: 'Network Device',
                    connectionType: 'ARP-Cache',
                    ip: ip,
                    lastSeen: new Date().toLocaleTimeString()
                });
            }
        });

        console.log(`[\u2705] Audit Complete. Processed ${processedCount} devices from cache.`);
        
        isAuditing = false;

        setTimeout(runNetworkAudit, 60000);
    });
}

runNetworkAudit(); // Initial run on startup

server.listen(3000, () => {
    console.log('[\u{1F310}] Dashboard ready at http://localhost:3000');
});