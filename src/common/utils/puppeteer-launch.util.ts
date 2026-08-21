import { existsSync } from 'fs';

/**
 * Only use a configured Chromium path if it actually exists on disk -
 * otherwise return undefined so puppeteer falls back to its own bundled
 * browser instead of failing to launch entirely (e.g. "Browser was not
 * found at the configured executablePath").
 */
export function resolveChromiumExecutablePath(
  configuredPath?: string,
): string | undefined {
  return configuredPath && existsSync(configuredPath)
    ? configuredPath
    : undefined;
}
