import { STAFF_SESSION_COOKIE } from './staff-auth.constants';

export function readSessionCookie(
  header: string | undefined,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === STAFF_SESSION_COOKIE) {
      const value = rawValue.join('=');
      return value ? decodeURIComponent(value) : undefined;
    }
  }
  return undefined;
}
