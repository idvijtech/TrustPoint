import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, date } from "drizzle-orm/pg-core";
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

// Media module tables

// Media Events (like company events, training sessions, etc.)
export const mediaEvents = pgTable("media_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  eventDate: date("event_date").notNull(),
  department: text("department"),
  tags: text("tags").array(),
  isPublic: boolean("is_public").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => admins.id),
});

// Media Files uploaded to the system
export const mediaFiles = pgTable("media_files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // in bytes
  path: text("path").notNull(), // local path or S3 key
  storageType: text("storage_type").notNull().default("local"), // local or s3
  eventId: integer("event_id").references(() => mediaEvents.id),
  visibility: text("visibility").notNull().default("private"), // public, private, group
  password: text("password"), // optional password for protected files
  expiryDate: timestamp("expiry_date"), // for time-limited access
  views: integer("views").default(0).notNull(),
  downloads: integer("downloads").default(0).notNull(),
  metadata: jsonb("metadata"), // additional file metadata
  watermarkEnabled: boolean("watermark_enabled").default(false).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  uploadedBy: integer("uploaded_by").references(() => admins.id),
});

// Sharing permissions for user groups
export const mediaGroups = pgTable("media_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => admins.id),
});

// Members of media groups
export const mediaGroupMembers = pgTable("media_group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => mediaGroups.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").default("member").notNull(), // member, moderator
  addedAt: timestamp("added_at").defaultNow().notNull(),
  addedBy: integer("added_by").references(() => admins.id),
});

// Access permissions for files and groups
export const mediaPermissions = pgTable("media_permissions", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => mediaFiles.id).notNull(),
  groupId: integer("group_id").references(() => mediaGroups.id),
  userId: integer("user_id").references(() => users.id),
  canView: boolean("can_view").default(true).notNull(),
  canDownload: boolean("can_download").default(false).notNull(),
  canShare: boolean("can_share").default(false).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  grantedBy: integer("granted_by").references(() => admins.id).notNull(),
});

// Access links for sharing
export const mediaShareLinks = pgTable("media_share_links", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => mediaFiles.id).notNull(),
  token: text("token").notNull().unique(),
  password: text("password"),
  expiryDate: timestamp("expiry_date"),
  maxViews: integer("max_views"),
  views: integer("views").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => admins.id).notNull(),
});

// Activity logs for media module
export const mediaActivityLogs = pgTable("media_activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  adminId: integer("admin_id").references(() => admins.id),
  fileId: integer("file_id").references(() => mediaFiles.id),
  eventId: integer("event_id").references(() => mediaEvents.id),
  action: text("action").notNull(), // view, download, share, delete, etc.
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  details: jsonb("details"),
});

// Define relations for media tables
export const mediaEventsRelations = relations(mediaEvents, ({ one, many }) => ({
  createdByAdmin: one(admins, {
    fields: [mediaEvents.createdBy],
    references: [admins.id],
  }),
  files: many(mediaFiles),
}));

export const mediaFilesRelations = relations(mediaFiles, ({ one, many }) => ({
  event: one(mediaEvents, {
    fields: [mediaFiles.eventId],
    references: [mediaEvents.id],
  }),
  uploadedByAdmin: one(admins, {
    fields: [mediaFiles.uploadedBy],
    references: [admins.id],
  }),
  permissions: many(mediaPermissions),
  shareLinks: many(mediaShareLinks),
}));

export const mediaGroupsRelations = relations(mediaGroups, ({ one, many }) => ({
  createdByAdmin: one(admins, {
    fields: [mediaGroups.createdBy],
    references: [admins.id],
  }),
  members: many(mediaGroupMembers),
  permissions: many(mediaPermissions),
}));

export const mediaGroupMembersRelations = relations(mediaGroupMembers, ({ one }) => ({
  group: one(mediaGroups, {
    fields: [mediaGroupMembers.groupId],
    references: [mediaGroups.id],
  }),
  user: one(users, {
    fields: [mediaGroupMembers.userId],
    references: [users.id],
  }),
  addedByAdmin: one(admins, {
    fields: [mediaGroupMembers.addedBy],
    references: [admins.id],
  }),
}));

export const mediaPermissionsRelations = relations(mediaPermissions, ({ one }) => ({
  file: one(mediaFiles, {
    fields: [mediaPermissions.fileId],
    references: [mediaFiles.id],
  }),
  group: one(mediaGroups, {
    fields: [mediaPermissions.groupId],
    references: [mediaGroups.id],
  }),
  user: one(users, {
    fields: [mediaPermissions.userId],
    references: [users.id],
  }),
  grantedByAdmin: one(admins, {
    fields: [mediaPermissions.grantedBy],
    references: [admins.id],
  }),
}));

export const mediaShareLinksRelations = relations(mediaShareLinks, ({ one }) => ({
  file: one(mediaFiles, {
    fields: [mediaShareLinks.fileId],
    references: [mediaFiles.id],
  }),
  createdByAdmin: one(admins, {
    fields: [mediaShareLinks.createdBy],
    references: [admins.id],
  }),
}));

export const mediaActivityLogsRelations = relations(mediaActivityLogs, ({ one }) => ({
  user: one(users, {
    fields: [mediaActivityLogs.userId],
    references: [users.id],
  }),
  admin: one(admins, {
    fields: [mediaActivityLogs.adminId],
    references: [admins.id],
  }),
  file: one(mediaFiles, {
    fields: [mediaActivityLogs.fileId],
    references: [mediaFiles.id],
  }),
  event: one(mediaEvents, {
    fields: [mediaActivityLogs.eventId],
    references: [mediaEvents.id],
  }),
}));

// Validation schemas for media
export const mediaEventInsertSchema = createInsertSchema(mediaEvents, {
  name: (schema) => schema.min(2, "Event name must be at least 2 characters"),
  eventDate: (schema) => schema,
});

export const mediaFileInsertSchema = createInsertSchema(mediaFiles, {
  filename: (schema) => schema.min(1, "Filename is required"),
  originalFilename: (schema) => schema.min(1, "Original filename is required"),
  mimeType: (schema) => schema.min(1, "MIME type is required"),
  path: (schema) => schema.min(1, "Path is required"),
});

export const mediaGroupInsertSchema = createInsertSchema(mediaGroups, {
  name: (schema) => schema.min(2, "Group name must be at least 2 characters"),
});

export const mediaShareLinkInsertSchema = createInsertSchema(mediaShareLinks, {
  token: (schema) => schema.min(10, "Token must be at least 10 characters"),
});

export type MediaEvent = typeof mediaEvents.$inferSelect;
export type MediaFile = typeof mediaFiles.$inferSelect;
export type MediaGroup = typeof mediaGroups.$inferSelect;
export type MediaGroupMember = typeof mediaGroupMembers.$inferSelect;
export type MediaPermission = typeof mediaPermissions.$inferSelect;
export type MediaShareLink = typeof mediaShareLinks.$inferSelect;
export type MediaActivityLog = typeof mediaActivityLogs.$inferSelect;

export type MediaEventInsert = z.infer<typeof mediaEventInsertSchema>;
export type MediaFileInsert = z.infer<typeof mediaFileInsertSchema>;
export type MediaGroupInsert = z.infer<typeof mediaGroupInsertSchema>;
export type MediaShareLinkInsert = z.infer<typeof mediaShareLinkInsertSchema>;
