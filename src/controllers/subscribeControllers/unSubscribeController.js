import jwt from "jsonwebtoken";
import dotenv from "dotenv";
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
import { baseDonnaVinoWebUrl } from "../../config/environment.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

const resolvePath = (relativePath) => path.resolve(process.cwd(), relativePath);

// Cargar plantillas de email
const unsubscribeSuccessTemplatePath = resolvePath(
  "src/templates/unsubscribeSuccessTemplate.html",
);
const unsubscribeConfirmationTemplatePath = resolvePath(
  "src/templates/confirmUnsubscribeTemplate.html",
);

let emailSuccessTemplate;
let unsubscribeConfirmationTemplate;

try {
  emailSuccessTemplate = fs.readFileSync(
    unsubscribeSuccessTemplatePath,
    "utf8",
  );
  unsubscribeConfirmationTemplate = fs.readFileSync(
    unsubscribeConfirmationTemplatePath,
    "utf8",
  );
} catch (error) {
  logError("Error reading email templates", error);
}

// Función para generar la URL de desuscripción
const createUnsubscribeUrl = async (email) => {
  try {
    const unsubscribeRequestToken = await generateToken(email);
    return `${baseDonnaVinoWebUrl}/subscription/unsubscribe-request?token=${unsubscribeRequestToken}`;
  } catch (error) {
    logError("Error generating unsubscribe URL", error);
    throw new Error("Failed to generate unsubscribe URL");
  }
};

export const unSubscribeController = async (req, res) => {
  try {
    const { token, subject } = req.body;

    if (!token || !subject) {
      return res.status(400).json({
        success: false,
        message: "Token and subject are required.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      logError("Invalid or expired token.", error);

      // Intentamos obtener el email del token sin verificarlo (puede haber caducado)
      const expiredTokenData = jwt.decode(token);
      const email = expiredTokenData?.email;

      if (email) {
        // Generamos un nuevo token y lo incrustamos en la plantilla
        const newUnsubscribeUrl = await createUnsubscribeUrl(email);
        const updatedConfirmationEmail =
          unsubscribeConfirmationTemplate.replace(
            "{{CONFIRM_UNSUBSCRIBE_URL}}",
            newUnsubscribeUrl,
          );

        // Enviamos el email con el nuevo token
        await sendEmail(
          email,
          "Your unsubscribe request has expired",
          updatedConfirmationEmail,
        );

        logInfo(`Token expired. Sent new unsubscribe email to ${email}`);

        return res.status(401).json({
          success: false,
          message: "Token expired. A new confirmation email has been sent.",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid token structure.",
      });
    }

    const { email: to, id: tokenId } = decoded;

    // Verificar si el token ya fue usado
    if (await isTokenUsed(tokenId)) {
      return res.status(400).json({
        success: false,
        message: "This unsubscribe request has already been processed.",
      });
    }

    // Verificar si el usuario está suscrito
    const existingSubscribedUser = await SubscribedUser.findOne({ email: to });
    if (!existingSubscribedUser) {
      logInfo(`User with email ${to} not found in the subscribed list.`);
      return res.status(404).json({
        success: false,
        message: "User does not exist in the subscribed list.",
      });
    }

    // Eliminar al usuario de la base de datos
    await SubscribedUser.deleteOne({ email: to });

    logInfo(`User ${to} unsubscribed successfully.`);

    // Marcar el token como usado y eliminarlo
    await markTokenAsUsed(tokenId);
    await deleteToken(tokenId);

    // Enviar email de confirmación (sin token)
    await sendEmail(
      to,
      "Subscription successfully canceled",
      emailSuccessTemplate,
    );
    logInfo(`Unsubscribe success email sent to ${to}`);

    return res.status(200).json({
      success: true,
      message:
        "You have been unsubscribed successfully. A confirmation email has been sent.",
    });
  } catch (error) {
    logError("Error in unSubscribeController", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
