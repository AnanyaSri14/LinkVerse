import { extractTokenFromRequest, resolveUserFromAccessToken } from "../utils/auth.utils.js";

export const verifyAuthToken = async (req, res, next) => {
  try {
    const token = extractTokenFromRequest(req);
    const user = await resolveUserFromAccessToken(token);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    req.user = user;
    req.authToken = token;
    req.body = req.body || {};
    req.query = req.query || {};

    if (!req.body.token) {
      req.body.token = token;
    }

    if (!req.query.token) {
      req.query.token = token;
    }

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }
};
