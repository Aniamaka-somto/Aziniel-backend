import { Request, Response } from "express";
import { registerUser, loginUser, getMe } from "./auth.service";
import { sendSuccess } from "../../utils/response";
import { AuthRequest } from "../../middleware/auth";

export const register = async (req: Request, res: Response) => {
  const result = await registerUser(req.body);
  sendSuccess(res, result, "Registration successful", 201);
};

export const login = async (req: Request, res: Response) => {
  const result = await loginUser(req.body);
  sendSuccess(res, result, "Login successful");
};

export const me = async (req: AuthRequest, res: Response) => {
  const user = await getMe(req.user!.userId);
  sendSuccess(res, user, "User fetched");
};
export const savePushToken = async (req: AuthRequest, res: Response) => {
  const { pushToken } = req.body;
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { pushToken },
  });
  sendSuccess(res, null, "Push token saved");
};