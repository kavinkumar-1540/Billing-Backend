import {
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import puppeteer, { Browser } from 'puppeteer';
import { resolveChromiumExecutablePath } from '../../common/utils/puppeteer-launch.util';

@Injectable()
export class PdfRenderService implements OnModuleDestroy {
  private browserPromise?: Promise<Browser>;
  private isRemoteBrowser = false;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Renders happen either against a local/bundled Chromium (default, used in
   * dev) or against a remote browser over WebSocket when
   * app.browserlessWsEndpoint is configured - used in production
   * deployments (e.g. Render) whose runtime container can't persist a
   * puppeteer-downloaded Chromium binary between build and runtime.
   */
  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      const browserlessEndpoint = this.configService.get<string>(
        'app.browserlessWsEndpoint',
      );
      this.isRemoteBrowser = Boolean(browserlessEndpoint);

      this.browserPromise = (
        browserlessEndpoint
          ? puppeteer.connect({ browserWSEndpoint: browserlessEndpoint })
          : puppeteer.launch({
              headless: true,
              executablePath: resolveChromiumExecutablePath(
                this.configService.get<string>('app.chromiumPath'),
              ),
              args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
              ],
            })
      ).catch((err: unknown) => {
        this.browserPromise = undefined;
        const detail = err instanceof Error ? err.message : String(err);
        throw new ServiceUnavailableException(
          `PDF generation is unavailable: failed to connect to Chromium (${detail})`,
          { cause: err instanceof Error ? err : undefined },
        );
      });
    }
    return this.browserPromise;
  }

  async renderPdf(html: string): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browserPromise) {
      const browser = await this.browserPromise;
      if (this.isRemoteBrowser) {
        await browser.disconnect();
      } else {
        await browser.close();
      }
    }
  }
}
