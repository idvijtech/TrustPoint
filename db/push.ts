import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index';

// Push schema changes programmatically
async function pushSchema() {
  console.log('Pushing schema changes to database...');
  
  try {
    // Create the tables
    await db.execute(`
      -- Media events
      CREATE TABLE IF NOT EXISTS media_events (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        event_date TIMESTAMP NOT NULL,
        location TEXT,
        department TEXT,
        is_public BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER REFERENCES admins(id) NOT NULL
      );

      -- Media files
      CREATE TABLE IF NOT EXISTS media_files (
        id SERIAL PRIMARY KEY,
        storage_key TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size BIGINT NOT NULL,
        storage_type TEXT DEFAULT 'local' NOT NULL,
        event_id INTEGER REFERENCES media_events(id),
        visibility TEXT DEFAULT 'private' NOT NULL,
        watermark_enabled BOOLEAN DEFAULT false NOT NULL,
        password TEXT,
        expiry_date TIMESTAMP,
        views INTEGER DEFAULT 0 NOT NULL,
        downloads INTEGER DEFAULT 0 NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
        uploaded_by INTEGER REFERENCES admins(id) NOT NULL,
        metadata JSONB DEFAULT '{}'
      );

      -- Media groups
      CREATE TABLE IF NOT EXISTS media_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER REFERENCES admins(id) NOT NULL
      );

      -- Media group members
      CREATE TABLE IF NOT EXISTS media_group_members (
        id SERIAL PRIMARY KEY,
        group_id INTEGER REFERENCES media_groups(id) NOT NULL,
        admin_id INTEGER REFERENCES admins(id) NOT NULL,
        role TEXT DEFAULT 'member' NOT NULL,
        added_at TIMESTAMP DEFAULT NOW() NOT NULL,
        added_by INTEGER REFERENCES admins(id)
      );

      -- Access permissions for files and groups
      CREATE TABLE IF NOT EXISTS media_permissions (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES media_files(id) NOT NULL,
        group_id INTEGER REFERENCES media_groups(id),
        admin_id INTEGER REFERENCES admins(id),
        can_view BOOLEAN DEFAULT true NOT NULL,
        can_download BOOLEAN DEFAULT false NOT NULL,
        can_share BOOLEAN DEFAULT false NOT NULL,
        granted_at TIMESTAMP DEFAULT NOW() NOT NULL,
        granted_by INTEGER REFERENCES admins(id) NOT NULL
      );

      -- Access links for sharing
      CREATE TABLE IF NOT EXISTS media_share_links (
        id SERIAL PRIMARY KEY,
        file_id INTEGER REFERENCES media_files(id) NOT NULL,
        token TEXT NOT NULL UNIQUE,
        password TEXT,
        expiry_date TIMESTAMP,
        max_views INTEGER,
        views INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER REFERENCES admins(id) NOT NULL
      );

      -- Activity logs for media module
      CREATE TABLE IF NOT EXISTS media_activity_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        admin_id INTEGER REFERENCES admins(id),
        file_id INTEGER REFERENCES media_files(id),
        event_id INTEGER REFERENCES media_events(id),
        action TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        details JSONB
      );
    `);
    
    console.log('Schema changes pushed successfully!');
  } catch (error) {
    console.error('Error pushing schema changes:', error);
  }
}

pushSchema().catch(console.error);