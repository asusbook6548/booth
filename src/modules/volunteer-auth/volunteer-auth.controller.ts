import { Request, Response } from "express";

import { loginVolunteer } from "./volunteer-auth.service";

import {
  volunteerLoginSchema,
} from "./volunteer-auth.validation";
import { formatErrorMessage } from "../../utils/error-formatter.js";

export async function login(
  req: Request,
  res: Response
) {
  try {
    const input =
      volunteerLoginSchema.parse(req.body);

    const result =
      await loginVolunteer(input);

    return res.status(200).json({
      success: true,
      message: "Volunteer login successful",
      data: result,
    });
  } catch (error) {
    console.error("Volunteer login error:", error);
    const message = formatErrorMessage(error, "Volunteer login failed");

    return res.status(401).json({
      success: false,
      message,
    });
  }
}