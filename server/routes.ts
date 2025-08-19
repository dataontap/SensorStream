import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertDeviceSchema, insertSensorReadingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients with their device IDs
  const clients = new Map<string, WebSocket>();
  
  wss.on('connection', (ws, req) => {
    let deviceId: string | null = null;
    
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
          broadcastDeviceList();
        }
        
        if (message.type === 'sensor-data' && deviceId) {
          console.log('Received sensor data for device:', deviceId, message.data);
          // Store sensor reading
          const reading = await storage.createSensorReading({
            deviceId,
            ...message.data
          });
          
          console.log('Stored reading:', reading.id);
          
          // Broadcast to all clients
          broadcastToAll({
            type: 'sensor-update',
            deviceId,
            reading
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
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
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
  
  async function broadcastDeviceList() {
    const devices = await storage.getDevices();
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

  return httpServer;
}
