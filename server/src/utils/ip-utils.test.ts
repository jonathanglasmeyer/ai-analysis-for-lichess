// server/src/utils/ip-utils.test.ts
import { describe, test, expect } from 'bun:test';
import { getClientIp, hashIp } from './ip-utils';

describe('getClientIp', () => {
  test('should return IP from x-forwarded-for header', () => {
    const request = new Request('http://example.com', {
      headers: { 'x-forwarded-for': '123.45.67.89' },
    });
    expect(getClientIp(request)).toBe('123.45.67.89');
  });

  test('should return the first IP from a comma-separated x-forwarded-for header', () => {
    const request = new Request('http://example.com', {
      headers: { 'x-forwarded-for': '123.45.67.89, 98.76.54.32' },
    });
    expect(getClientIp(request)).toBe('123.45.67.89');
  });

  test('should return IP from x-real-ip header if x-forwarded-for is not present', () => {
    const request = new Request('http://example.com', {
      headers: { 'x-real-ip': '192.168.1.1' },
    });
    expect(getClientIp(request)).toBe('192.168.1.1');
  });

  test('should return IP from cf-connecting-ip header if others are not present', () => {
    const request = new Request('http://example.com', {
      headers: { 'cf-connecting-ip': '203.0.113.195' },
    });
    expect(getClientIp(request)).toBe('203.0.113.195');
  });

  test('should prioritize x-forwarded-for over other headers', () => {
    const request = new Request('http://example.com', {
      headers: {
        'x-forwarded-for': '123.45.67.89',
        'x-real-ip': '192.168.1.1',
        'cf-connecting-ip': '203.0.113.195',
      },
    });
    expect(getClientIp(request)).toBe('123.45.67.89');
  });

  test('should return null if no IP headers are present', () => {
    const request = new Request('http://example.com');
    expect(getClientIp(request)).toBeNull();
  });

  test('should handle trimmed whitespace correctly', () => {
    const request = new Request('http://example.com', {
      headers: { 'x-forwarded-for': '  123.45.67.89  , 98.76.54.32' },
    });
    expect(getClientIp(request)).toBe('123.45.67.89');
  });
});

describe('hashIp', () => {
  const salt = 'a-secure-random-salt-for-testing';

  test('should produce a consistent SHA-256 hash for a given IP and salt', () => {
    const ip = '192.168.1.1';
    const expectedHash = '0759dce186ef42e9acd91f4ff400c248cb64decae64f8c0f2631406e329de8c8';
    expect(hashIp(ip, salt)).toBe(expectedHash);
  });

  test('should produce a different hash for a different IP', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    expect(hashIp(ip1, salt)).not.toBe(hashIp(ip2, salt));
  });

  test('should produce a different hash for a different salt', () => {
    const ip = '192.168.1.1';
    const salt2 = 'another-salt';
    expect(hashIp(ip, salt)).not.toBe(hashIp(ip, salt2));
  });

  test('should throw an error if IP is not provided', () => {
    // @ts-ignore
    expect(() => hashIp(null, salt)).toThrow('IP address must be a non-empty string for hashing.');
    expect(() => hashIp('', salt)).toThrow('IP address must be a non-empty string for hashing.');
  });

  test('should throw an error if salt is not provided', () => {
    const ip = '192.168.1.1';
    // @ts-ignore
    expect(() => hashIp(ip, null)).toThrow('Salt must be a non-empty string for hashing.');
    expect(() => hashIp(ip, '')).toThrow('Salt must be a non-empty string for hashing.');
  });
});
