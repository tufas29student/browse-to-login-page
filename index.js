const puppeteer = require("puppeteer");
const solver = require("./solver");
const logger = require("./logger");
const url =
  "https://www.yad2.co.il/my-alerts/realestate/66e34186bb50e18879901b70?utm_source=myAlertsRealestate&utm_medium=email&utm_campaign=myAlertsFeed";

async function attemptCaptchaSolve(retryCount = 0) {
  const MAX_RETRIES = 3;
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  page.setExtraHTTPHeaders({
    "User-Agent": "BOT SCRAPPER",
  });

  try {
    await page.setViewport({ width: 1280, height: 720 });

    logger.info(`Starting CAPTCHA bypass attempt ${retryCount + 1}`);
    await page.goto(url);

    await new Promise((r) => setTimeout(r, 3000));

    if (!page.url().includes("validate")) {
      logger.info("No CAPTCHA detected, proceeding directly");
      return { success: true, browser };
    }

    await page.waitForSelector('textarea[name="h-captcha-response"]', {
      hidden: true,
    });
    await page.evaluate(() => {
      document.querySelector(
        'textarea[name="h-captcha-response"]'
      ).style.display = "block";
    });

    await page.waitForSelector("#cf_input", { timeout: 5000 });
    await page.evaluate(() => {
      const cfInput = document.querySelector("#cf_input");
      cfInput.type = "text";
      cfInput.style.display = "block";
    });

    const token = await solver(page.url());
    logger.info(`TOKEN: ${token ? token.slice(0, 10) : "none"}...`);
    await page.type('textarea[name="h-captcha-response"]', token);

    await page.type(
      "#cf_input",
      "V01173985785844891116GxVYJuDsg94039oW6AJRaOeQ9dc48356248197352400f99"
    );

    logger.info("CAPTCHA solution submitted");
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }),
      page.click(".btn.btn-success.btn-sm"),
    ]);

    if (page.url().includes("validate")) {
      throw new Error("CAPTCHA verification failed");
    }

    logger.info("Successfully bypassed CAPTCHA");
    return { success: true, browser };
  } catch (error) {
    logger.error(`Attempt ${retryCount + 1} failed: ${error.message}`);
    await browser.close();
    if (retryCount < MAX_RETRIES - 1) {
      logger.info(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      return attemptCaptchaSolve(retryCount + 1);
    }
    return { success: false, error: error.message };
  }
}

async function openWebsite() {
  try {
    const { success, browser, error } = await attemptCaptchaSolve();

    if (success) {
      logger.info("Successfully bypassed CAPTCHA!");
      // here you can now do whatever you want with **browser** that return from attemptCaptchaSolve function
    } else {
      logger.error(`Failed after 3 attempts: ${error}`);
    }
  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`);
  }
}

openWebsite();
