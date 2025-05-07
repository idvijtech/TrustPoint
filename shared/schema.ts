import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Admin users who can access the system
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Hikvision devices connected to the system
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  ip: text("ip").notNull(),
  port: integer("port").notNull().default(80),
  username: text("username").notNull(),
  password: text("password").notNull(),
  location: text("location"),
  status: text("status").notNull().default("offline"),
  lastConnection: timestamp("last_connection"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => admins.id),
});

// Users registered in the system for biometric access
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  employeeId: text("employee_id").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  department: text("department"),
  position: text("position"),
  biometricId: text("biometric_id"),
  cardNumber: text("card_number"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => admins.id),
});

// Access events recorded from devices
export const accessEvents = pgTable("access_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  deviceId: integer("device_id").references(() => devices.id),
  eventType: text("event_type").notNull(), // access_granted, access_denied, etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  details: jsonb("details"),
});

// System audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => admins.id),
  action: text("action").notNull(),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

// API keys for external integrations
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  key: text("key").notNull().unique(),
  active: boolean("active").notNull().default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => admins.id),
});

// Define relations
export const devicesRelations = relations(devices, ({ one }) => ({
  createdByAdmin: one(admins, {
    fields: [devices.createdBy],
    references: [admins.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  createdByAdmin: one(admins, {
    fields: [users.createdBy],
    references: [admins.id],
  }),
}));

export const accessEventsRelations = relations(accessEvents, ({ one }) => ({
  user: one(users, {
    fields: [accessEvents.userId],
    references: [users.id],
  }),
  device: one(devices, {
    fields: [accessEvents.deviceId],
    references: [devices.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  admin: one(admins, {
    fields: [auditLogs.adminId],
    references: [admins.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  createdByAdmin: one(admins, {
    fields: [apiKeys.createdBy],
    references: [admins.id],
  }),
}));

// Validation schemas
export const adminInsertSchema = createInsertSchema(admins, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  password: (schema) => schema.min(8, "Password must be at least 8 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  fullName: (schema) => schema.min(2, "Full name must be at least 2 characters"),
});

export const deviceInsertSchema = createInsertSchema(devices, {
  name: (schema) => schema.min(2, "Device name must be at least 2 characters"),
  ip: (schema) => schema.regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, "Must be a valid IP address"),
});

export const userInsertSchema = createInsertSchema(users, {
  employeeId: (schema) => schema.min(2, "Employee ID must be at least 2 characters"),
  firstName: (schema) => schema.min(2, "First name must be at least 2 characters"),
  lastName: (schema) => schema.min(2, "Last name must be at least 2 characters"),
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type AdminInsert = z.infer<typeof adminInsertSchema>;
export type DeviceInsert = z.infer<typeof deviceInsertSchema>;
export type UserInsert = z.infer<typeof userInsertSchema>;
export type Admin = typeof admins.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type User = typeof users.$inferSelect;
export type AccessEvent = typeof accessEvents.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
