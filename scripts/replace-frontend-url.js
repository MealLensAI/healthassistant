#!/usr/bin/env node

/**
 * Script to replace __FRONTEND_URL__ placeholder in HTML files with actual FRONTEND_URL
 * Usage: node scripts/replace-frontend-url.js
 */

const fs = require('fs');
const path = require('path');

// Get FRONTEND_URL from environment or use localhost as fallback
const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || 'http://localhost:5173';

// Files to process
const filesToProcess = [
  'frontend/index.html',
  'backend/frontend/index.html'
];

console.log(`Replacing __FRONTEND_URL__ with: ${frontendUrl}`);

filesToProcess.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Replace all instances of __FRONTEND_URL__ with actual URL
      content = content.replace(/__FRONTEND_URL__/g, frontendUrl);
      
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${filePath}`);
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('✅ Frontend URL replacement complete!');