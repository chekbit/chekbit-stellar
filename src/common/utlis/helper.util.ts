import crypto from 'crypto';
import fs, { Dir } from 'fs';
import path from 'path';

import Decimal from 'decimal.js';

export function subtractDecimal(a: number, b: number): number {
  return Decimal.max(
    new Decimal(a || 0).minus(b || 0),
    new Decimal(0),
  ).toNumber();
}

export function divideDecimal(a: number, b: number): number {
  if (!b) return 0; // protect against division by zero

  return Decimal.max(
    new Decimal(a || 0).dividedBy(b),
    new Decimal(0),
  ).toNumber();
}

export function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
  };
  return new Intl.DateTimeFormat('en-US', options)
    .format(date)
    .replace(',', '');
}

export function formatDateTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // for AM/PM
  };

  // Example output: "January 21 2026, 9:00 AM"
  return new Intl.DateTimeFormat('en-US', options)
    .format(date)
    .replace(',', '');
}

export function formatTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // for AM/PM
  };

  // Example output: "January 21 2026, 9:00 AM"
  return new Intl.DateTimeFormat('en-US', options)
    .format(date)
    .replace(',', '');
}

export function generateNumericCode(): string {
  // Example: generate 9-digit random UID
  return Math.floor(100000000 + Math.random() * 900000000).toString();
}

export function baseUrl(): string | undefined {
  return process.env.BASE_URL;
}

export function generateAddressLabel(): string {
  let label = '';
  while (label.length < 16) {
    label += Math.floor(Math.random() * 10);
  }
  return label;
}

export function normalizeIp(ip: string): string {
  if (!ip) return '';

  // IPv6 localhost
  if (ip === '::1') return '127.0.0.1';

  // IPv6 mapped IPv4 → ::ffff:127.0.0.1
  if (ip.startsWith('::ffff:')) return ip.replace('::ffff:', '');

  return ip;
}

export function getClientIp(req: any) {
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '';

  return ip;
}

export const decryptData = (encryptedPin: any) => {
  // Load the private key
  const privateKeyPath = path.join(process.cwd(), 'dist/secure/private.pem');
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');

  // Convert base64 to buffer
  const buffer = Buffer.from(encryptedPin, 'base64');

  // Decrypt
  const decryptedBuffer = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      oaepHash: 'sha256',
    },
    buffer,
  );

  const pin = decryptedBuffer.toString('utf8');
  return pin;
};

export const curriencies = [
  {
    code: 'NGN',
    name: 'Naira',
    symbol: '₦',
    country: 'Nigeria',
  },
  {
    code: 'GHS',
    name: 'Cedis',
    symbol: '₵',
    country: 'Ghana',
  },
];
