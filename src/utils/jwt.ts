import jwt, { type SignOptions } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET as string;
const EXPIRES_IN = (process.env.JWT_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export interface JwtPayload {
  userId: string;
  role: "USER" | "DRIVER";
}

export const signToken = (payload: JwtPayload): string => {
  const opts: SignOptions = { expiresIn: EXPIRES_IN };
  return jwt.sign(payload, SECRET, opts);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, SECRET) as JwtPayload;
};
