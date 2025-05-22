import { auth } from "../controllers/index.js";
import express from "express";

const authRouter = express.Router();

authRouter.post("/login", auth.login);
authRouter.post("/:provider/login", auth.providerLogin);
authRouter.post("/refresh", auth.refresh);
authRouter.post("/revoke", auth.revoke);
authRouter.post("/extend", auth.extend);
authRouter.get("/verify", auth.verify);

authRouter.post("/reset/init", (req, res) =>
  res.status(404).json({ message: "Not implemented yet" }),
);
authRouter.post("/reset/finalize", (req, res) =>
  res.status(404).json({ message: "Not implemented yet" }),
);

export default authRouter;
