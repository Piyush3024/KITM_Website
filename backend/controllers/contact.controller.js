
import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";

const prisma = new PrismaClient();

export const createContact = async (req, res) => {
  try {
    const { full_name, email, phone, subject, message, inquiry_type } = req.body;

    const inquiry = await prisma.contact_inquiries.create({
      data: {
        full_name,
        email,
        phone: phone || null,
        subject: subject || null,
        message,
        inquiry_type: inquiry_type || "general",
        status: "new",
        ip_address: req.ip || null,
        user_agent: req.get("user-agent") || null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Inquiry created successfully",
      data: {
        id: encodeId(inquiry.id),
        full_name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        inquiry_type: inquiry.inquiry_type,
        status: inquiry.status,
        created_at: inquiry.created_at,
      },
    });
  } catch (error) {
    console.error("Error in create inquiry controller:", error);
    res.status(500).json({
      success: false,
      message: "Error creating inquiry",
      error: error.message,
    });
  }
};

export const readContact = async (req, res) => {
  try {
    const { id } = req.params;
    let decodedId;
    
    try {
      decodedId = decodeId(id);
    } catch (decodeError) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const inquiry = await prisma.contact_inquiries.findUnique({
      where: { id: decodedId },
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    res.json({
      success: true,
      message: "Inquiry retrieved successfully",
      data: {
        id: encodeId(inquiry.id),
        full_name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        inquiry_type: inquiry.inquiry_type,
        status: inquiry.status,
        response: inquiry.response,
        responded_at: inquiry.responded_at,
        created_at: inquiry.created_at,
        updated_at: inquiry.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in read inquiry controller:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiry",
      error: error.message,
    });
  }
};

export const getAllContacts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      status,
      inquiry_type,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (status) where.status = status;
    if (inquiry_type) where.inquiry_type = inquiry_type;

    const [inquiries, total] = await Promise.all([
      prisma.contact_inquiries.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.contact_inquiries.count({ where }),
    ]);

    res.json({
      success: true,
      message: "Inquiries retrieved successfully",
      data: inquiries.map((inquiry) => ({
        id: encodeId(inquiry.id),
        full_name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        inquiry_type: inquiry.inquiry_type,
        status: inquiry.status,
        response: inquiry.response,
        responded_at: inquiry.responded_at,
        created_at: inquiry.created_at,
        updated_at: inquiry.updated_at,
      })),
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAll inquiries controller:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiries",
      error: error.message,
    });
  }
};

export const getContactsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      status,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { inquiry_type: type };
    if (status) where.status = status;

    const [inquiries, total] = await Promise.all([
      prisma.contact_inquiries.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.contact_inquiries.count({ where }),
    ]);

    res.json({
      success: true,
      message: `Inquiries of type ${type} retrieved successfully`,
      data: inquiries.map((inquiry) => ({
        id: encodeId(inquiry.id),
        full_name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        inquiry_type: inquiry.inquiry_type,
        status: inquiry.status,

        response: inquiry.response,
        responded_at: inquiry.responded_at,
        created_at: inquiry.created_at,
        updated_at: inquiry.updated_at,
      })),
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in getByType inquiries controller:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiries by type",
      error: error.message,
    });
  }
};

export const deleteInquiry = async (req, res) => {
  try {
    const { id } = req.params;
    let decodedId;
    
    try {
      decodedId = decodeId(id);
    } catch (decodeError) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const inquiry = await prisma.contact_inquiries.findUnique({
      where: { id: decodedId },
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    await prisma.contact_inquiries.delete({
      where: { id: decodedId },
    });

    res.json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    console.error("Error in delete inquiry controller:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting inquiry",
      error: error.message,
    });
  }
};


export const updateInquiryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    let decodedId;
    
    try {
      decodedId = decodeId(id);
    } catch (decodeError) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const inquiry = await prisma.contact_inquiries.findUnique({
      where: { id: decodedId },
    });

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
      });
    }

    const updatedInquiry = await prisma.contact_inquiries.update({
      where: { id: decodedId },
      data: {
        status,
        updated_at: new Date(),
      },
      
    });

    res.json({
      success: true,
      message: "Inquiry status updated successfully",
      data: {
        id: encodeId(updatedInquiry.id),
        full_name: updatedInquiry.full_name,
        email: updatedInquiry.email,
        phone: updatedInquiry.phone,
        subject: updatedInquiry.subject,
        message: updatedInquiry.message,
        inquiry_type: updatedInquiry.inquiry_type,
        status: updatedInquiry.status,
        response: updatedInquiry.response,
        responded_at: updatedInquiry.responded_at,
        created_at: updatedInquiry.created_at,
        updated_at: updatedInquiry.updated_at,
      },
    });
  } catch (error) {
    console.error("Error in updateInquiryStatus controller:", error);
    res.status(500).json({
      success: false,
      message: "Error updating inquiry status",
      error: error.message,
    });
  }
};

export const bulkDeleteInquiries = async (req, res) => {
  try {
    const { ids, status, inquiry_type } = req.body;

    if (!ids && !status && !inquiry_type) {
      return res.status(400).json({
        success: false,
        message: "At least one filter (ids, status, or inquiry_type) is required",
      });
    }

    const where = {};
    if (ids) {
      try {
        const decodedIds = ids.map(id => {
          try {
            return decodeId(id);
          } catch (decodeError) {
            console.warn(`Failed to decode ID: ${id}`, decodeError.message);
            return null;
          }
        }).filter(id => id !== null);

        if (decodedIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: "All provided IDs are invalid",
          });
        }

        where.id = { in: decodedIds };
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: "Invalid ID format provided",
        });
      }
    }
    if (status) {
      where.status = status;
    }
    if (inquiry_type) {
      where.inquiry_type = inquiry_type;
    }

    const inquiries = await prisma.contact_inquiries.findMany({
      where,
      select: { id: true },
    });

    if (!inquiries.length) {
      return res.status(404).json({
        success: false,
        message: "No inquiries found matching the criteria",
      });
    }

    await prisma.contact_inquiries.deleteMany({
      where,
    });

    res.json({
      success: true,
      message: "Inquiries deleted successfully",
      data: { deletedCount: inquiries.length },
    });
  } catch (error) {
    console.error("Error in bulkDeleteInquiries controller:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting inquiries",
      error: error.message,
    });
  }
};

export const searchInquiries = async (req, res) => {
  try {
    const {
      query,
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      status,
      inquiry_type,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (query) {
      where.OR = [
        { full_name: { contains: query } },
        { email: { contains: query } },
        { subject: { contains: query } },
        { message: { contains: query } },
      ];
    }
    if (status) where.status = status;
    if (inquiry_type) where.inquiry_type = inquiry_type;

    const [inquiries, total] = await Promise.all([
      prisma.contact_inquiries.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        
      }),
      prisma.contact_inquiries.count({ where }),
    ]);

    res.json({
      success: true,
      message: "Inquiries retrieved successfully",
      data: inquiries.map((inquiry) => ({
        id: encodeId(inquiry.id),
        full_name: inquiry.full_name,
        email: inquiry.email,
        phone: inquiry.phone,
        subject: inquiry.subject,
        message: inquiry.message,
        inquiry_type: inquiry.inquiry_type,
        status: inquiry.status,
        response: inquiry.response,
        responded_at: inquiry.responded_at,
        created_at: inquiry.created_at,
        updated_at: inquiry.updated_at,
      })),
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error in searchInquiries controller:", error);
    res.status(500).json({
      success: false,
      message: "Error searching inquiries",
      error: error.message,
    });
  }
};

export const getInquiryStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const [byType, byStatus, byMonth] = await Promise.all([
      prisma.contact_inquiries.groupBy({
        by: ["inquiry_type"],
        where,
        _count: { id: true },
      }),
      prisma.contact_inquiries.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
      prisma.contact_inquiries.groupBy({
        by: ["created_at"],
        where,
        _count: { id: true },
        orderBy: { created_at: "asc" },
      }),
    ]);

    const monthlyStats = byMonth.reduce((acc, curr) => {
      const month = new Date(curr.created_at).toISOString().slice(0, 7); // YYYY-MM
      acc[month] = (acc[month] || 0) + curr._count.id;
      return acc;
    }, {});

    res.json({
      success: true,
      message: "Inquiry statistics retrieved successfully",
      data: {
        byType: byType.map((item) => ({
          inquiry_type: item.inquiry_type,
          count: item._count.id,
        })),
        byStatus: byStatus.map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
        byMonth: Object.entries(monthlyStats).map(([month, count]) => ({
          month,
          count,
        })),
      },
    });
  } catch (error) {
    console.error("Error in getInquiryStatistics controller:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving inquiry statistics",
      error: error.message,
    });
  }
};