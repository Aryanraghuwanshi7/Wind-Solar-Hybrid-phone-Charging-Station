# ⚡ BatteryLife — Phone Battery Health & Optimization Tracker

A feature-rich **Progressive Web App (PWA)** that helps you monitor, track, and improve your phone's battery health — all from the browser, with zero backend and zero data leaving your device.

> 🔋 Live battery monitoring · 📊 Health analytics · 📱 Phone ↔ Laptop connection · 🤖 AI insights

---

## 🚀 Live Demo

Open `index.html` directly in your browser, or run a local server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

Or use any static file server — no build step required.

---

## ✨ Features

### 📊 Dashboard
- Real-time battery level and charging status (via Battery Status API)
- Battery Care Score with animated ring meter
- Lifespan predictor & daily report
- Stress warning banner (mild / high / critical)
- Auto-logger for background charge session tracking

### 🔋 Battery Health Tracker
- Log health percentage over time
- Visual bar chart (last 14 entries)
- One-click log from live battery reading

### 📱 Charge History
- Log sessions: start %, end %, duration, charger type
- Habit Stress Summary (fast charges, full cycles, deep discharges)
- Charging Time Heatmap — see *when* you usually plug in

### 📱↔💻 Phone ↔ Laptop Connection (WebRTC)
Connect your phone and laptop peer-to-peer with a 6-character code:
- **Live battery stats** streamed every 2 seconds (battery %, RAM, network, storage)
- **Shared Clipboard** — send text and links between devices instantly
- **File Transfer** — send files directly, no cloud needed
- **Remote Control** — use your phone to scroll the laptop screen (↑↓←→)
- **Camera Streaming** — live phone camera feed on the laptop
- **Find My Phone** — trigger alarm, vibration & screen flash from laptop
- **GPS Location** — view phone location on an interactive map (Leaflet)
- **Gyro Scroll** — tilt your phone to scroll the laptop
- **Voice Commands** — control laptop via speech recognition
- **QR Code Scanner** — scan QR codes on the phone, send to laptop
- **Push Notifications** — send notifications from laptop → phone
- **Slide Push** — push content to phone's secondary display
- **AI Charging Insights** — pattern analysis from charge history
- **Battery Health Certificate** — export a printable health report

### ⏰ Reminders
- Set recurring reminders for healthy charging habits
- Custom text, time & repeat options (daily / weekdays / weekly / once)

### 🏆 Achievements & Gamification
- Unlock badges for good battery habits
- Streak tracking and achievement history

### 🧮 Interactive Tools
- **Battery Life Estimator** — estimate remaining hours by usage intensity
- **Charge Time Estimator** — estimate time to target % by charger wattage

### 📱 Phone Models & Charger Compare
- Database of phone battery capacities and specs
- Side-by-side charger comparison tool

### 💾 Export / Import
- Export all data as JSON backup
- Import data to restore or transfer between devices
- Cloud Sync via peer-to-peer QR code transfer

### ⚙️ Settings & More
- Dark / Light / OLED black themes
- Battery Drain Benchmark (5-minute stress test)
- Mobile-First Responsive UI — Slide-in sidebar & hamburger menu for phones
- Offline-capable (PWA with Service Worker)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (Semantic) |
| Styling | CSS3 (Custom Properties, Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| P2P Connection | [PeerJS](https://peerjs.com/) (WebRTC) |
| Maps | [Leaflet.js](https://leafletjs.com/) |
| QR Codes | [jsQR](https://github.com/cozmo/jsQR) + [QRCode.js](https://davidshimjs.github.io/qrcodejs/) |
| Fonts | Google Fonts — Outfit, JetBrains Mono |
| Offline | Service Worker (PWA) |

---

## 📁 Project Structure

```
mdp project/
├── index.html          # Main app shell & all sections
├── app.js              # All application logic (~2600 lines)
├── styles.css          # Full design system & component styles
├── sw.js               # Service Worker for PWA/offline support
├── manifest.json       # PWA manifest
└── spotify-clone/      # Bonus: Spotify-style music player
```

---

## 📦 Data & Privacy

- **100% local** — all data stored in `localStorage`
- **No server, no account, no tracking**
- P2P connections (WebRTC) go directly device-to-device
- Works fully offline after first load (PWA)

---

## 🔌 Requirements

- Modern browser (Chrome / Firefox / Edge recommended)
- **Android Chrome** — full Battery API support
- **iOS Safari** — Battery API not supported (Apple restriction); all other features work
- Both devices on same network for P2P features (or any internet connection via PeerJS signalling)

---

## 📄 License

MIT — free to use, modify, and distribute.

---

Made with ⚡ by Aryan Raghuwanshi
