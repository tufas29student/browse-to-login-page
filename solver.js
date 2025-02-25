const axios = require("axios");
const logger = require("./logger");

const KEY = "APIKEY";

function solvehCaptcha(url) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axios.post(
        "https://api.solvecaptcha.com/in.php",
        null,
        {
          params: {
            key: KEY,
            method: "hcaptcha",
            version: "v3",
            sitekey: "ae73173b-7003-44e0-bc87-654d0dab8b75",
            pageurl: url,
            json: 1,
          },
        }
      );

      if (response.data.status !== 1) {
        logger.error(`SolveCaptcha error: ${response.data.request}`);
        return reject(new Error(response.data.request));
      }

      const captchaId = response.data.request;
      logger.info(`Created CAPTCHA task ID: ${captchaId}`);

      // Record the start time
      const startTime = Date.now();

      while (true) {
        //The captcha should be solved within 40 seconds at most. If it takes more than 60 seconds, there is probably a problem and it will throw error and start over.
        if (Date.now() - startTime > 60000) {
          logger.error("SolveCaptcha error: Timeout exceeded 60 seconds");
          return reject(new Error("Timeout exceeded 60 seconds"));
        }

        await new Promise((r) => setTimeout(r, 5000));

        const resultResponse = await axios.get(
          "https://api.solvecaptcha.com/res.php",
          {
            params: {
              key: KEY,
              action: "get",
              id: captchaId,
              json: 1,
            },
          }
        );

        if (resultResponse.data.status === 1) {
          logger.info(`CAPTCHA solved successfully`);
          return resolve(resultResponse.data.request);
        }

        logger.info(`CAPTCHA status: ${resultResponse.data.request}`);
        if (resultResponse.data.request !== "CAPCHA_NOT_READY") {
          logger.error(`SolveCaptcha error: ${resultResponse.data.request}`);
          return reject(new Error(resultResponse.data.request));
        }
      }
    } catch (error) {
      logger.error(`SolveCaptcha exception: ${error.message}`);
      reject(error);
    }
  });
}

module.exports = solvehCaptcha;
