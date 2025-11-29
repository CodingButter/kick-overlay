#!/usr/bin/env bun
/**
 * Database Setup Script
 *
 * Run this script to initialize the database and seed default data:
 *   bun run db:setup
 *
 * This will:
 * 1. Create the data/ directory if it doesn't exist
 * 2. Initialize SQLite database at data/kick-overlay.db
 * 3. Run schema.sql to create all tables
 * 4. Seed default powerups, overlay settings, tips, and goals
 */

import {
  seedDefaultPowerups,
  seedDefaultOverlaySettings,
  seedDefaultTips,
  seedDefaultGoals,
} from './index';

console.log('🔧 Setting up database...\n');

// The db module automatically initializes the database and runs schema on import
// Now run all seeding functions

console.log('🌱 Seeding default data...');
seedDefaultPowerups();
seedDefaultOverlaySettings();
seedDefaultTips();
seedDefaultGoals();

console.log('\n✅ Database setup complete!');
console.log('   You can now run: bun dev');
