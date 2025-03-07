import dotenv from "dotenv";
import { logInfo, logError } from "../util/logging.js";

dotenv.config();

const {
  API_URL_HEROKU,
  API_URL_LOCAL,
  DONNA_VINO_WEB_LOCAL,
  DONNA_VINO_WEB_HEROKU,
  NODE_ENV,
} = process.env;

if (!API_URL_HEROKU || !API_URL_LOCAL) {
  logError("❌ Missing API URLs in environment variables");
}

if (!DONNA_VINO_WEB_LOCAL || !DONNA_VINO_WEB_HEROKU) {
  logError("❌ Missing Donna Vino web URLs in environment variables");
}

export const baseApiUrl =
  NODE_ENV === "production" ? API_URL_HEROKU : API_URL_LOCAL;

export const baseDonnaVinoWebUrl =
  NODE_ENV === "production" ? DONNA_VINO_WEB_HEROKU : DONNA_VINO_WEB_LOCAL;

logInfo(`🌐 Server URL: ${baseApiUrl}`);
logInfo(`🍷 Donna Vino Web URL: ${baseDonnaVinoWebUrl}`);
