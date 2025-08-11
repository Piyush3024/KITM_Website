// import jwt from 'jsonwebtoken';
// import { PrismaClient } from '@prisma/client';
// import rateLimit from 'express-rate-limit';


// const prisma = new PrismaClient();

// export const authRateLimit = rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 minutes
//     max: 100, // Limit each IP to 100 requests per windowMs
//     message: {
//         success: false,
//         message: 'Too many requests from this IP, please try again later',
//     },
//     standardHeaders: true,
//     legacyHeaders: false,
// })

// const sendUnauthorizedResponse = (res, message, additionalData = {}) => {
//     return res.status(401).json({
//         success: false,
//         message,
//         timestamp: new Date().toISOString(),
//         ...additionalData,
//     });
// };

// const extractToken = (req) => {
//     let token = req.cookies?.accessToken;

//     if (!token) {
//         const authHeader = req.headers.authorization;
//         if (authHeader && authHeader.startsWith('Bearer ')) {
//             token = authHeader.substring(7);
//         }

//     }
//     return token;
// }


// export const protectRoute = async (req, res, next) => {
//     try {
//         const token = extractToken(req);

//         if (!token) {
//             return sendUnauthorizedResponse(res, "Unauthorized - No Access token provided")
//         }
//         const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
//             algorithms: ['HS256'],
//             maxAge: '24h'
//         });
  

//         if (!decoded.userId) {
//             return sendUnauthorizedResponse(res, "Unauthorized - Invalid token structure")
//         }


//         const user = await prisma.users.findUnique({
//             where: { id: decoded.userId },
            
//         });

//         if (!user) {
//             return sendUnauthorizedResponse(res, "User not found");
//         }

//         req.user = user;
//         next();


//     } catch (error) {
//         console.error("Token Verification Error: ", error);
//         return sendUnauthorizedResponse(res, "Invalid or expired token")
//     }
// }

// export const checkAdmin = async (req, res, next) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Authentication required',
//         timestamp: new Date().toISOString(),
//       });
//     }

//     if (req.user.role !== 'admin') {
//       return res.status(403).json({
//         success: false,
//         message: 'Admin access required',
//         timestamp: new Date().toISOString(),
//       });
//     }

//     next();
//   } catch (error) {
//     return res.status(500).json({
//       success: false,
//       message: 'Error verifying admin status',
//       timestamp: new Date().toISOString(),
//     });
//   }
// };


// export const checkRole = (allowedRoles) => {
//   return async (req, res, next) => {
//     try {
//       if (!req.user) {
//         return res.status(401).json({
//           success: false,
//           message: 'Authentication required',
//           timestamp: new Date().toISOString(),
//         });
//       }

//       if (!allowedRoles.includes(req.user.role)) {
        
//         return res.status(403).json({
//           success: false,
//           message: 'Insufficient permissions',
//           timestamp: new Date().toISOString(),
//         });
//       }

//       next();
//     } catch (error) {
//       return res.status(500).json({
//         success: false,
//         message: 'Error verifying role',
//         timestamp: new Date().toISOString(),
//       });
//     }
//   };
// };

// export const requireTemporaryPassword = async (req, res, next) => {
//   try {
//     const userId = req.user.id; 


//     if (!userId) {
//       return res.status(401).json({
//         success: false,
//         message: "Authentication required"
//       });
//     }

//     const user = await prisma.users.findUnique({
//       where: { id: userId },
//       select: { 
//         id: true, 
//         isTemporaryPassword: true, 
//         email: true, 
//         username: true 
//       }
//     });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found"
//       });
//     }

//     if (!user.isTemporaryPassword) {
//       return res.status(403).json({
//         success: false,
//         message: "Password reset not required for this account"
//       });
//     }

//     // User is authenticated and has temporary password
//     req.user = user;
//     next();

//   } catch (error) {
//     console.error("Error in requireTemporaryPassword middleware:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Authentication error"
//     });
//   }
// };

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import rateLimit from 'express-rate-limit';


const prisma = new PrismaClient();

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 100 requests per windowMs
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later',
    },
    standardHeaders: true,
    legacyHeaders: false,
})

const sendUnauthorizedResponse = (res, message, additionalData = {}) => {
    return res.status(401).json({
        success: false,
        message,
        timestamp: new Date().toISOString(),
        ...additionalData,
    });
};

const extractToken = (req) => {
    let token = req.cookies?.accessToken;

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

    }
    return token;
}


export const protectRoute = async (req, res, next) => {
    try {
        const token = extractToken(req);

        if (!token) {
            return sendUnauthorizedResponse(res, "Unauthorized - No Access token provided")
        }
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
            algorithms: ['HS256'],
            maxAge: '24h'
        });
  

        if (!decoded.userId) {
            return sendUnauthorizedResponse(res, "Unauthorized - Invalid token structure")
        }


        const user = await prisma.users.findUnique({
            where: { id: decoded.userId },
            
        });

        if (!user) {
            return sendUnauthorizedResponse(res, "User not found");
        }

        req.user = user;
        next();


    } catch (error) {
        console.error("Token Verification Error: ", error);
        return sendUnauthorizedResponse(res, "Invalid or expired token")
    }
}

export const checkAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required',
        timestamp: new Date().toISOString(),
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying admin status',
      timestamp: new Date().toISOString(),
    });
  }
};


export const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          timestamp: new Date().toISOString(),
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error verifying role',
        timestamp: new Date().toISOString(),
      });
    }
  };
};

export const requireTemporaryPassword = async (req, res, next) => {
  try {
    const userId = req.user.id; 


    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        isTemporaryPassword: true, 
        email: true, 
        username: true 
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.isTemporaryPassword) {
      return res.status(403).json({
        success: false,
        message: "Password reset not required for this account"
      });
    }

    // User is authenticated and has temporary password
    req.user = user;
    next();

  } catch (error) {
    console.error("Error in requireTemporaryPassword middleware:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error"
    });
  }
};

export const attachUserIfPresent = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.substring(7) : null);
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, {
      algorithms: ['HS256'],
      maxAge: '24h'
    });
    if (!decoded?.userId) {
      return next();
    }
    const user = await prisma.users.findUnique({ where: { id: decoded.userId } });
    if (user) {
      req.user = user;
    }
    return next();
  } catch (err) {
    // Ignore token errors for optional auth
    return next();
  }
};