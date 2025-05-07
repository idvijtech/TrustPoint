import { db } from "./index";
import * as schema from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  try {
    console.log("Starting database seeding...");
    
    // Check if admin exists
    const existingAdmin = await db.query.admins.findFirst({
      where: (admins, { eq }) => eq(admins.username, "admin"),
    });
    
    if (!existingAdmin) {
      console.log("Creating default admin account...");
      const hashedPassword = await hashPassword("SecureAccessAdmin123");
      
      // Get default permissions for super admin
      const superAdminPermissions = {
        // User management
        manageAdmins: true,
        manageUsers: true,
        
        // Device management
        manageDevices: true,
        viewDeviceLogs: true,
        
        // Events and media
        createEvents: true,
        editEvents: true,
        deleteEvents: true,
        uploadMedia: true,
        editMedia: true,
        deleteMedia: true,
        
        // Access control
        manageGroups: true,
        managePermissions: true,
        
        // System settings
        manageSettings: true,
        viewAuditLogs: true,
        manageApiKeys: true,
      };
      
      await db.insert(schema.admins).values({
        username: "admin",
        password: hashedPassword,
        fullName: "System Administrator",
        email: "admin@secureaccess.com",
        role: schema.AdminRole.SUPER_ADMIN,
        permissions: superAdminPermissions,
        active: true,
      });
      
      console.log("Default admin created: admin / SecureAccessAdmin123");
    } else {
      console.log("Admin account already exists, skipping creation");
    }
    
    // Check if devices exist
    const existingDevices = await db.query.devices.findMany({
      limit: 1,
    });
    
    if (existingDevices.length === 0) {
      console.log("Adding sample devices...");
      
      const admin = await db.query.admins.findFirst();
      if (!admin) {
        throw new Error("Admin not found, cannot create sample devices");
      }
      
      const sampleDevices = [
        {
          name: "Main Entrance Camera",
          type: "Hikvision DS-2CD2385G1",
          ip: "192.168.1.100",
          port: 80,
          username: "admin",
          password: "admin123",
          location: "Main Building Entrance",
          status: "online",
          lastConnection: new Date(),
          createdBy: admin.id,
        },
        {
          name: "Server Room Access",
          type: "Hikvision DS-K1T501SF",
          ip: "192.168.1.101",
          port: 80,
          username: "admin",
          password: "admin123",
          location: "IT Department, Server Room",
          status: "online",
          lastConnection: new Date(),
          createdBy: admin.id,
        },
        {
          name: "Parking Lot Camera",
          type: "Hikvision DS-2CD2047G1",
          ip: "192.168.1.102",
          port: 80,
          username: "admin",
          password: "admin123",
          location: "North Parking Lot",
          status: "maintenance",
          lastConnection: new Date(Date.now() - 86400000), // 1 day ago
          createdBy: admin.id,
        },
        {
          name: "Biometric Scanner",
          type: "Hikvision DS-K1T804MF",
          ip: "192.168.1.103",
          port: 80,
          username: "admin",
          password: "admin123",
          location: "HR Department Entrance",
          status: "offline",
          lastConnection: new Date(Date.now() - 259200000), // 3 days ago
          createdBy: admin.id,
        },
      ];
      
      for (const device of sampleDevices) {
        await db.insert(schema.devices).values(device);
      }
      
      console.log("Sample devices added successfully");
    } else {
      console.log("Devices already exist, skipping sample device creation");
    }
    
    // Check if users exist
    const existingUsers = await db.query.users.findMany({
      limit: 1,
    });
    
    if (existingUsers.length === 0) {
      console.log("Adding sample users...");
      
      const admin = await db.query.admins.findFirst();
      if (!admin) {
        throw new Error("Admin not found, cannot create sample users");
      }
      
      const sampleUsers = [
        {
          employeeId: "EMP001",
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@example.com",
          department: "IT",
          position: "System Engineer",
          biometricId: "BIO-A7F9B2C1",
          active: true,
          createdBy: admin.id,
        },
        {
          employeeId: "EMP002",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@example.com",
          department: "HR",
          position: "HR Manager",
          biometricId: "BIO-D8E2F5A3",
          active: true,
          createdBy: admin.id,
        },
        {
          employeeId: "EMP003",
          firstName: "Michael",
          lastName: "Johnson",
          email: "michael.johnson@example.com",
          department: "Finance",
          position: "Financial Analyst",
          biometricId: null,
          active: true,
          createdBy: admin.id,
        },
        {
          employeeId: "EMP004",
          firstName: "Sarah",
          lastName: "Williams",
          email: "sarah.williams@example.com",
          department: "Operations",
          position: "Operations Manager",
          biometricId: "BIO-9C4D7E1B",
          active: false,
          createdBy: admin.id,
        },
      ];
      
      for (const user of sampleUsers) {
        await db.insert(schema.users).values(user);
      }
      
      console.log("Sample users added successfully");
    } else {
      console.log("Users already exist, skipping sample user creation");
    }
    
    // Add sample access events if none exist
    const existingEvents = await db.query.accessEvents.findMany({
      limit: 1,
    });
    
    if (existingEvents.length === 0) {
      console.log("Adding sample access events...");
      
      const users = await db.query.users.findMany();
      const devices = await db.query.devices.findMany();
      
      if (users.length === 0 || devices.length === 0) {
        throw new Error("Users or devices not found, cannot create sample events");
      }
      
      const sampleEvents = [
        {
          userId: users[0].id,
          deviceId: devices[0].id,
          eventType: "access_granted",
          timestamp: new Date(Date.now() - 600000), // 10 minutes ago
          details: { method: "fingerprint" },
        },
        {
          userId: users[1].id,
          deviceId: devices[1].id,
          eventType: "access_granted",
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          details: { method: "card" },
        },
        {
          userId: null,
          deviceId: devices[0].id,
          eventType: "access_denied",
          timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
          details: { reason: "unrecognized" },
        },
        {
          userId: users[2].id,
          deviceId: devices[1].id,
          eventType: "access_denied",
          timestamp: new Date(Date.now() - 7200000), // 2 hours ago
          details: { reason: "unauthorized_time" },
        },
      ];
      
      for (const event of sampleEvents) {
        await db.insert(schema.accessEvents).values(event);
      }
      
      console.log("Sample access events added successfully");
    } else {
      console.log("Access events already exist, skipping sample event creation");
    }
    
    // Add API key if none exist
    const existingApiKeys = await db.query.apiKeys.findMany({
      limit: 1,
    });
    
    if (existingApiKeys.length === 0) {
      console.log("Adding sample API key...");
      
      const admin = await db.query.admins.findFirst();
      if (!admin) {
        throw new Error("Admin not found, cannot create sample API key");
      }
      
      await db.insert(schema.apiKeys).values({
        name: "Primary API Key",
        key: randomBytes(32).toString("hex"),
        active: true,
        lastUsed: new Date(Date.now() - 7200000), // 2 hours ago
        createdBy: admin.id,
      });
      
      console.log("Sample API key added successfully");
    } else {
      console.log("API keys already exist, skipping sample API key creation");
    }
    
    console.log("Database seeding completed successfully");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
