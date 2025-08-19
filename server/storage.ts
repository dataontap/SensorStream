import { type Device, type InsertDevice, type SensorReading, type InsertSensorReading } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getDevice(id: string): Promise<Device | undefined>;
  getDevices(): Promise<Device[]>;
  createDevice(device: InsertDevice): Promise<Device>;
  updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined>;
  createSensorReading(reading: InsertSensorReading): Promise<SensorReading>;
  getRecentReadings(deviceId: string, limit?: number): Promise<SensorReading[]>;
  getLatestReading(deviceId: string): Promise<SensorReading | undefined>;
}

export class MemStorage implements IStorage {
  private devices: Map<string, Device>;
  private sensorReadings: Map<string, SensorReading>;

  constructor() {
    this.devices = new Map();
    this.sensorReadings = new Map();
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devices.get(id);
  }

  async getDevices(): Promise<Device[]> {
    return Array.from(this.devices.values()).sort((a, b) => 
      new Date(b.lastSeen || 0).getTime() - new Date(a.lastSeen || 0).getTime()
    );
  }

  async createDevice(insertDevice: InsertDevice): Promise<Device> {
    const device: Device = {
      ...insertDevice,
      userAgent: insertDevice.userAgent || null,
      lastSeen: new Date(),
      isActive: "true",
      batteryLevel: null,
      connectionQuality: "good",
    };
    this.devices.set(device.id, device);
    return device;
  }

  async updateDevice(id: string, updates: Partial<Device>): Promise<Device | undefined> {
    const device = this.devices.get(id);
    if (!device) return undefined;
    
    const updatedDevice = { ...device, ...updates, lastSeen: new Date() };
    this.devices.set(id, updatedDevice);
    return updatedDevice;
  }

  async createSensorReading(insertReading: InsertSensorReading): Promise<SensorReading> {
    const id = randomUUID();
    const reading: SensorReading = {
      ...insertReading,
      id,
      timestamp: new Date(),
      accelerometer: insertReading.accelerometer || null,
      magnetometer: insertReading.magnetometer || null,
      orientation: insertReading.orientation || null,
      lightLevel: insertReading.lightLevel || null,
      airPressure: insertReading.airPressure || null,
    };
    this.sensorReadings.set(id, reading);
    
    // Update device last seen
    await this.updateDevice(reading.deviceId, {});
    
    return reading;
  }

  async getRecentReadings(deviceId: string, limit: number = 50): Promise<SensorReading[]> {
    return Array.from(this.sensorReadings.values())
      .filter(reading => reading.deviceId === deviceId)
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
      .slice(0, limit);
  }

  async getLatestReading(deviceId: string): Promise<SensorReading | undefined> {
    const readings = await this.getRecentReadings(deviceId, 1);
    return readings[0];
  }
}

export const storage = new MemStorage();
