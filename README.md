
# SensorStream 📱📊

A real-time sensor data collection and monitoring system that streams data from mobile devices to a web dashboard. Built with React, Express.js, WebSocket, and Android/Kotlin.

![SensorStream Dashboard](https://img.shields.io/badge/Platform-Web%20%7C%20Android-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Tech Stack](https://img.shields.io/badge/Tech-React%20%7C%20Express%20%7C%20WebSocket%20%7C%20Android-orange)

## 🌟 Features

### Real-Time Dashboard
- **Live sensor data visualization** with interactive charts
- **Multi-device support** with device selector and status indicators
- **WebSocket communication** for real-time updates
- **Data export** functionality (CSV format)
- **Responsive design** optimized for desktop and mobile viewing

### Mobile Sensor Collection
- **Android app** built with Kotlin and Jetpack Compose
- **Multiple sensor support**:
  - Accelerometer (X, Y, Z axes)
  - Magnetometer (X, Y, Z axes)
  - Light sensor (Ambient light level)
  - Air pressure sensor (Barometric pressure)
  - Device orientation (Alpha, Beta, Gamma)
- **Browser-based collection** for web devices
- **Real-time streaming** with 200ms update intervals

### Backend Infrastructure
- **Express.js REST API** with WebSocket support
- **In-memory storage** with database abstraction layer
- **Device management** with unique identification
- **Cross-platform compatibility** (Android, iOS, Web)

## 🚀 Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/dataontap/SensorStream.git
cd SensorStream
npm install
```

### 2. Start the Application
```bash
npm run dev
```

The application will be available at:
- **Dashboard**: `http://localhost:5000`
- **Device Collection**: `http://localhost:5000/device`

### 3. Connect Devices
- Open `http://localhost:5000/device` on your mobile device
- Tap "Start Sensor Collection" to begin streaming data
- View real-time data on the dashboard at `http://localhost:5000`

## 📱 Android App Setup

### Prerequisites
- Android Studio
- Android device with API level 24+ (Android 7.0)

### Installation
1. Open the `android-app` folder in Android Studio
2. Update the server URL in `MainActivity.kt`:
   ```kotlin
   private val serverUrl = "http://YOUR_SERVER_IP:5000"
   ```
3. Build and install the app on your Android device
4. Grant required permissions when prompted
5. Start sensor collection

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Radix UI** component library
- **TanStack React Query** for state management
- **Recharts** for data visualization
- **WebSocket (ws)** for real-time communication

### Backend
- **Express.js** web framework
- **WebSocket Server** for real-time data streaming
- **Zod** for data validation
- **In-memory storage** with future database support

### Mobile
- **Android Kotlin** with Jetpack Compose
- **Hardware Sensor APIs** for data collection
- **HTTP Client** for server communication

### Development
- **Vite** for fast development and building
- **TypeScript** for type safety
- **ESLint** for code quality

## 📊 Supported Sensors

| Sensor Type | Android App | Web Browser | Units | Description |
|-------------|-------------|-------------|-------|-------------|
| Accelerometer | ✅ | ✅ | m/s² | Linear acceleration including gravity |
| Magnetometer | ✅ | ✅ | μT | Magnetic field strength |
| Light Sensor | ✅ | ✅* | lx | Ambient light level |
| Air Pressure | ✅ | ✅* | hPa | Atmospheric pressure |
| Orientation | ✅ | ✅ | degrees | Device rotation (Alpha, Beta, Gamma) |

*Simulated data for web browsers without native sensor support

## 🔧 Configuration

### Environment Variables
Create a `.env` file for production deployment:
```env
PORT=5000
NODE_ENV=production
DATABASE_URL=your_database_url_here
```

### Network Setup
- Ensure devices are on the same network as the server
- For Android app, update the server IP address in the code
- Default port is 5000 (configurable)

## 📈 API Documentation

### Device Registration
```http
POST /api/devices
Content-Type: application/json

{
  "id": "unique-device-id",
  "name": "Device Name",
  "userAgent": "Browser/Platform Info"
}
```

### Sensor Data Submission
```http
POST /api/sensor-readings
Content-Type: application/json

{
  "deviceId": "unique-device-id",
  "accelerometer": {"x": 0.12, "y": 9.81, "z": 0.05},
  "magnetometer": {"x": 23.4, "y": -12.1, "z": 45.6},
  "orientation": {"alpha": 0, "beta": 15, "gamma": -5},
  "lightLevel": 150.5,
  "airPressure": 1013.25
}
```

### Get Device List
```http
GET /api/devices
```

### Get Sensor Readings
```http
GET /api/devices/{deviceId}/readings
```

## 🚀 Deployment

### Replit Deployment
1. Click the "Deploy" button in Replit
2. Configure deployment settings
3. Your app will be available at `https://your-app-name.replit.app`

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [SensorStream on Replit](https://sensorstream.replit.app)
- **GitHub Repository**: [https://github.com/dataontap/SensorStream](https://github.com/dataontap/SensorStream)
- **Android APK**: Available in releases

## 🐛 Known Issues

- Light sensor simulation may not reflect actual ambient conditions
- WebSocket reconnection handling in progress
- Battery level reporting not implemented for web devices

## 📧 Support

For questions and support, please open an issue on GitHub or contact the maintainers.

---

Built with ❤️ using React, Express.js, and Android/Kotlin
