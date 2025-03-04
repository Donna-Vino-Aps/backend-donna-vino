import { API_URL_HEROKU, API_URL_LOCAL } from "@env";

export const baseApiUrl =
  process.env.NODE_ENV === "production" ? API_URL_HEROKU : API_URL_LOCAL;

logInfo(`Server URL: ${baseApiUrl}`);
