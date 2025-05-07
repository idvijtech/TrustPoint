import { db } from "../db";
import { mediaEvents } from "../shared/schema";
import { sql } from "drizzle-orm";

async function seedEvents() {
  console.log("🌱 Seeding additional events...");
  
  const departments = [
    "Marketing", 
    "Finance", 
    "Human Resources", 
    "Information Technology", 
    "Research and Development", 
    "Operations", 
    "Sales", 
    "Customer Service",
    "Quality Assurance",
    "Production"
  ];
  
  const eventTypes = [
    "Conference", 
    "Team Building", 
    "Training", 
    "Workshop", 
    "Meeting", 
    "Celebration", 
    "Product Launch", 
    "Seminar",
    "Awards Ceremony",
    "Annual Party"
  ];
  
  const tags = [
    "important", 
    "company-wide", 
    "department", 
    "external", 
    "mandatory", 
    "optional", 
    "recurring", 
    "special",
    "high-priority",
    "quarterly"
  ];
  
  // Generate event data
  const eventData = [];
  
  for (let i = 0; i < 50; i++) {
    const year = 2023 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    
    const department = departments[Math.floor(Math.random() * departments.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    // Generate 1-3 random tags
    const numTags = Math.floor(Math.random() * 3) + 1;
    const eventTags = [];
    
    for (let j = 0; j < numTags; j++) {
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      if (!eventTags.includes(randomTag)) {
        eventTags.push(randomTag);
      }
    }
    
    const isPublic = Math.random() > 0.3; // 70% chance of being public
    
    eventData.push({
      name: `${department} ${eventType} ${month}/${year}`,
      description: `${department} department ${eventType.toLowerCase()} for ${month}/${year}`,
      eventDate: new Date(year, month - 1, day).toISOString(),
      department,
      tags: eventTags, // tags should be an array, not a string
      isPublic,
      createdBy: 1, // Admin user ID
    });
  }
  
  // Insert events in chunks to avoid overwhelming the database
  const chunkSize = 10;
  
  for (let i = 0; i < eventData.length; i += chunkSize) {
    const chunk = eventData.slice(i, i + chunkSize);
    await db.insert(mediaEvents).values(chunk);
    console.log(`Inserted events ${i + 1} to ${Math.min(i + chunkSize, eventData.length)}`);
  }
  
  console.log("✅ Events seeded successfully!");
  
  // Get count of events
  const eventCount = await db.select({ count: sql`count(*)` }).from(mediaEvents);
  console.log(`Total events in database: ${eventCount[0].count}`);
}

seedEvents()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error seeding events:", error);
    process.exit(1);
  });