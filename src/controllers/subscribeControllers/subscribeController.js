import jwt from "jsonwebtoken";
import PreSubscribedUser from "../../models/subscribe/preSubscribe.js";
import { logError } from "../../util/logging.js";

export const subscribeController = async (req, res) => {
  const token = req.query.token; // Obtener el token desde la URL

  // Verificar si el token está presente
  if (!token) {
    return res.redirect("/error"); // Redirigir a una página de error si el token está ausente
  }

  try {
    // Verificar y decodificar el token usando la clave secreta
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Usa la clave secreta que configuraste
    const email = decoded.email; // Suponiendo que el token contiene el email del usuario

    // Buscar al usuario en la colección PreSubscribedUser
    const user = await PreSubscribedUser.findOne({ email });

    // Si el usuario no se encuentra
    if (!user) {
      return res.redirect("/error"); // Redirigir a una página de error si no se encuentra el usuario
    }

    // Cambiar el estado de la suscripción del usuario a 'true'
    user.isSubscribed = true;

    // Guardar los cambios en la base de datos
    await user.save();

    // Redirigir a una página de éxito
    return res.redirect("/success"); // Redirigir a una página de éxito tras la confirmación
  } catch (error) {
    // En caso de error (por ejemplo, token inválido o expirado)
    logError("Error during subscription confirmation:", error);
    return res.redirect("/error"); // Redirigir a una página de error en caso de problemas
  }
};
