import express from "express";
import { register } from "../controllers/index.js";

const registerRouter = express.Router();

registerRouter.post("/", register.signUp);
registerRouter.post("/:provider", register.providerSignUp);

registerRouter.get("/email/confirm", register.email.confirm);
registerRouter.get("/email/decline", register.email.decline);

export default registerRouter;
