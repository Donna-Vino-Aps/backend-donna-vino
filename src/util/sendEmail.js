import fs from "fs/promises";
import path from "path";
import handlebars from "handlebars";
import { Resend } from "resend";
import { logError, logInfo } from "./logging.js";

async function renderTemplate(templateName, params) {
  const templatePath = path.join(
    process.cwd(),
    "src",
    "views",
    "email",
    `${templateName}.hbs`,
  );

  const source = await fs.readFile(templatePath, "utf8");
  const compiled = handlebars.compile(source);
  return compiled(params);
}

async function sendEmail(to, subject, template, params) {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const body = await renderTemplate(template, params);
    logInfo(body);
    await resend.emails.send({
      from: `"Donna Vino" <${process.env.NO_REPLY_EMAIL}>`,
      to,
      subject,
      html: body,
    });
  } catch (error) {
    logError(error);
  }
}

export default sendEmail;
