import { existsSync, openSync, writeSync, closeSync, fstatSync } from 'fs';

export function appendPcmToWav(path: string, pcm: Buffer, sampleRate = 24_000): void {
  if (!pcm.length) return;

  if (!existsSync(path)) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36, 4);              // patched below
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);              // PCM
    header.writeUInt16LE(1, 22);              // mono
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(0, 40);              // patched below

    const fd = openSync(path, 'w');
    writeSync(fd, header);
    closeSync(fd);
  }

  const fd = openSync(path, 'r+');
  try {
    // Append audio at the end of the file
    const end = fstatSync(fd).size;
    writeSync(fd, pcm, 0, pcm.length, end);

    // Patch the RIFF and data sizes in the header
    const dataSize = end + pcm.length - 44;
    const sizes = Buffer.alloc(4);

    sizes.writeUInt32LE(36 + dataSize, 0);
    writeSync(fd, sizes, 0, 4, 4);

    sizes.writeUInt32LE(dataSize, 0);
    writeSync(fd, sizes, 0, 4, 40);
  } finally {
    closeSync(fd);
  }
}