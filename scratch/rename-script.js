// scratch/rename-script.js
// Node.js script to perform text search-and-replaces for the Tracely rename project.
// To run: node scratch/rename-script.js

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

const mobileScreens = [
  'apps/mobile/src/screens/auth/ProfileSetupScreen.js',
  'apps/mobile/src/screens/auth/OTPVerifyScreen.js',
  'apps/mobile/src/screens/safety/SafetyHomeScreen.js',
  'apps/mobile/src/screens/safety/SOSActiveScreen.js',
  'apps/mobile/src/screens/safety/HazardReportScreen.js',
  'apps/mobile/src/screens/safety/CompartmentAlertScreen.js',
  'apps/mobile/src/screens/complaints/NewComplaintScreen.js',
  'apps/mobile/src/screens/station/StationHomeScreen.js',
  'apps/mobile/src/screens/tatkal/TatkalHomeScreen.js',
  'apps/mobile/src/screens/tatkal/PreFillFormScreen.js',
  'apps/mobile/src/screens/tatkal/CountdownScreen.js'
];

const configFiles = [
  'package.json',
  'install-all.js',
  'services/api/src/index.js',
  'services/api/package.json',
  'services/api/package-lock.json',
  'scripts/seed.js',
  'scripts/seed-data.js'
];

console.log('=== Starting Renaming to Tracely ===\n');

// 1. Update Mobile Screens Context & Hooks
mobileScreens.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping: ${relPath} (not found)`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  content = content.replace(/RailSaathiContext/g, 'TracelyContext');
  content = content.replace(/useRailSaathi/g, 'useTracely');
  content = content.replace(/RailSaathiProvider/g, 'TracelyProvider');
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated mobile screen: ${relPath}`);
});

// 2. Update Configuration, Workspace packages, Seed scripts, API logging
configFiles.forEach((relPath) => {
  const fullPath = path.join(rootDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping: ${relPath} (not found)`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // General text renames
  content = content.replace(/RailSaathi/g, 'Tracely');
  content = content.replace(/railsaathi/g, 'tracely');
  
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated config file: ${relPath}`);
});

console.log('\n=== Renaming Completed Successfully! ===');
