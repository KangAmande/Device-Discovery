const noble = require('@abandonware/noble');
const TARGET_ID = "".toLowerCase();

noble.on('stateChange', async(state) => {
    if (state === 'poweredOn') {
        console.log('Searching for specific target device...');
        await noble.startScanningAsync();
    }
});
noble.on('discover', async (peripheral) => {
    const pId = (peripheral.id || '').toLowerCase();
    const pAddr = (peripheral.address || '').toLowerCase();
    if (pId === TARGET_ID || pAddr === TARGET_ID) {
        console.log('Found target device:', peripheral.advertisement.localName, pId, pAddr);
        await noble.stopScanningAsync();
        
        try{
            console.log("Connecting to target device...");
            await peripheral.connectAsync();
            console.log("Inspecting GATT services....");
            await new Promise(resolve => setTimeout(resolve, 1000));
            const { services } = await peripheral.discoverAllServicesAndCharacteristicsAsync();
            services.forEach(service => {
                console.log(`Service UUID: ${service.uuid}`);
                service.characteristics.forEach(characteristic => {
                    const props = characteristic.properties.join(', ');
                    console.log(`  Characteristic UUID: ${characteristic.uuid} | Properties: ${props}`);

                    if (characteristic.properties.includes('writeWithoutResponse') || characteristic.properties.includes('write')) {
                        console.log(`    Potentially writable characteristic found: ${characteristic.uuid}`);
                    }
                });
            });
            await peripheral.disconnectAsync();
            console.log("Disconnected from target device.");
            process.exit();
        } catch (error) {
            if(error.message.includes('1') || error.message.includes('unreachable')) {
                console.error("Device is unreachable. It may be out of range or powered off.");
            }
            console.error("Error during connection or service discovery:", error);
        }
    }
});