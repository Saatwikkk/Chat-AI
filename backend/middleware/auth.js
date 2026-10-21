import { getAuth } from "@clerk/express";
import { HttpError } from "../lib/httpError.js";

// Rejects the request with 401 JSON (instead of redirecting) when there is no
// signed-in Clerk user, and exposes the user id as `req.userId`.
export const requireUser = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    return next(new HttpError(401, "Please sign in to continue."));
  }
  req.userId = userId;
  next();
};
