import dotenv from "dotenv";
import { logInfo, logError } from "../util/logging.js";

dotenv.config();

const {
  API_URL_LOCAL,
  API_URL_STAGING,
  API_URL_PRODUCTION,
  DONNA_VINO_WEB_LOCAL,
  DONNA_VINO_WEB_STAGING,
  DONNA_VINO_WEB_PRODUCTION,
  DONNA_VINO_ECOMMERCE_WEB_HEROKU,
  DONNA_VINO_ECOMMERCE_WEB_LOCAL,
  NODE_ENV,
} = process.env;

if (!API_URL_LOCAL || !API_URL_STAGING || !API_URL_PRODUCTION) {
  logError(
    "❌ Missing one or more API URLs (LOCAL/STAGING/PRODUCTION) in environment variables",
  );
}

if (
  !DONNA_VINO_WEB_LOCAL ||
  !DONNA_VINO_WEB_STAGING ||
  !DONNA_VINO_WEB_PRODUCTION
) {
  logError(
    "❌ Missing one or more Donna Vino web URLs (LOCAL/STAGING/PRODUCTION) in environment variables",
  );
}

if (!DONNA_VINO_ECOMMERCE_WEB_HEROKU || !DONNA_VINO_ECOMMERCE_WEB_LOCAL) {
  logError(
    "❌ Missing one or more Donna Vino Ecommerce URLs (HEROKU/LOCAL) in environment variables",
  );
}

export const baseApiUrl =
  NODE_ENV === "production"
    ? API_URL_PRODUCTION.replace(/\/+$/, "")
    : NODE_ENV === "staging"
    ? API_URL_STAGING.replace(/\/+$/, "")
    : API_URL_LOCAL.replace(/\/+$/, "");

export const baseDonnaVinoWebUrl =
  NODE_ENV === "production"
    ? DONNA_VINO_WEB_PRODUCTION.replace(/\/+$/, "")
    : NODE_ENV === "staging"
    ? DONNA_VINO_WEB_STAGING.replace(/\/+$/, "")
    : DONNA_VINO_WEB_LOCAL.replace(/\/+$/, "");

export const baseDonnaVinoEcommerceWebUrl =
  NODE_ENV === "production" || NODE_ENV === "staging"
    ? DONNA_VINO_ECOMMERCE_WEB_HEROKU
    : DONNA_VINO_ECOMMERCE_WEB_LOCAL;

logInfo(`🌐 Server API URL: ${baseApiUrl}`);
logInfo(`🍷 Donna Vino Web URL: ${baseDonnaVinoWebUrl}`);
logInfo(`🛒 Donna Vino Ecommerce Web URL: ${baseDonnaVinoEcommerceWebUrl}`);
