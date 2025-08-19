# Android Sensor Data Collection App

This is a native Android application written in Kotlin that collects sensor data from your device and sends it to a real-time dashboard server.

## Features

- **Real-time sensor data collection** using Android Hardware Sensor APIs
- **Multiple sensor support**:
  - Accelerometer (X, Y, Z axes)
  - Magnetometer (X, Y, Z axes) 
  - Light sensor (Ambient light level)
  - Air pressure sensor (Barometric pressure)
- **Live data streaming** to web dashboard
- **Device identification** with unique Android device ID
- **Modern UI** built with Jetpack Compose
- **Real-time visualization** on connected web dashboard

## Sensors Used

The app implements the Android Hardware Sensor framework with these specific sensors:

### Accelerometer (TYPE_ACCELEROMETER)
```kotlin
// Measures acceleration in m/s² including gravity
accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
```

### Magnetometer (TYPE_MAGNETIC_FIELD) 
```kotlin
// Measures magnetic field strength in μT (microtesla)
magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
```

### Light Sensor (TYPE_LIGHT)
```kotlin
// Measures ambient light level in lux
lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
```

### Pressure Sensor (TYPE_PRESSURE)
```kotlin
// Measures atmospheric pressure in hPa (hectopascal)
pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE)
```

## Setup Instructions

1. **Import the project** in Android Studio
2. **Update server URL** in MainActivity.kt:
   ```kotlin
   // Change this to your server's IP address
   private val serverUrl = "http://YOUR_SERVER_IP:5000"
   ```
3. **Build and install** the app on your Android device
4. **Grant permissions** when prompted
5. **Register device** (happens automatically on first launch)
6. **Start data collection** by tapping "Start Collection"

## How It Works

1. **Device Registration**: App generates unique device ID and registers with server
2. **Sensor Initialization**: Accesses device sensors using SensorManager
3. **Data Collection**: Implements SensorEventListener to receive sensor updates
4. **Real-time Transmission**: Sends sensor data to server every 200ms via HTTP POST
5. **Dashboard Visualization**: Server broadcasts data to web dashboard via WebSocket

## API Communication

The app communicates with the server using these endpoints:

### Device Registration
```http
POST /api/devices
Content-Type: application/json

{
  "id": "ANDROID-device_id-timestamp",
  "name": "Android Device", 
  "userAgent": "Android 13"
}
```

### Sensor Data Transmission
```http
POST /api/sensor-readings
Content-Type: application/json

{
  "deviceId": "ANDROID-device_id-timestamp",
  "accelerometer": {"x": 0.12, "y": 9.81, "z": 0.05},
  "magnetometer": {"x": 23.4, "y": -12.1, "z": 45.6},
  "lightLevel": 150.5,
  "airPressure": 1013.25
}
```

## Requirements

- **Android 7.0 (API level 24)** or higher
- **Internet permission** for server communication
- **Hardware sensors** (accelerometer, magnetometer, light, pressure)
- **Network connectivity** to reach the dashboard server

## Permissions

The app requires these permissions:
- `INTERNET` - Send data to server
- `ACCESS_NETWORK_STATE` - Check network connectivity
- `ACCESS_WIFI_STATE` - Access WiFi information

## Dashboard Integration

Once the app is collecting data, you can:
1. Open the web dashboard at `http://YOUR_SERVER_IP:5000`
2. See your Android device listed in the device selector
3. View real-time charts of all sensor data
4. Export collected data as CSV files

The dashboard shows live visualizations of:
- X, Y, Z acceleration values
- Magnetic field measurements  
- Ambient light levels
- Atmospheric pressure readings