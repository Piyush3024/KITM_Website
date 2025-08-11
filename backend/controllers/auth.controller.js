
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken"
import { redis } from "../lib/redis.js";
import bcrypt from "bcrypt";
import { encodeId, decodeId } from "../lib/secure.js";
import { sendEmail, emailTemplates, generateTemporaryPassword } from '../lib/emailConfig.js';

const prisma = new PrismaClient();

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "30m",
  });

  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken }


}

const storeRefreshToken = async (userId, refreshToken) => {
  await redis.set(
    `refresh_token:${userId}`,
    refreshToken,
    "EX",
    7 * 24 * 60 * 60

  )
}

const setCookies = (res, accessToken, refreshToken) => {
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 15 * 60 * 1000,
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

export const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const loginIdentifier = email || username;
    
   

    // Search for user by either email or username
    const user = await prisma.users.findFirst({
      where: {
        OR: [
          { email: loginIdentifier },
          { username: loginIdentifier }
        ]
      }
    })
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      })
    }
   

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      })
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    await storeRefreshToken(user.id, refreshToken);
    setCookies(res, accessToken, refreshToken);

    if (user.isTemporaryPassword) {
      return res.json({
        success: true,
        requiresPasswordReset: true,
        message: "Please reset your password to continue",
        data: {
          id: encodeId(user.id),
          email: user.email,
          username: user.username,
          role: user.role,
          isTemporaryPassword: true
        },
      });
    }

    res.json({
      success: true,
      message: "Login Successfully",
      data: {
        id: encodeId(user.id),
        email: user.email,
        username: user.username,
        role: user.role
      },
    });

  } catch (error) {
    console.error("Error in the login controller: ", error)
    return res.status(500).json({
      success: false,
      message: "Error during login",
      error: error.message
    })
  }
}

export const register = async (req, res) => {
  try {
    const { username, email, role } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: "Username, and  email are required"
      })
    }

    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email or username already exists"
      })
    }

    const temporaryPassword = generateTemporaryPassword(12);
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.users.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: role || "author",
        isTemporaryPassword: true,
      },
    });

    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/admin/login`;

    // Prepare email template data
    const emailTemplate = emailTemplates.authorRegistrationEmail(
      username,
      temporaryPassword,
      loginUrl,
      role 
    );

    // Send welcome email with credentials
    try {
      const emailResult = await sendEmail({
        to: email,
        subject: emailTemplate.subject,
        htmlContent: emailTemplate.htmlContent
      });

    } catch (emailError) {
      console.error('Failed to send registration email:', emailError);

    }
    res.status(201).json({
      success: true,
      message: "User registered.",
      data: {
        id: encodeId(user.id),
        email: user.email,
        username: user.username,
        role: user.role
      },
    });

  } catch (error) {
    console.error("Error in the register controller: ", error)
    return res.status(500).json({
      success: false,
      message: "Error during registration",
      error: error.message
    })
  }
}

export const setPassword = async (req, res) => {
  try {
    const userId = req.user.id; 

  const { newPassword } = req.body;
if (!newPassword) {
  return res.status(400).json({
    success: false,
    message: "New password is required"
  });
}
    // Get user and verify they have temporary password
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }


    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await prisma.users.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        isTemporaryPassword: false,
        updated_at: new Date()
      }
    });

    res.json({
      success: true,
      message: "Password reset successfully. You can now use your new password.",
      data: {
        id: encodeId(user.id),
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Error in resetPassword controller:", error);
    return res.status(500).json({
      success: false,
      message: "Error during password reset",
      error: error.message
    });
  }
}

export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    let userId = null;

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        userId = decoded.userId;

        // Remove refresh token from Redis
        await redis.del(`refresh_token:${userId}`);

      } catch (tokenError) {
        console.error('Token verification failed during logout:', tokenError);
      }
    }

    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred during logout',
      ...(process.env.NODE_ENV === 'development' && { error: error.message }),
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
   const { email } = req.body;
if (!email) {
  return res.status(400).json({
    success: false,
    message: "Email is required",
  });
}

    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate reset token (15 minutes expiry)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.PASSWORD_RESET_SECRET,
      { expiresIn: "15m" }
    );

    // Store reset token in database
    await prisma.users.update({
      where: { id: user.id },
      data: { 
        password_reset_token: resetToken,
        password_reset_expires: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      },
    });

    // Create reset link
    const resetLink = `${process.env.CLIENT_URL}/api/auth/reset-password/${resetToken}`;

    // Send password reset email
    try {
      const emailContent = emailTemplates.passwordResetEmail(user.username, resetLink);
      await sendEmail({
        to: user.email,
        ...emailContent,
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send password reset email",
      });
    }

    res.json({
      success: true,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    console.error("Error in forgotPassword controller:", error);
    res.status(500).json({
      success: false,
      message: "Server error while processing forgot password request",
      error: error.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
  const { password } = req.body;
if (!password) {
  return res.status(400).json({
    success: false,
    message: "Password is required",
  });
}

    // Verify reset token
    const decoded = jwt.verify(token, process.env.PASSWORD_RESET_SECRET);


    // Find user with valid reset token
    const user = await prisma.users.findFirst({
      where: {
        id: decoded.userId,
        password_reset_token: token,
        password_reset_expires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error in resetPassword controller:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(400).json({
        success: false,
        message: "Reset token has expired. Please request a new one.",
      });
    }
    res.status(400).json({
      success: false,
      message: "Invalid reset token",
    });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not provided"
      });
    }

    // Verify the refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (tokenError) {
      console.error('Refresh token verification failed:', tokenError);
      
      // Clear invalid cookies
      res.clearCookie('accessToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || undefined,
      });
      
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN || undefined,
      });

      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token"
      });
    }

    // Check if refresh token exists in Redis
    const storedRefreshToken = await redis.get(`refresh_token:${decoded.userId}`);
    
    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token"
      });
    }

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        is_active: true,
        isTemporaryPassword: true
      }
    });

    if (!user) {
      // Remove invalid refresh token from Redis
      await redis.del(`refresh_token:${decoded.userId}`);
      
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.is_active) {
      // Remove refresh token for inactive user
      await redis.del(`refresh_token:${decoded.userId}`);
      
      return res.status(401).json({
        success: false,
        message: "Account is inactive"
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id);

    // Store new refresh token in Redis
    await storeRefreshToken(user.id, newRefreshToken);

    // Set new cookies
    setCookies(res, accessToken, newRefreshToken);

    // Update user's last login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        id: encodeId(user.id),
        email: user.email,
        username: user.username,
        role: user.role,
        isTemporaryPassword: user.isTemporaryPassword
      }
    });

  } catch (error) {
    console.error("Error in refresh token controller:", error);
    return res.status(500).json({
      success: false,
      message: "Error during token refresh",
      error: error.message
    });
  }
};


export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isTemporaryPassword: true,
        is_active: true,
        last_login: true,
        created_at: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is inactive"
      });
    }

    res.json({
      success: true,
      message: "User profile retrieved successfully",
      data: {
        id: encodeId(user.id),
        email: user.email,
        username: user.username,
        role: user.role,
        isTemporaryPassword: user.isTemporaryPassword,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error("Error in getMe controller:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving user profile",
      error: error.message
    });
  }
};