import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import PreSubscribedUser from "../../models/subscribe/preSubscribeModel.js";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import {
  isTokenUsed,
  markTokenAsUsed,
  deleteToken, // función para eliminar token no válido
} from "../../services/token/tokenRepository.js";
import { generateToken } from "../../services/token/tokenGenerator.js";
import path from "path";
import fs from "fs";
import { baseApiUrl, baseDonnaVinoWebUrl } from "../../config/environment.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

export const unSubscribeController = async (req, res) => {
  try {
    const unsubscribeTemplatePath = resolvePath(
      "src/templates/unsubscribeTemplate.html",
    );
    const unsubscribeConfirmationTemplatePath = resolvePath(
      "src/templates/unsubscribeConfirmation.html",
    );

    let emailTemplate;
    try {
      // Cargar plantilla de correo dependiendo de si es válido o caducado
      emailTemplate = fs.readFileSync(unsubscribeTemplatePath, "utf-8");
    } catch (error) {
      logError(`Error reading email template: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: "Internal server error: Failed to read template",
      });
    }

    // Verificar si el token es válido
    const { token } = req.query; // Suponiendo que el token es pasado como query
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logError("Invalid or expired token.", error);
      // Enviar el correo de "token caducado"
      const expiredEmailTemplate = fs.readFileSync(
        unsubscribeConfirmationTemplatePath,
        "utf-8",
      );
      const { email: to, id: tokenId } = decoded || {};

      await deleteToken(tokenId);

      const unsubscribeToken = await generateToken(to);
      const unsubscribeUrl = `${baseApiUrl}/api/subscribe/un-subscribe?token=${unsubscribeToken}`;
      const homeUrl = `${baseDonnaVinoWebUrl}`;

      const newExpiredEmail = expiredEmailTemplate
        .replace("{{RE_DIRECT_URL}}", homeUrl)
        .replace("{{UNSUBSCRIBE_URL}}", unsubscribeUrl);

      await sendEmail(to, "Your unsubscribe link has expired", newExpiredEmail);

      logInfo(`Expired unsubscribe email sent to ${to}`);

      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired token. A new unsubscribe email has been sent.",
      });
    }

    const { email: to, id: tokenId } = decoded;

    const tokenUsed = await isTokenUsed(tokenId);
    if (tokenUsed) {
      return res.status(400).json({
        success: false,
        message: "This token has already been used.",
      });
    }

    const preSubscribedUser = await PreSubscribedUser.findOne({ email: to });
    if (!preSubscribedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in PreSubscribedUser",
      });
    }

    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });
    if (existingSubscribedUser) {
      return res.status(200).json({
        success: true,
        message: "User is already subscribed.",
      });
    }

    const newSubscribedUser = new SubscribedUser({ email: to });
    await newSubscribedUser.save();

    await PreSubscribedUser.deleteOne({ email: to });

    logInfo(
      `User ${to} moved to SubscribedUser and removed from PreSubscribedUser.`,
    );

    await markTokenAsUsed(tokenId);

    const unsubscribeToken = await generateToken(to);
    const unsubscribeUrl = `${baseApiUrl}/api/subscribe/un-subscribe?token=${unsubscribeToken}`;
    const homeUrl = `${baseDonnaVinoWebUrl}`;

    emailTemplate = emailTemplate
      .replace("{{RE_DIRECT_URL}}", homeUrl)
      .replace("{{UNSUBSCRIBE_URL}}", unsubscribeUrl);

    await sendEmail(to, "Subscription confirmed", emailTemplate);

    logInfo(`Welcome email sent to ${to}`);

    return res.status(200).json({
      success: true,
      message: "Subscription confirmed and welcome email sent.",
    });
  } catch (error) {
    logError("Error in unsubscribeController", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
