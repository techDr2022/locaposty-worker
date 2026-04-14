import puppeteer from "puppeteer-core";
import { executablePath as getBundledChromiumPath } from "puppeteer";
import chromium from "@sparticuz/chromium-min";

export async function renderHtmlToPdfBuffer(html: string): Promise<Buffer> {
  const isProduction = process.env.NODE_ENV === "production";
  let browser;

  try {
    let launchOptions: Parameters<typeof puppeteer.launch>[0];

    if (isProduction) {
      const chromiumPackUrl =
        process.env.CHROMIUM_PACK_URL ||
        "https://github.com/Sparticuz/chromium/releases/download/v119.0.2/chromium-v119.0.2-pack.tar";

      const executablePath = await chromium.executablePath(chromiumPackUrl);

      launchOptions = {
        args: chromium.args,
        defaultViewport: null,
        executablePath,
        headless: true,
      };
    } else {
      // puppeteer-core does not ship Chromium — use the full `puppeteer` package’s
      // bundled browser path, or PUPPETEER_EXECUTABLE_PATH / CHROME_PATH for a local install.
      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        process.env.CHROME_PATH ||
        getBundledChromiumPath();

      launchOptions = {
        executablePath,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        headless: true,
      };
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
    });

    await browser.close();
    return Buffer.from(pdf);
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}
