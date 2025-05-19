import { verifyGoogleJWT } from "./google.js";

export const providersVerificationMethodsMap = {
  google: verifyGoogleJWT,
};

export const providersUserinfoMap = {
  google: verifyGoogleJWT,
};
