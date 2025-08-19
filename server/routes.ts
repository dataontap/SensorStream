import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertDeviceSchema, insertSensorReadingSchema, insertLocationPredictionSchema } from "@shared/schema";
import { analyzeLocationFromSensorData } from "./gemini-service";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients with their device IDs
  const clients = new Map<string, WebSocket>();
  
  wss.on('connection', (ws, req) => {
    let deviceId: string | null = null;
    console.log('New WebSocket connection established');
    
    // Send initial device list to new connections
    setTimeout(async () => {
      await broadcastDeviceList();
    }, 500);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'register') {
          deviceId = message.deviceId;
          if (deviceId) {
            clients.set(deviceId, ws);
            
            // Update device status
            const device = await storage.getDevice(deviceId);
            if (device) {
              await storage.updateDevice(deviceId, { isActive: "true" });
            }
          }
          
          // Broadcast device list update
          console.log(`Device ${deviceId} WebSocket registration complete`);
          setTimeout(async () => {
            await broadcastDeviceList();
          }, 100);
        }
        
        if (message.type === 'sensor-data' && deviceId) {
          console.log('Received sensor data for device:', deviceId, message.data);
          
          // Update device status to active when receiving sensor data
          await storage.updateDevice(deviceId, { 
            isActive: "true", 
            lastSeen: new Date() 
          });
          console.log('📱 Updated device', deviceId, 'status to ACTIVE');
          
          // Store sensor reading
          const reading = await storage.createSensorReading({
            deviceId,
            ...message.data
          });
          
          console.log('Stored reading:', reading.id);
          
          // Broadcast to all clients
          console.log('📡 SERVER: Broadcasting sensor update to', clients.size, 'clients');
          const broadcastMessage = {
            type: 'sensor-update',
            deviceId,
            reading
          };
          console.log('📡 SERVER: Broadcasting message:', JSON.stringify(broadcastMessage));
          broadcastToAll(broadcastMessage);
          
          // Also broadcast updated device list to show active status
          setTimeout(async () => {
            await broadcastDeviceList();
          }, 100);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        // Log WebSocket errors to Sentry if available
        if (process.env.SENTRY_KEY) {
          const Sentry = require('@sentry/node');
          Sentry.captureException(error);
        }
      }
    });
    
    ws.on('close', async () => {
      if (deviceId) {
        clients.delete(deviceId);
        await storage.updateDevice(deviceId, { isActive: "false" });
        broadcastDeviceList();
      }
    });
  });
  
  function broadcastToAll(message: any) {
    const messageStr = JSON.stringify(message);
    console.log('📡 SERVER: Broadcasting to', clients.size, 'total clients');
    let sentCount = 0;
    
    clients.forEach((client, deviceId) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        sentCount++;
        console.log('📡 SERVER: Sent to device', deviceId);
      } else {
        console.log('⚠️ SERVER: Skipping closed connection for device', deviceId);
      }
    });
    
    console.log('📡 SERVER: Successfully sent to', sentCount, 'clients');
  }
  
  async function broadcastDeviceList() {
    const devices = await storage.getDevices();
    console.log('Broadcasting device list:', devices.map(d => `${d.name} (${d.id}) - Active: ${d.isActive}`));
    broadcastToAll({
      type: 'device-list',
      devices
    });
  }

  // REST API routes
  app.get("/api/devices", async (req, res) => {
    try {
      const devices = await storage.getDevices();
      res.json(devices);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch devices" });
    }
  });

  app.post("/api/devices", async (req, res) => {
    try {
      const deviceData = insertDeviceSchema.parse(req.body);
      const device = await storage.createDevice(deviceData);
      
      // Broadcast device list update
      broadcastDeviceList();
      
      res.json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create device" });
      }
    }
  });

  app.get("/api/devices/:id", async (req, res) => {
    try {
      const device = await storage.getDevice(req.params.id);
      if (!device) {
        return res.status(404).json({ error: "Device not found" });
      }
      res.json(device);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch device" });
    }
  });

  app.get("/api/devices/:id/readings", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const readings = await storage.getRecentReadings(req.params.id, limit);
      res.json(readings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch readings" });
    }
  });

  app.get("/api/devices/:id/latest", async (req, res) => {
    try {
      const reading = await storage.getLatestReading(req.params.id);
      if (!reading) {
        return res.status(404).json({ error: "No readings found" });
      }
      res.json(reading);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest reading" });
    }
  });

  app.post("/api/sensor-readings", async (req, res) => {
    try {
      const readingData = insertSensorReadingSchema.parse(req.body);
      const reading = await storage.createSensorReading(readingData);
      
      // Broadcast to all WebSocket clients
      broadcastToAll({
        type: 'sensor-update',
        deviceId: reading.deviceId,
        reading
      });
      
      res.json(reading);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create reading" });
      }
    }
  });

  // AI Location Prediction Routes
  
  // Get location predictions for a device
  app.get('/api/devices/:deviceId/predictions', async (req, res) => {
    try {
      const { deviceId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const predictions = await storage.getLocationPredictions(deviceId, limit);
      res.json(predictions);
    } catch (error) {
      console.error('Error getting predictions:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create a new location prediction using AI
  app.post('/api/devices/:deviceId/predictions/analyze', async (req, res) => {
    try {
      const { deviceId } = req.params;
      
      // Get recent sensor readings (last 30 readings)
      const recentReadings = await storage.getRecentReadings(deviceId, 30);
      
      if (recentReadings.length === 0) {
        return res.status(400).json({ message: 'No sensor data available for analysis' });
      }
      
      // Get historical predictions for learning
      const historicalPredictions = await storage.getHistoricalPredictions(deviceId);
      
      // Analyze location using Gemini AI
      const analysis = await analyzeLocationFromSensorData(recentReadings, historicalPredictions);
      
      // Create prediction record
      const prediction = await storage.createLocationPrediction({
        deviceId,
        prediction: analysis.prediction,
        confidence: analysis.confidence,
        sensorDataSnapshot: {
          readingsCount: recentReadings.length,
          timespan: recentReadings.length > 1 ? 
            new Date(recentReadings[0].timestamp!).getTime() - new Date(recentReadings[recentReadings.length - 1].timestamp!).getTime() : 0,
          reasoning: analysis.reasoning,
          analysis: analysis
        }
      });
      
      res.json({
        prediction,
        analysis
      });
      
    } catch (error) {
      console.error('Error analyzing location:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  // Confirm a location prediction
  app.post('/api/predictions/:predictionId/confirm', async (req, res) => {
    try {
      const { predictionId } = req.params;
      const { isCorrect, actualLocation } = req.body;
      
      if (typeof isCorrect !== 'boolean') {
        return res.status(400).json({ message: 'isCorrect must be a boolean' });
      }
      
      if (!actualLocation || !['indoor', 'outdoor'].includes(actualLocation)) {
        return res.status(400).json({ message: 'actualLocation must be indoor or outdoor' });
      }
      
      const updatedPrediction = await storage.updateLocationPrediction(predictionId, {
        userConfirmation: isCorrect ? 'correct' : 'incorrect',
        actualLocation
      });
      
      if (!updatedPrediction) {
        return res.status(404).json({ message: 'Prediction not found' });
      }
      
      res.json(updatedPrediction);
      
    } catch (error) {
      console.error('Error confirming prediction:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  return httpServer;
}
