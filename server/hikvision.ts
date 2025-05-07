import axios, { AxiosRequestConfig } from "axios";
import crypto from "crypto";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { devices, accessEvents } from "@shared/schema";
import type { Device } from "@shared/schema";

// Hikvision API integration
export class HikvisionAPI {
  private baseUrl: string;
  private username: string;
  private password: string;
  private device: Device;

  constructor(device: Device) {
    this.device = device;
    this.baseUrl = `http://${device.ip}:${device.port}`;
    this.username = device.username;
    this.password = device.password;
  }

  /**
   * Generate a digest authentication header
   */
  private async generateDigestAuth(method: string, uri: string) {
    try {
      // First request to get the nonce and other digest parameters
      const response = await axios.get(`${this.baseUrl}${uri}`, {
        validateStatus: (status) => status === 401, // We expect a 401 with WWW-Authenticate header
      });

      if (!response.headers["www-authenticate"]) {
        throw new Error("Digest authentication failed: WWW-Authenticate header not found");
      }

      const authHeader = response.headers["www-authenticate"];
      const realm = authHeader.match(/realm="([^"]+)"/i)?.[1] || "";
      const nonce = authHeader.match(/nonce="([^"]+)"/i)?.[1] || "";
      const qop = authHeader.match(/qop="([^"]+)"/i)?.[1] || "";
      const opaque = authHeader.match(/opaque="([^"]+)"/i)?.[1] || "";

      if (!nonce) {
        throw new Error("Digest authentication failed: nonce not found");
      }

      // Generate a client nonce
      const cnonce = crypto.randomBytes(16).toString("hex");
      const nc = "00000001";

      // Generate the digest response
      const ha1 = crypto
        .createHash("md5")
        .update(`${this.username}:${realm}:${this.password}`)
        .digest("hex");

      const ha2 = crypto.createHash("md5").update(`${method}:${uri}`).digest("hex");

      let digestResponse;
      if (qop) {
        digestResponse = crypto
          .createHash("md5")
          .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
          .digest("hex");
      } else {
        digestResponse = crypto.createHash("md5").update(`${ha1}:${nonce}:${ha2}`).digest("hex");
      }

      // Build the full Authorization header
      let digestHeader = `Digest username="${this.username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${digestResponse}"`;

      if (qop) {
        digestHeader += `, qop=${qop}, nc=${nc}, cnonce="${cnonce}"`;
      }

      if (opaque) {
        digestHeader += `, opaque="${opaque}"`;
      }

      return digestHeader;
    } catch (error) {
      console.error("Error generating digest auth:", error);
      throw error;
    }
  }

  /**
   * Make an authenticated request to the Hikvision API
   */
  private async request<T>(method: string, uri: string, data?: any): Promise<T> {
    try {
      const authHeader = await this.generateDigestAuth(method, uri);

      const config: AxiosRequestConfig = {
        method,
        url: `${this.baseUrl}${uri}`,
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/xml",
        },
        data,
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`Hikvision API error (${method} ${uri}):`, error);
      throw error;
    }
  }

  /**
   * Check device connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const uri = "/ISAPI/System/deviceInfo";
      await this.request("GET", uri);
      
      // Update device status in the database
      await db
        .update(devices)
        .set({
          status: "online",
          lastConnection: new Date(),
        })
        .where(eq(devices.id, this.device.id));
      
      return true;
    } catch (error) {
      // Update device status in the database
      await db
        .update(devices)
        .set({
          status: "offline",
          lastConnection: new Date(),
        })
        .where(eq(devices.id, this.device.id));
      
      return false;
    }
  }

  /**
   * Get device information
   */
  async getDeviceInfo() {
    const uri = "/ISAPI/System/deviceInfo";
    return this.request<any>("GET", uri);
  }

  /**
   * Register a user with biometric data
   */
  async registerUser(
    employeeId: string,
    name: string,
    faceImage?: Buffer,
    fingerprint?: Buffer
  ) {
    try {
      // Create user profile
      const userUri = "/ISAPI/AccessControl/UserInfo/Record";
      const userData = `
        <UserInfo>
          <employeeNo>${employeeId}</employeeNo>
          <name>${name}</name>
          <userType>normal</userType>
          <Valid>
            <enable>true</enable>
            <beginTime>2022-01-01T00:00:00</beginTime>
            <endTime>2030-01-01T00:00:00</endTime>
          </Valid>
          <doorRight>1</doorRight>
          <RightPlan>
            <doorNo>1</doorNo>
            <planTemplateNo>1</planTemplateNo>
          </RightPlan>
        </UserInfo>
      `;

      await this.request("POST", userUri, userData);

      // If face image provided, register face
      if (faceImage) {
        const faceUri = `/ISAPI/Intelligent/FaceContrastServer/FaceDataRecord?employeeNo=${employeeId}`;
        await this.request("PUT", faceUri, faceImage);
      }

      // If fingerprint provided, register fingerprint
      if (fingerprint) {
        const fingerprintUri = `/ISAPI/AccessControl/FingerPrintUpload?employeeNo=${employeeId}&fingerPrintID=1`;
        await this.request("PUT", fingerprintUri, fingerprint);
      }

      return true;
    } catch (error) {
      console.error("Error registering user on device:", error);
      throw error;
    }
  }

  /**
   * Get recent access events
   */
  async getAccessEvents(startTime: Date, endTime: Date) {
    const uri = "/ISAPI/AccessControl/AcsEvent?format=json";
    const data = `
      <AcsEventCond>
        <searchID>1</searchID>
        <searchResultPosition>0</searchResultPosition>
        <maxResults>50</maxResults>
        <major>0</major>
        <minor>0</minor>
        <startTime>${startTime.toISOString()}</startTime>
        <endTime>${endTime.toISOString()}</endTime>
      </AcsEventCond>
    `;

    const result = await this.request<any>("POST", uri, data);
    
    // Parse and store events in the database
    if (result.AcsEvent && result.AcsEvent.InfoList) {
      for (const event of result.AcsEvent.InfoList) {
        await db.insert(accessEvents).values({
          deviceId: this.device.id,
          userId: event.employeeNoString ? parseInt(event.employeeNoString) : undefined,
          eventType: event.eventType === "1" ? "access_granted" : "access_denied",
          timestamp: new Date(event.time),
          details: event,
        });
      }
    }
    
    return result;
  }

  /**
   * Get supported capabilities
   */
  async getCapabilities() {
    const uri = "/ISAPI/System/capabilities";
    return this.request<any>("GET", uri);
  }
}

/**
 * Get a Hikvision API client for a device
 */
export async function getHikvisionClient(deviceId: number): Promise<HikvisionAPI | null> {
  try {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, deviceId))
      .limit(1);

    if (!device) {
      return null;
    }

    return new HikvisionAPI(device);
  } catch (error) {
    console.error("Error getting Hikvision client:", error);
    return null;
  }
}

/**
 * Register a device with basic connectivity check
 */
export async function registerDevice(deviceData: {
  name: string;
  type: string;
  ip: string;
  port: number;
  username: string;
  password: string;
  location?: string;
  createdBy: number;
}): Promise<Device> {
  try {
    // Create device in the database
    const [device] = await db
      .insert(devices)
      .values({
        ...deviceData,
        status: "unknown",
      })
      .returning();

    // Create a client and check connectivity
    const client = new HikvisionAPI(device);
    try {
      await client.checkConnectivity();
    } catch (error) {
      console.error("Error checking device connectivity:", error);
      // The status will remain 'unknown' if not reachable
    }

    return device;
  } catch (error) {
    console.error("Error registering device:", error);
    throw error;
  }
}
