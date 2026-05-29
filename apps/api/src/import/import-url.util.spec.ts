import { BadRequestException } from '@nestjs/common';
import { validateImportUrl } from './import-url.util';

describe('validateImportUrl', () => {
  it('accepts a valid HTTPS URL', () => {
    const url = validateImportUrl('https://example.com/resume.json');
    expect(url.href).toBe('https://example.com/resume.json');
  });

  it('accepts a valid URL with a path', () => {
    const url = validateImportUrl('https://example.com/path/to/resume.json');
    expect(url.hostname).toBe('example.com');
  });

  it('accepts URL with query string and hash', () => {
    const url = validateImportUrl('https://example.com/resume.json?v=1#section');
    expect(url.search).toBe('?v=1');
  });

  it('accepts registry JSON Resume URL', () => {
    const url = validateImportUrl('https://registry.jsonresume.org/AlexMercer');
    expect(url.hostname).toBe('registry.jsonresume.org');
  });

  it('rejects http:// URL', () => {
    expect(() => validateImportUrl('http://example.com/resume.json')).toThrow(BadRequestException);
  });

  it('rejects FTP URL', () => {
    expect(() => validateImportUrl('ftp://example.com/resume.json')).toThrow(BadRequestException);
  });

  it('rejects direct IPv4 address', () => {
    expect(() => validateImportUrl('https://192.168.1.1/resume.json')).toThrow(BadRequestException);
  });

  it('rejects localhost', () => {
    expect(() => validateImportUrl('https://localhost/resume.json')).toThrow(BadRequestException);
  });

  it('rejects localhost with port', () => {
    expect(() => validateImportUrl('https://localhost:8080/resume.json')).toThrow(
      BadRequestException,
    );
  });

  it('rejects localhost.localdomain', () => {
    expect(() => validateImportUrl('https://localhost.localdomain/resume.json')).toThrow(
      BadRequestException,
    );
  });

  it('rejects IPv6 address', () => {
    expect(() => validateImportUrl('https://[::1]/resume.json')).toThrow(BadRequestException);
  });

  it('rejects IPv6 with address', () => {
    expect(() => validateImportUrl('https://[2001:db8::1]/resume.json')).toThrow(
      BadRequestException,
    );
  });

  it('rejects malformed URL', () => {
    expect(() => validateImportUrl('not a url')).toThrow(BadRequestException);
  });

  it('rejects URL without protocol', () => {
    expect(() => validateImportUrl('example.com/resume.json')).toThrow(BadRequestException);
  });
});
