package com.sensordata

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.net.wifi.WifiManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.sensordata.ui.theme.SensorDataTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity(), SensorEventListener {
    
    private lateinit var sensorManager: SensorManager
    private var accelerometer: Sensor? = null
    private var magnetometer: Sensor? = null
    private var lightSensor: Sensor? = null
    private var pressureSensor: Sensor? = null
    
    private var accelerometerData = mutableStateOf("X: 0.00, Y: 0.00, Z: 0.00")
    private var magnetometerData = mutableStateOf("X: 0.00, Y: 0.00, Z: 0.00")
    private var lightData = mutableStateOf("0.00 lux")
    private var pressureData = mutableStateOf("0.00 hPa")
    private var isCollecting = mutableStateOf(false)
    private var deviceId = mutableStateOf("")
    private var connectionStatus = mutableStateOf("Disconnected")
    
    private val handler = Handler(Looper.getMainLooper())
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    // Server configuration - replace with your actual server URL
    private val serverUrl = "http://10.0.2.2:5000" // For Android emulator
    // Use your actual server IP for physical device: "http://YOUR_SERVER_IP:5000"
    
    private val requestPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        if (permissions.values.all { it }) {
            initializeSensors()
        } else {
            Toast.makeText(this, "Sensor permissions are required", Toast.LENGTH_LONG).show()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        deviceId.value = generateDeviceId()
        
        // Request permissions
        requestSensorPermissions()
        
        setContent {
            SensorDataTheme {
                SensorDataApp()
            }
        }
    }
    
    private fun requestSensorPermissions() {
        val permissionsToRequest = mutableListOf<String>()
        
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.INTERNET) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.INTERNET)
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_NETWORK_STATE) != PackageManager.PERMISSION_GRANTED) {
            permissionsToRequest.add(Manifest.permission.ACCESS_NETWORK_STATE)
        }
        
        if (permissionsToRequest.isNotEmpty()) {
            requestPermissionLauncher.launch(permissionsToRequest.toTypedArray())
        } else {
            initializeSensors()
        }
    }
    
    private fun initializeSensors() {
        accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        magnetometer = sensorManager.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)
        lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT)
        pressureSensor = sensorManager.getDefaultSensor(Sensor.TYPE_PRESSURE)
        
        if (accelerometer == null) {
            Toast.makeText(this, "Accelerometer not available", Toast.LENGTH_SHORT).show()
        }
        if (magnetometer == null) {
            Toast.makeText(this, "Magnetometer not available", Toast.LENGTH_SHORT).show()
        }
        if (lightSensor == null) {
            Toast.makeText(this, "Light sensor not available", Toast.LENGTH_SHORT).show()
        }
        if (pressureSensor == null) {
            Toast.makeText(this, "Pressure sensor not available", Toast.LENGTH_SHORT).show()
        }
        
        registerDevice()
    }
    
    private fun generateDeviceId(): String {
        val androidId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID)
        return "ANDROID-$androidId-${System.currentTimeMillis()}"
    }
    
    private fun registerDevice() {
        val json = JSONObject().apply {
            put("id", deviceId.value)
            put("name", "Android Device")
            put("userAgent", "Android ${android.os.Build.VERSION.RELEASE}")
        }
        
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$serverUrl/api/devices")
            .post(body)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread {
                    connectionStatus.value = "Failed to register"
                    Toast.makeText(this@MainActivity, "Failed to register device: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
            
            override fun onResponse(call: Call, response: Response) {
                runOnUiThread {
                    if (response.isSuccessful) {
                        connectionStatus.value = "Registered"
                        Toast.makeText(this@MainActivity, "Device registered successfully", Toast.LENGTH_SHORT).show()
                    } else {
                        connectionStatus.value = "Registration failed"
                        Toast.makeText(this@MainActivity, "Registration failed: ${response.code}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }
    
    private fun startSensorCollection() {
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        magnetometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        lightSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        pressureSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
        
        isCollecting.value = true
        connectionStatus.value = "Collecting Data"
        
        // Start sending data every 200ms
        startDataTransmission()
    }
    
    private fun stopSensorCollection() {
        sensorManager.unregisterListener(this)
        isCollecting.value = false
        connectionStatus.value = "Stopped"
        handler.removeCallbacksAndMessages(null)
    }
    
    private fun startDataTransmission() {
        val runnable = object : Runnable {
            override fun run() {
                if (isCollecting.value) {
                    sendSensorData()
                    handler.postDelayed(this, 200) // Send every 200ms
                }
            }
        }
        handler.post(runnable)
    }
    
    private fun sendSensorData() {
        val json = JSONObject().apply {
            put("deviceId", deviceId.value)
            
            // Add accelerometer data
            val accelParts = accelerometerData.value.split(", ")
            if (accelParts.size == 3) {
                val accelJson = JSONObject().apply {
                    put("x", accelParts[0].substringAfter("X: ").toDoubleOrNull() ?: 0.0)
                    put("y", accelParts[1].substringAfter("Y: ").toDoubleOrNull() ?: 0.0)
                    put("z", accelParts[2].substringAfter("Z: ").toDoubleOrNull() ?: 0.0)
                }
                put("accelerometer", accelJson)
            }
            
            // Add magnetometer data
            val magParts = magnetometerData.value.split(", ")
            if (magParts.size == 3) {
                val magJson = JSONObject().apply {
                    put("x", magParts[0].substringAfter("X: ").toDoubleOrNull() ?: 0.0)
                    put("y", magParts[1].substringAfter("Y: ").toDoubleOrNull() ?: 0.0)
                    put("z", magParts[2].substringAfter("Z: ").toDoubleOrNull() ?: 0.0)
                }
                put("magnetometer", magJson)
            }
            
            // Add light level
            val lightValue = lightData.value.substringBefore(" lux").toDoubleOrNull()
            if (lightValue != null) {
                put("lightLevel", lightValue)
            }
            
            // Add air pressure
            val pressureValue = pressureData.value.substringBefore(" hPa").toDoubleOrNull()
            if (pressureValue != null) {
                put("airPressure", pressureValue)
            }
        }
        
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("$serverUrl/api/sensor-readings")
            .post(body)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                // Silently fail for now to avoid spam
            }
            
            override fun onResponse(call: Call, response: Response) {
                // Data sent successfully
            }
        })
    }
    
    override fun onSensorChanged(event: SensorEvent?) {
        event?.let {
            when (it.sensor.type) {
                Sensor.TYPE_ACCELEROMETER -> {
                    accelerometerData.value = "X: %.2f, Y: %.2f, Z: %.2f".format(
                        it.values[0], it.values[1], it.values[2]
                    )
                }
                Sensor.TYPE_MAGNETIC_FIELD -> {
                    magnetometerData.value = "X: %.2f, Y: %.2f, Z: %.2f".format(
                        it.values[0], it.values[1], it.values[2]
                    )
                }
                Sensor.TYPE_LIGHT -> {
                    lightData.value = "%.2f lux".format(it.values[0])
                }
                Sensor.TYPE_PRESSURE -> {
                    pressureData.value = "%.2f hPa".format(it.values[0])
                }
            }
        }
    }
    
    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Handle accuracy changes if needed
    }
    
    @Composable
    fun SensorDataApp() {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                text = "Sensor Data Collection",
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            // Device Info
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        text = "Device Information",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Text("Device ID: ${deviceId.value}")
                    Text("Status: ${connectionStatus.value}")
                }
            }
            
            // Control Buttons
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Button(
                    onClick = { startSensorCollection() },
                    enabled = !isCollecting.value,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50))
                ) {
                    Text("Start Collection")
                }
                
                Button(
                    onClick = { stopSensorCollection() },
                    enabled = isCollecting.value,
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF44336))
                ) {
                    Text("Stop Collection")
                }
            }
            
            // Sensor Data Display
            LazyColumn {
                items(
                    listOf(
                        "Accelerometer (m/s²)" to accelerometerData.value,
                        "Magnetometer (μT)" to magnetometerData.value,
                        "Light Sensor" to lightData.value,
                        "Air Pressure" to pressureData.value
                    )
                ) { (title, value) ->
                    SensorCard(title = title, value = value)
                }
            }
        }
    }
    
    @Composable
    fun SensorCard(title: String, value: String) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = title,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF1976D2)
                )
                Text(
                    text = value,
                    fontSize = 14.sp,
                    modifier = Modifier.padding(top = 4.dp)
                )
            }
        }
    }
}