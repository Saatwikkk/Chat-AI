import { HttpError } from "../lib/httpError.js";

export const notFound = (req, res, next) => {
  next(new HttpError(404, "Not found."));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // The response is already streaming; the only thing left to do is close it.
  if (res.headersSent) {
    console.error(err);
    res.destroy();
    return;
  }

  let status = err.status ?? err.statusCode ?? 500;
  let message = err.message;

  if (err.name === "ValidationError") {
    status = 400;
  } else if (err.type === "entity.parse.failed") {
    message = "Invalid JSON body.";
  } else if (err.type === "entity.too.large") {
    message = "Request body is too large.";
  }

  if (status >= 500) {
    console.error(err);
    message = "Something went wrong. Please try again.";
  }

  res.status(status).json({ error: message });
};
