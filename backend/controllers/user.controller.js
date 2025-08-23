// controllers/user.controller.js
import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";

const prisma = new PrismaClient();

/**
 * Get all users
 */
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isTemporaryPassword: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    const formattedUsers = users.map((user) => ({
      id: encodeId(user.id),
      username: user.username,
      email: user.email,
      role: user.role,
      isTemporaryPassword: user.isTemporaryPassword,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }));

    res.status(200).json({
      success: true,
      data: formattedUsers,
    });
  } catch (error) {
    console.error("Error in getUsers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = decodeId(id);

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isTemporaryPassword: true,
        last_login: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: encodeId(user.id),
        username: user.username,
        email: user.email,
        role: user.role,
        isTemporaryPassword: user.isTemporaryPassword,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user",
    });
  }
};

/**
 * Update user role (Admin only)
 */
export const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'author'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid or missing role. Valid roles: ${validRoles.join(', ')}`,
      });
    }

    const userId = decodeId(id);

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      data: {
        id: encodeId(updatedUser.id),
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in updateRole:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user role",
    });
  }
};

/**
 * Update user details (Admin or self)
 */
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email } = req.body;

    const userId = decodeId(id);

    // Fetch current user
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Optional: Prevent email/username duplication
    if (email) {
      const existingEmailUser = await prisma.users.findFirst({
        where: { email, id: { not: userId } },
      });
      if (existingEmailUser) {
        return res.status(409).json({
          success: false,
          message: "Email already in use by another user",
        });
      }
    }

    if (username) {
      const existingUsernameUser = await prisma.users.findFirst({
        where: { username, id: { not: userId } },
      });
      if (existingUsernameUser) {
        return res.status(409).json({
          success: false,
          message: "Username already taken",
        });
      }
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        ...(username && { username }),
        ...(email && { email }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updated_at: true,
      },
    });

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        id: encodeId(updatedUser.id),
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in updateUser:", error);
    res.status(500).json({
      success: false,
      message: "Error updating user",
    });
  }
};

/**
 * Get all admin users
 */
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await prisma.users.findMany({
      where: { role: 'admin' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    const formattedAdmins = admins.map((admin) => ({
      id: encodeId(admin.id),
      username: admin.username,
      email: admin.email,
      role: admin.role,
      createdAt: admin.created_at,
      updatedAt: admin.updated_at,
    }));

    res.status(200).json({
      success: true,
      count: formattedAdmins.length,
      data: formattedAdmins,
    });
  } catch (error) {
    console.error("Error in getAllAdmins:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admins",
    });
  }
};

/**
 * Get all authors
 */
export const getAllAuthors = async (req, res) => {
  try {
    const authors = await prisma.users.findMany({
      where: { role: 'author' },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });

    const formattedAuthors = authors.map((author) => ({
      id: encodeId(author.id),
      username: author.username,
      email: author.email,
      role: author.role,
      createdAt: author.created_at,
      updatedAt: author.updated_at,
    }));

    res.status(200).json({
      success: true,
      count: formattedAuthors.length,
      data: formattedAuthors,
    });
  } catch (error) {
    console.error("Error in getAllAuthors:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching authors",
    });
  }
};

/**
 * Delete user
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = decodeId(id);

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await prisma.users.delete({
      where: { id: userId },
    });

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error in deleteUser:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error.message,
    });
  }
};