const isProd = process.env.NODE_ENV === "production";

// Chrome: SameSite=None hole Secure lagbei. Local (http://localhost) e
// frontend ar backend same-site, tai "lax" dilei cookie jay.
const baseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? "none" : "lax") as "none" | "lax",
};

export const accessTokenCookieOptions = {
  ...baseOptions,
  maxAge: 1000 * 60 * 60 * 24, // 1 day
};

export const refreshTokenCookieOptions = {
  ...baseOptions,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
};

// clearCookie e maxAge dite hoy na
export const clearCookieOptions = baseOptions;
