// scripts/generate-icons.js
const fs = require('fs');
const path = require('path');

// Canvas sẽ được polyfill bằng sharp hoặc dùng pure PNG generation
// Ở đây dùng cách đơn giản: tạo PNG header + IDAT chunk thủ công
// Hoặc dùng sharp nếu có trong dependencies

// Fallback: tạo placeholder PNG đơn giản (solid color square)
function createMinimalPNG(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const width = size;
  const height = size;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk (compressed solid color image)
  // Tạo raw image data (filter byte + RGB for each row)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter type none
    for (let x = 0; x < width; x++) {
      // Gradient từ #3b82f6 (top-left) to #1d4ed8 (bottom-right)
      const t = (x + y) / (width + height);
      rawData.push(Math.round(59 + (29 - 59) * t));  // R
      rawData.push(Math.round(130 + (78 - 130) * t)); // G
      rawData.push(Math.round(246 + (216 - 246) * t)); // B
    }
  }

  const zlib = require('zlib');
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(data) {
  let crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c >>> 0;
  }
  for (let i = 0; i < data.length; i++) {
    crc = (table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createMinimalPNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createMinimalPNG(512));

console.log('Icons generated: icon-192.png, icon-512.png');
