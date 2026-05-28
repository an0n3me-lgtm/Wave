# Wave 1.0.0 — Release Artifacts

## 📱 Android APK

**File:** `Wave-1.0.0-debug.apk`  
**Size:** ~4 MB  
**Min Android version:** 6.0 (API 23)  

### Installation
1. Enable **"Install from unknown sources"** in Android Settings → Security
2. Transfer the APK to your Android device
3. Tap the APK file to install
4. Open Wave and create an account

### Features on Android
- Real-time messaging (requires internet)
- **Bluetooth BLE** — scan and chat with nearby Wave users without internet
- **WiFi Direct** — connect to other Wave users on the same WiFi network
- Push notification support
- Responsive design optimized for mobile

---

## 🖥️ Windows

**File:** `Wave-1.0.0-Windows-x64.zip`  
**Size:** ~138 MB (includes Electron runtime)  

### Installation
1. Extract the ZIP anywhere on your computer
2. Open `win-unpacked/` folder
3. Double-click `Wave.exe` to launch
4. (Optional) Right-click `Wave.exe` → "Create shortcut" → move to Desktop

### Features on Windows
- Real-time messaging
- **Bluetooth BLE** (Web Bluetooth API via Chromium)
- Embedded Wave server — works as both client and server on LAN
- System tray notifications
- Keyboard shortcuts

---

## 🔵 Bluetooth & WiFi Direct — How it works

### Bluetooth
Wave uses **Bluetooth Low Energy (BLE)** to discover and connect to other Wave users within ~10m range.

1. Open the **📡 Nearby** tab in the sidebar
2. Click **Scan for Devices** in the Bluetooth section
3. Select a Wave device from the list
4. Start chatting — no internet required!

### WiFi Direct / LAN
Wave uses **WebRTC peer connections** signalled through the Wave server to establish direct peer-to-peer data channels on the same network.

On Android, the native **WiFi P2P (WiFi Direct)** API is used, which allows communication without a router.

1. Open the **📡 Nearby** tab
2. Click **Start Discovery** in the Local Network section
3. Wave users on the same network will appear
4. Click **Connect** to establish a direct P2P channel
5. Click **Open** to start chatting offline

---

## ⚙️ Self-Hosting

See the main [README.md](../README.md) for instructions on running your own Wave server.
