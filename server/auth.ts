import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { expressjwt } from "express-jwt";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { storage } from "./storage";
import { adminInsertSchema, Admin } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends Admin {}
  }
}

const scryptAsync = promisify(scrypt);

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = "8h";

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const admin = await storage.getAdminByUsername(username);
        if (!admin || !(await comparePasswords(password, admin.password))) {
          return done(null, false);
        } else {
          return done(null, admin);
        }
      } catch (error) {
        return done(error);
      }
    })
  );

  passport.serializeUser((admin, done) => done(null, admin.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const admin = await storage.getAdmin(id);
      done(null, admin);
    } catch (error) {
      done(error);
    }
  });

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ message: "Not authenticated" });
  };

  // JWT middleware
  const jwtMiddleware = expressjwt({
    secret: JWT_SECRET,
    algorithms: ["HS256"],
    getToken: (req) => {
      if (req.headers.authorization && req.headers.authorization.split(" ")[0] === "Bearer") {
        return req.headers.authorization.split(" ")[1];
      }
      return null;
    },
  }).unless({
    path: ["/api/login", "/api/register"],
  });

  // API auth middleware
  const apiAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api/")) {
      // For API endpoints, first try JWT auth
      jwtMiddleware(req, res, (err) => {
        if (err) {
          // If JWT fails, fallback to session auth
          if (req.isAuthenticated()) {
            return next();
          }
          return res.status(401).json({ message: "Authentication required" });
        }
        next();
      });
    } else {
      // For non-API endpoints, use session auth
      next();
    }
  };

  app.use(apiAuthMiddleware);

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedData = adminInsertSchema.parse(req.body);
      
      const existingAdmin = await storage.getAdminByUsername(validatedData.username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const admin = await storage.createAdmin({
        ...validatedData,
        password: await hashPassword(validatedData.password),
      });

      // Create audit log
      await storage.createAuditLog({
        adminId: admin.id,
        action: "admin_created",
        details: { username: admin.username },
        ipAddress: req.ip,
      });

      // Auto login after registration
      req.login(admin, (err) => {
        if (err) return next(err);
        
        // Generate JWT token
        const token = jwt.sign(
          { id: admin.id, username: admin.username },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Exclude password from response
        const { password, ...adminWithoutPassword } = admin;
        
        res.status(201).json({
          admin: adminWithoutPassword,
          token,
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating admin:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", async (err: Error, admin: Admin) => {
      if (err) return next(err);
      if (!admin) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      req.login(admin, async (err) => {
        if (err) return next(err);
        
        // Create audit log
        await storage.createAuditLog({
          adminId: admin.id,
          action: "admin_login",
          details: { username: admin.username },
          ipAddress: req.ip,
        });
        
        // Generate JWT token
        const token = jwt.sign(
          { id: admin.id, username: admin.username },
          JWT_SECRET,
          { expiresIn: JWT_EXPIRES_IN }
        );
        
        // Exclude password from response
        const { password, ...adminWithoutPassword } = admin;
        
        res.status(200).json({
          admin: adminWithoutPassword,
          token,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", isAuthenticated, async (req, res, next) => {
    try {
      if (req.user) {
        // Create audit log
        await storage.createAuditLog({
          adminId: req.user.id,
          action: "admin_logout",
          details: { username: req.user.username },
          ipAddress: req.ip,
        });
      }
      
      req.logout((err) => {
        if (err) return next(err);
        res.status(200).json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error('Error during logout:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/admin", isAuthenticated, (req, res) => {
    // Exclude password from response
    const { password, ...adminWithoutPassword } = req.user as Admin;
    res.json(adminWithoutPassword);
  });

  // Helper functions
  return {
    isAuthenticated,
    hashPassword,
    comparePasswords,
  };
}
