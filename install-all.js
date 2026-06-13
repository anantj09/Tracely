// install-all.js
// Cross-platform helper script to install dependencies for the entire Tracely workspace.
// To run: node install-all.js

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const subdirs = [
  '.',
  'apps/dashboard',
  'apps/mobile',
  'services/api'
];

console.log('=== Tracely Dependency Installer ===\n');

subdirs.forEach((dir) => {
  const targetPath = path.resolve(__dirname, dir);
  
  if (!fs.existsSync(path.join(targetPath, 'package.json'))) {
    console.log(`Skipping ${dir} (no package.json found)`);
    return;
  }

  console.log(`--------------------------------------------------`);
  console.log(`Installing dependencies in: ${dir || 'root'}`);
  console.log(`Path: ${targetPath}`);
  console.log(`--------------------------------------------------`);

  try {
    execSync('npm install', {
      cwd: targetPath,
      stdio: 'inherit',
      env: { ...process.env, ADBLOCK: 'true', DISABLE_OPENCOLLECTIVE: 'true' }
    });
    console.log(`\n✓ Success: Dependencies installed in ${dir || 'root'}\n`);
  } catch (err) {
    console.error(`\n❌ Error: Failed to install dependencies in ${dir || 'root'}\n`);
    process.exit(1);
  }
});

console.log('==================================================');
console.log('🎉 All workspace dependencies installed successfully!');
console.log('==================================================');
