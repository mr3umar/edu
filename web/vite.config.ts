import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Self-signed dev certs (generate with `npm run certs`). HTTPS is needed for
// mic access when the dev server is opened from another device on the LAN.
const certDir = path.resolve(import.meta.dirname, 'certs');
const keyFile = path.join(certDir, 'dev-key.pem');
const certFile = path.join(certDir, 'dev-cert.pem');
const https =
  fs.existsSync(keyFile) && fs.existsSync(certFile)
    ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
    : undefined;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { https },
  preview: { https }
});
