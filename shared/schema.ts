import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const devices = pgTable("devices", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  userAgent: text("user_agent"),
  lastSeen: timestamp("last_seen").defaultNow(),
  isActive: text("is_active").default("true"),
  batteryLevel: real("battery_level"),
  connectionQuality: text("connection_quality").default("good"),
});

export const sensorReadings = pgTable("sensor_readings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deviceId: varchar("device_id").notNull().references(() => devices.id),
  timestamp: timestamp("timestamp").defaultNow(),
  accelerometer: jsonb("accelerometer").$type<{x: number, y: number, z: number}>(),
  magnetometer: jsonb("magnetometer").$type<{x: number, y: number, z: number}>(),
  lightLevel: real("light_level"),
  airPressure: real("air_pressure"),
  orientation: jsonb("orientation").$type<{alpha: number, beta: number, gamma: number}>(),
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  lastSeen: true,
});

export const insertSensorReadingSchema = createInsertSchema(sensorReadings).omit({
  id: true,
  timestamp: true,
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertSensorReading = z.infer<typeof insertSensorReadingSchema>;
export type SensorReading = typeof sensorReadings.$inferSelect;
