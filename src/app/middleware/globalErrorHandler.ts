import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import config from "../config";
import { AppError } from "../utils/AppError";

type TErrorSource = { field?: string; message: string };

export const globalErrorHandler = async (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const isDev = config.node_env === "development";

  if (isDev) {
    console.log("Error from Global Error Handler", err);
  }

  let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
  let message = "Internal Server Error";
  let errors: TErrorSource[] = [];

  if (err instanceof ZodError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "Validation failed";
    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus.BAD_REQUEST;
    message = "You have provided incorrect field type or missing fields";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus.CONFLICT;
      message = "Duplicate Key Error";
    } else if (err.code === "P2003") {
      statusCode = httpStatus.BAD_REQUEST;
      message = "Foreign key constraint failed";
    } else if (err.code === "P2025") {
      statusCode = httpStatus.NOT_FOUND;
      message = "Required record not found";
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = "Database connection failed";
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    message = "Error occurred during query execution";
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error && isDev) {
    message = err.message;
  }

  if (errors.length === 0) {
    errors = [{ message }];
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    ...(isDev && { stack: err.stack }),
  });
};
