import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { getHikvisionClient, registerDevice } from "./hikvision";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@db";
import { devices, users, accessEvents, apiKeys } from "@shared/schema";
import {
  deviceInsertSchema,
  userInsertSchema,
} from "@shared/schema";
import { randomBytes } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Sets up auth routes (/api/register, /api/login, /api/logout, /api/admin)
  const auth = setupAuth(app);
  const httpServer = createServer(app);

  // Dashboard stats
  app.get("/api/dashboard/stats", auth.isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Error retrieving dashboard stats" });
    }
  });

  // Recent events
  app.get("/api/dashboard/events", auth.isAuthenticated, async (req, res) => {
    try {
      const events = await storage.getRecentAccessEvents(10);
      
      // Join with user and device data
      const eventsWithDetails = await Promise.all(
        events.map(async (event) => {
          let user = null;
          let device = null;
          
          if (event.userId) {
            const userResult = await db
              .select()
              .from(users)
              .where(eq(users.id, event.userId))
              .limit(1);
            user = userResult[0] || null;
          }
          
          if (event.deviceId) {
            const deviceResult = await db
              .select()
              .from(devices)
              .where(eq(devices.id, event.deviceId))
              .limit(1);
            device = deviceResult[0] || null;
          }
          
          return {
            ...event,
            user,
            device,
          };
        })
      );
      
      res.json(eventsWithDetails);
    } catch (error) {
      console.error("Error getting recent events:", error);
      res.status(500).json({ message: "Error retrieving recent events" });
    }
  });

  // Device routes
  app.get("/api/devices", auth.isAuthenticated, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const { devices: deviceList, total } = await storage.listDevices(page, limit);
      res.json({ devices: deviceList, total });
    } catch (error) {
      console.error("Error getting devices:", error);
      res.status(500).json({ message: "Error retrieving devices" });
    }
  });

  app.get("/api/devices/:id", auth.isAuthenticated, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      res.json(device);
    } catch (error) {
      console.error("Error getting device:", error);
      res.status(500).json({ message: "Error retrieving device" });
    }
  });

  app.post("/api/devices", auth.isAuthenticated, async (req, res) => {
    try {
      const validatedData = deviceInsertSchema.parse(req.body);
      
      // Add creator information
      const deviceData = {
        ...validatedData,
        port: validatedData.port || 80,
        createdBy: req.user!.id,
      };
      
      // Register device with Hikvision
      const device = await registerDevice(deviceData);
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "device_created",
        details: { name: device.name, ip: device.ip },
        ipAddress: req.ip,
      });
      
      res.status(201).json(device);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating device:", error);
      res.status(500).json({ message: "Error creating device" });
    }
  });

  app.put("/api/devices/:id", auth.isAuthenticated, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const validatedData = deviceInsertSchema.partial().parse(req.body);
      const updatedDevice = await storage.updateDevice(deviceId, validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "device_updated",
        details: { id: deviceId, ...validatedData },
        ipAddress: req.ip,
      });
      
      res.json(updatedDevice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating device:", error);
      res.status(500).json({ message: "Error updating device" });
    }
  });

  app.delete("/api/devices/:id", auth.isAuthenticated, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const device = await storage.getDevice(deviceId);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      await db.delete(devices).where(eq(devices.id, deviceId));
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "device_deleted",
        details: { id: deviceId, name: device.name },
        ipAddress: req.ip,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).json({ message: "Error deleting device" });
    }
  });

  // Check device connectivity
  app.post("/api/devices/:id/check", auth.isAuthenticated, async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const client = await getHikvisionClient(deviceId);
      
      if (!client) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const connected = await client.checkConnectivity();
      res.json({ connected });
    } catch (error) {
      console.error("Error checking device connectivity:", error);
      res.status(500).json({ message: "Error checking device connectivity" });
    }
  });

  // User routes
  app.get("/api/users", auth.isAuthenticated, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      const { users: userList, total } = await storage.listUsers(page, limit);
      res.json({ users: userList, total });
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Error retrieving users" });
    }
  });

  app.get("/api/users/:id", auth.isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Error retrieving user" });
    }
  });

  app.post("/api/users", auth.isAuthenticated, async (req, res) => {
    try {
      const validatedData = userInsertSchema.parse(req.body);
      
      // Check if employee ID already exists
      const existingUser = await storage.getUserByEmployeeId(validatedData.employeeId);
      if (existingUser) {
        return res.status(400).json({ message: "Employee ID already exists" });
      }
      
      // Add creator information
      const userData = {
        ...validatedData,
        createdBy: req.user!.id,
      };
      
      const user = await storage.createUser(userData);
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "user_created",
        details: { employeeId: user.employeeId, name: `${user.firstName} ${user.lastName}` },
        ipAddress: req.ip,
      });
      
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Error creating user" });
    }
  });

  app.put("/api/users/:id", auth.isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const validatedData = userInsertSchema.partial().parse(req.body);
      
      // If updating employee ID, check for duplicates
      if (validatedData.employeeId && validatedData.employeeId !== user.employeeId) {
        const existingUser = await storage.getUserByEmployeeId(validatedData.employeeId);
        if (existingUser) {
          return res.status(400).json({ message: "Employee ID already exists" });
        }
      }
      
      const updatedUser = await storage.updateUser(userId, validatedData);
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "user_updated",
        details: { id: userId, ...validatedData },
        ipAddress: req.ip,
      });
      
      res.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user" });
    }
  });

  app.delete("/api/users/:id", auth.isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      await db.delete(users).where(eq(users.id, userId));
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "user_deleted",
        details: { id: userId, employeeId: user.employeeId },
        ipAddress: req.ip,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error deleting user" });
    }
  });

  // Register user biometric data on a device
  app.post("/api/users/:id/register-biometric", auth.isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const deviceId = parseInt(req.body.deviceId);
      const client = await getHikvisionClient(deviceId);
      
      if (!client) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Process any uploaded biometric data
      const faceImage = req.body.faceImage ? Buffer.from(req.body.faceImage, 'base64') : undefined;
      const fingerprint = req.body.fingerprint ? Buffer.from(req.body.fingerprint, 'base64') : undefined;
      
      // Register on device
      await client.registerUser(
        user.employeeId,
        `${user.firstName} ${user.lastName}`,
        faceImage,
        fingerprint
      );
      
      // Update user with biometric ID if needed
      if (!user.biometricId) {
        await storage.updateUser(userId, {
          biometricId: `BIO-${randomBytes(4).toString('hex').toUpperCase()}`,
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "user_biometrics_registered",
        details: { userId, deviceId },
        ipAddress: req.ip,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error registering biometric data:", error);
      res.status(500).json({ message: "Error registering biometric data" });
    }
  });

  // API Key routes
  app.get("/api/api-keys", auth.isAuthenticated, async (req, res) => {
    try {
      const keys = await db.select().from(apiKeys).where(eq(apiKeys.createdBy, req.user!.id));
      
      // Mask key value for security
      const maskedKeys = keys.map(key => ({
        ...key,
        key: key.key.substring(0, 8) + "••••••••••••••••" + key.key.substring(key.key.length - 6),
      }));
      
      res.json(maskedKeys);
    } catch (error) {
      console.error("Error getting API keys:", error);
      res.status(500).json({ message: "Error retrieving API keys" });
    }
  });

  app.post("/api/api-keys", auth.isAuthenticated, async (req, res) => {
    try {
      const { name } = req.body;
      
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "API key name is required" });
      }
      
      // Generate a random API key
      const key = randomBytes(32).toString('hex');
      
      const [newKey] = await db
        .insert(apiKeys)
        .values({
          name,
          key,
          active: true,
          createdBy: req.user!.id,
        })
        .returning();
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "api_key_created",
        details: { name, id: newKey.id },
        ipAddress: req.ip,
      });
      
      res.status(201).json({
        ...newKey,
        key, // Return the full key only on creation
      });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Error creating API key" });
    }
  });

  app.delete("/api/api-keys/:id", auth.isAuthenticated, async (req, res) => {
    try {
      const keyId = parseInt(req.params.id);
      
      // Ensure the key belongs to the admin
      const [key] = await db
        .select()
        .from(apiKeys)
        .where(eq(apiKeys.id, keyId))
        .limit(1);
      
      if (!key || key.createdBy !== req.user!.id) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
      
      // Create audit log
      await storage.createAuditLog({
        adminId: req.user!.id,
        action: "api_key_deleted",
        details: { id: keyId, name: key.name },
        ipAddress: req.ip,
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Error deleting API key" });
    }
  });

  return httpServer;
}
