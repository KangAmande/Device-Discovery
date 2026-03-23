1. OUI Manufacturer Lookup: Integrate a local manuf database or an API (like MacAddress.io) to resolve MAC addresses to vendors

2. Distance Estimation (Triangulation): Implement the Log-Distance Path Loss Model to convert RSSI (dBm) into approximate meters.Formula: $d = 10^{\frac{P_0 - RSSI}{10n}}$

3. Persistent Database: Move from an in-memory Map to SQLite or LowDB to track device history across server restarts.

4. Historical Trend Graphs: Use Chart.js to show a device's signal strength over the last 10 minutes.

5. Audio Alerts: Add a "Geiger Counter" click sound effect that increases in frequency as a "High Risk" device's RSSI gets stronger.Audio Alerts: Add a "Geiger Counter" click sound effect that increases in frequency as a "High Risk" device's RSSI gets stronger.

6. Dark/Light Mode Toggle: Add a high-contrast "Field Mode" for outdoor/daylight use.