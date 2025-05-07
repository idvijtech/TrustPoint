import { db } from "@db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  admins,
  devices,
  users,
  accessEvents,
  auditLogs,
  apiKeys,
} from "@shared/schema";
import type {
  Admin,
  Device,
  User,
  AccessEvent,
  AuditLog,
  ApiKey,
  AdminInsert,
  DeviceInsert,
  UserInsert,
} from "@shared/schema";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "@db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // Admin operations
  createAdmin(admin: AdminInsert): Promise<Admin>;
  getAdmin(id: number): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  updateAdmin(id: number, admin: Partial<Admin>): Promise<Admin | undefined>;
  listAdmins(page?: number, limit?: number): Promise<{ admins: Admin[], total: number }>;
  deactivateAdmin(id: number): Promise<boolean>;
  getAdminCount(): Promise<number>;
  
  // Device operations
  createDevice(device: DeviceInsert): Promise<Device>;
  updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined>;
  getDevice(id: number): Promise<Device | undefined>;
  getDeviceByIp(ip: string): Promise<Device | undefined>;
  listDevices(page?: number, limit?: number): Promise<{ devices: Device[], total: number }>;
  
  // User operations
  createUser(user: UserInsert): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmployeeId(employeeId: string): Promise<User | undefined>;
  listUsers(page?: number, limit?: number): Promise<{ users: User[], total: number }>;
  
  // Access event operations
  createAccessEvent(event: Partial<AccessEvent>): Promise<AccessEvent>;
  getRecentAccessEvents(limit?: number): Promise<AccessEvent[]>;
  
  // Audit log operations
  createAuditLog(log: Partial<AuditLog>): Promise<AuditLog>;
  getRecentAuditLogs(limit?: number): Promise<AuditLog[]>;
  
  // API Key operations
  createApiKey(key: Partial<ApiKey>): Promise<ApiKey>;
  getApiKey(id: number): Promise<ApiKey | undefined>;
  getApiKeyByKey(key: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: number): Promise<void>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalDevices: number;
    totalUsers: number;
    securityEvents: number;
  }>;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
      tableName: 'session',
    });
  }

  // Admin operations
  async createAdmin(admin: AdminInsert): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values(admin).returning();
    return newAdmin;
  }

  async getAdmin(id: number): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
    return result[0];
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const result = await db.select().from(admins).where(eq(admins.username, username)).limit(1);
    return result[0];
  }
  
  async updateAdmin(id: number, adminData: Partial<Admin>): Promise<Admin | undefined> {
    const [updatedAdmin] = await db
      .update(admins)
      .set(adminData)
      .where(eq(admins.id, id))
      .returning();
    return updatedAdmin;
  }
  
  async listAdmins(page = 1, limit = 10): Promise<{ admins: Admin[], total: number }> {
    const offset = (page - 1) * limit;
    
    const adminsResult = await db
      .select()
      .from(admins)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(admins.createdAt));
    
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admins);
    
    return { admins: adminsResult, total: count };
  }
  
  async deactivateAdmin(id: number): Promise<boolean> {
    try {
      await db
        .update(admins)
        .set({ active: false })
        .where(eq(admins.id, id));
      return true;
    } catch (error) {
      console.error('Error deactivating admin:', error);
      return false;
    }
  }
  
  async getAdminCount(): Promise<number> {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(admins);
    return count;
  }

  // Device operations
  async createDevice(device: DeviceInsert): Promise<Device> {
    const [newDevice] = await db.insert(devices).values(device).returning();
    return newDevice;
  }

  async updateDevice(id: number, device: Partial<Device>): Promise<Device | undefined> {
    const [updatedDevice] = await db
      .update(devices)
      .set(device)
      .where(eq(devices.id, id))
      .returning();
    return updatedDevice;
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
    return result[0];
  }

  async getDeviceByIp(ip: string): Promise<Device | undefined> {
    const result = await db.select().from(devices).where(eq(devices.ip, ip)).limit(1);
    return result[0];
  }

  async listDevices(page = 1, limit = 10): Promise<{ devices: Device[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const devicesResult = await db
      .select()
      .from(devices)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(devices.createdAt));
    
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(devices);
    
    return { devices: devicesResult, total: count };
  }

  // User operations
  async createUser(user: UserInsert): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmployeeId(employeeId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.employeeId, employeeId)).limit(1);
    return result[0];
  }

  async listUsers(page = 1, limit = 10): Promise<{ users: User[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const usersResult = await db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(users.createdAt));
    
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    return { users: usersResult, total: count };
  }

  // Access event operations
  async createAccessEvent(event: Partial<AccessEvent>): Promise<AccessEvent> {
    const [newEvent] = await db.insert(accessEvents).values(event).returning();
    return newEvent;
  }

  async getRecentAccessEvents(limit = 5): Promise<AccessEvent[]> {
    return db
      .select()
      .from(accessEvents)
      .limit(limit)
      .orderBy(desc(accessEvents.timestamp));
  }

  // Audit log operations
  async createAuditLog(log: Partial<AuditLog>): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getRecentAuditLogs(limit = 5): Promise<AuditLog[]> {
    return db
      .select()
      .from(auditLogs)
      .limit(limit)
      .orderBy(desc(auditLogs.timestamp));
  }

  // API Key operations
  async createApiKey(key: Partial<ApiKey>): Promise<ApiKey> {
    const [newKey] = await db.insert(apiKeys).values(key).returning();
    return newKey;
  }

  async getApiKey(id: number): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    return result[0];
  }

  async getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);
    return result[0];
  }

  async updateApiKeyLastUsed(id: number): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, id));
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalDevices: number;
    totalUsers: number;
    securityEvents: number;
  }> {
    const [deviceCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(devices);
    
    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    
    const [eventCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(accessEvents)
      .where(eq(accessEvents.eventType, 'access_denied'));
    
    return {
      totalDevices: deviceCount.count,
      totalUsers: userCount.count,
      securityEvents: eventCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
