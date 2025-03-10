import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import PreSubscribedUser from "../../models/subscribe/preSubscribeModel.js";
import SubscribedUser from "../../models/subscribe/subscribedModel.js";
import { sendEmail } from "../../util/emailUtils.js";
import { logInfo, logError } from "../../util/logging.js";
import {
  isTokenUsed,
  markTokenAsUsed,
  deleteToken,
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
      "src/templates/unsubscribeRequest.html",
    );
    const unsubscribeConfirmationTemplatePath = resolvePath(
      "src/templates/unsubscribeConfirmation.html",
    );

    let emailTemplate;
    try {
      emailTemplate = fs.readFileSync(unsubscribeTemplatePath, "utf-8");
    } catch (error) {
      logError(`Error reading email template: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: "Internal server error: Failed to read template",
      });
    }

    const { token } = req.query;
    let decoded;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logError("Invalid or expired token.", error);
      // Generar nuevo token para solicitar la desuscripción
      const expiredEmailTemplate = fs.readFileSync(
        unsubscribeConfirmationTemplatePath,
        "utf-8",
      );
      const { email: to, id: tokenId } = decoded || {};

      // Eliminar el token caducado
      await deleteToken(tokenId);

      // Crear un nuevo token de solicitud de desuscripción
      const unsubscribeRequestToken = await generateToken(to);
      const unsubscribeRequestUrl = `${baseApiUrl}/api/subscribe/un-subscribe?token=${unsubscribeRequestToken}`;
      const homeUrl = `${baseDonnaVinoWebUrl}`;

      // Actualizar el contenido del email con el nuevo enlace
      const newExpiredEmail = expiredEmailTemplate
        .replace("{{RE_DIRECT_URL}}", homeUrl)
        .replace("{{UNSUBSCRIBE_URL}}", unsubscribeRequestUrl);

      await sendEmail(to, "Confirm your unsubscribe request", newExpiredEmail);

      logInfo(`Unsubscribe request email sent to ${to}`);

      return res.status(401).json({
        success: false,
        message:
          "Your unsubscribe link has expired. A new confirmation email has been sent.",
      });
    }

    // Token válido
    const { email: to, id: tokenId } = decoded;

    // Verificar si el token ya fue utilizado
    const tokenUsed = await isTokenUsed(tokenId);
    if (tokenUsed) {
      return res.status(400).json({
        success: false,
        message: "This unsubscribe request has already been processed.",
      });
    }

    // Verificar si el usuario existe en PreSubscribedUser
    const preSubscribedUser = await PreSubscribedUser.findOne({ email: to });
    if (!preSubscribedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found in PreSubscribedUser.",
      });
    }

    // Verificar si el usuario ya está suscrito
    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });
    if (existingSubscribedUser) {
      return res.status(200).json({
        success: true,
        message: "User is already subscribed.",
      });
    }

    // Mover al usuario a SubscribedUser
    await SubscribedUser.create({ email: to });

    // Eliminar de PreSubscribedUser
    await PreSubscribedUser.deleteOne({ email: to });

    logInfo(`User ${to} moved to SubscribedUser.`);

    // Marcar el token como usado
    await markTokenAsUsed(tokenId);

    // Generar un nuevo token para futuras solicitudes de desuscripción
    const unsubscribeRequestToken = await generateToken(to);
    const unsubscribeRequestUrl = `${baseApiUrl}/api/subscribe/un-subscribe?token=${unsubscribeRequestToken}`;
    const homeUrl = `${baseDonnaVinoWebUrl}`;

    emailTemplate = emailTemplate
      .replace("{{RE_DIRECT_URL}}", homeUrl)
      .replace("{{UNSUBSCRIBE_URL}}", unsubscribeRequestUrl);

    await sendEmail(
      to,
      "Subscription confirmed - Manage your preferences",
      emailTemplate,
    );

    logInfo(`Subscription confirmation email sent to ${to}`);

    return res.status(200).json({
      success: true,
      message:
        "Unsubscribe request received. Please check your email to confirm.",
    });
  } catch (error) {
    logError("Error in unSubscribeController", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
