import dotenv from "dotenv";
import { logInfo } from "../util/logging.js";
dotenv.config();

const API_URL_HEROKU = process.env.API_URL_HEROKU;
const API_URL_LOCAL = process.env.API_URL_LOCAL;

export const baseApiUrl =
  process.env.NODE_ENV === "production" ? API_URL_HEROKU : API_URL_LOCAL;

logInfo(`Server URL: ${baseApiUrl}`);
