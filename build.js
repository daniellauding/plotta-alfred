const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

// Create the workflow package
const output = fs.createWriteStream('Plotta.alfredworkflow');
const archive = archiver('zip', {
  zlib: { level: 9 }
});

output.on('close', () => {
  console.log(`Workflow created: Plotta.alfredworkflow (${archive.pointer()} bytes)`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add files to the workflow
const files = [
  'info.plist',
  'main.js',
  'create.js',
  'list.js',
  'auth.js',
  'package.json',
  'README.md'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    archive.file(file, { name: file });
  }
});

// Add icon if it exists
if (fs.existsSync('icon.png')) {
  archive.file('icon.png', { name: 'icon.png' });
} else {
  // Create a simple placeholder icon (1x1 PNG)
  const placeholder = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0x5B, 0x63, 0xF8, 0x0F, 0x00, 0x00,
    0x01, 0x01, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
    0xAE, 0x42, 0x60, 0x82
  ]);
  archive.append(placeholder, { name: 'icon.png' });
}

archive.finalize();