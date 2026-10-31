// Build browser icons from the supplied transparent DataMoney logo.
// FFmpeg only crops empty padding and resizes; the original PNG is untouched.
import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync, unlinkSync, rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'blog', 'datamoney-logo-blue.png');
const temporary = mkdtempSync(join(tmpdir(), 'datamoney-icons-'));
const sizes = [16, 32, 48, 64, 128, 256];
const files = sizes.map(size => join(temporary, `icon-${size}.png`));
try {
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    // Align the very thin mouth with the 16px grid so it stays recognizable.
    const cropY = size === 16 ? 110 : 140;
    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-i', source,
      '-vf', `crop=1000:1000:165:${cropY},scale=${size}:${size}:flags=lanczos,format=rgba`,
      '-frames:v', '1', '-threads', '1', files[i]
    ], {stdio: 'inherit'});
  }
  const images = files.map(file => readFileSync(file));
  const directory = Buffer.alloc(6 + 16 * images.length);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(images.length, 4);
  let offset = directory.length;
  images.forEach((image, i) => {
    const entry = 6 + i * 16;
    directory.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], entry);
    directory.writeUInt8(sizes[i] === 256 ? 0 : sizes[i], entry + 1);
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(image.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += image.length;
  });
  writeFileSync(join(root, 'favicon.ico'), Buffer.concat([directory, ...images]));
  writeFileSync(join(root, 'favicon-48x48.png'), images[sizes.indexOf(48)]);
  writeFileSync(join(root, 'blog', 'datamoney-logo-display.png'), images[sizes.indexOf(256)]);
  const encoded = images[sizes.indexOf(256)].toString('base64');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">\n  <image width="256" height="256" href="data:image/png;base64,${encoded}"/>\n</svg>\n`;
  writeFileSync(join(root, 'favicon-source.svg'), svg);
  console.log('Generated transparent favicon sizes:', sizes.join(', '));
} finally {
  for (const file of files) {
    try { unlinkSync(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  rmdirSync(temporary);
}
