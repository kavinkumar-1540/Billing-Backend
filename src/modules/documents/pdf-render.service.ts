import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import puppeteer, { Browser } from 'puppeteer';

@Injectable()
export class PdfRenderService implements OnModuleDestroy {
  private browserPromise?: Promise<Browser>;

  private getBrowser(): Promise<Browser> {
    if (!this.browserPromise) {
      this.browserPromise = puppeteer
        .launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        })
        .catch((err: unknown) => {
          this.browserPromise = undefined;
          throw new ServiceUnavailableException(
            'PDF generation is unavailable on this deployment (no Chromium runtime installed)',
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
      await browser.close();
    }
  }
}
