import { db } from "../db";
import { admins, AdminRole } from "../shared/schema";
import { getDefaultPermissionsByRole } from "../server/permissions";
import { eq } from "drizzle-orm";

async function migrateAdmins() {
  console.log("Starting admin migration...");
  
  try {
    // Get all existing admins
    const existingAdmins = await db.select().from(admins);
    
    if (existingAdmins.length === 0) {
      console.log("No admins found to migrate");
      return;
    }
    
    console.log(`Found ${existingAdmins.length} admins to migrate`);
    
    // Update each admin with default permissions based on their current role
    for (const admin of existingAdmins) {
      const role = admin.role as AdminRole || AdminRole.VIEWER;
      const permissions = getDefaultPermissionsByRole(role);
      
      // Set default values for new fields
      await db
        .update(admins)
        .set({
          permissions,
          active: true,
          role: role // Ensure role is one of the valid enum values
        })
        .where(eq(admins.id, admin.id));
      
      console.log(`Migrated admin ${admin.username} (ID: ${admin.id}) with role ${role}`);
    }
    
    console.log("Admin migration completed successfully!");
  } catch (error) {
    console.error("Error during admin migration:", error);
  }
}

migrateAdmins()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });