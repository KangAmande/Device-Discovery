const noble = require('@abandonware/noble');
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
    const rssi = peripheral.rssi;
    const address = peripheral.address !== 'unknown' ? peripheral.address : peripheral.id;
    const privacyLeak = peripheral.advertisement.localName ? 'Data Leak : Name Public' : 'Private';
    console.log('------------------------------------------------------------');
    console.log(`Device Name: ${name}`);
    console.log(`Address: ${address}`);
    console.log(`RSSI: ${rssi} dBm`);
    console.log(`Privacy Leak: ${privacyLeak}`);
});