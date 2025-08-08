const fs = require('fs');
const dest = 'dist/robloxsecurity';
const src = 'src/robloxsecurity';

if (!fs.existsSync(dest)) {
  fs.copyFileSync(src, dest);
  console.log('robloxsecurity copied to dist.');
} else {
  console.log('robloxsecurity already exists in dist, not overwritten.');
}