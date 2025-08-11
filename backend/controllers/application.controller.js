import { PrismaClient } from "@prisma/client";
import { encodeId, decodeId } from "../lib/secure.js";
import { sendEmail, emailTemplates } from "../config/emailConfig.js";
import { handleLocalFileUploads, deleteFiles } from "../middleware/multer.middleware.js";

const prisma = new PrismaClient();

// Generate unique application number
const generateApplicationNumber = async () => {
  const currentYear = new Date().getFullYear();
  const prefix = `APP${currentYear}`;
  
  // Get the last application for this year
  const lastApplication = await prisma.applications.findFirst({
    where: {
      application_number: {
        startsWith: prefix
      }
    },
    orderBy: {
      application_number: 'desc'
    }
  });

  let sequence = 1;
  if (lastApplication) {
    const lastSequence = parseInt(lastApplication.application_number.substring(prefix.length));
    sequence = lastSequence + 1;
  }

  return `${prefix}${sequence.toString().padStart(4, '0')}`;
};

// Create new application (Public endpoint - no auth required)
export const createApplication = async (req, res) => {
  try {
    const {
      // Personal Information
      full_name,
      date_of_birth,
      gender,
      nationality = "Nepali",
      religion,
      blood_group,
      marital_status = "single",
      
      // Contact Information
      phone,
      email,
      permanent_address,
      temporary_address,
      
      // Family Information
      father_name,
      father_phone,
      mother_name,
      mother_phone,
      
      // Program Information
      program_applied,
      
      // Entrance Test Information (student fills these)
      entrance_test_rollNumber,
      entrance_test_date,
      entrance_test_score,
      
      // Education Records
      education_records = [],
      
      // Status (draft by default)
      status = "draft",
      
      // Agreements
      declaration_agreed = false,
      terms_agreed = false
    } = req.body;

    // Generate application number
    const application_number = await generateApplicationNumber();

    // Handle file uploads
    const uploadedFiles = handleLocalFileUploads(req);

    // Create application with transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the main application
      const application = await tx.applications.create({
        data: {
          application_number,
          full_name,
          date_of_birth: new Date(date_of_birth),
          gender,
          nationality,
          religion,
          blood_group,
          marital_status,
          phone,
          email,
          permanent_address,
          temporary_address,
          father_name,
          father_phone,
          mother_name,
          mother_phone,
          program_applied,
          entrance_test_rollNumber,
          entrance_test_date: entrance_test_date ? new Date(entrance_test_date) : null,
          entrance_test_score: entrance_test_score ? parseFloat(entrance_test_score) : null,
          status,
          declaration_agreed,
          terms_agreed,
        },
      });

      // Create education records if provided
      if (education_records && education_records.length > 0) {
        const educationData = education_records.map(record => ({
          application_id: application.id,
          level: record.level,
          board: record.board,
          institution: record.institution,
          year_completed: record.year_completed ? parseInt(record.year_completed) : null,
          division: record.division,
          percentage: record.percentage ? parseFloat(record.percentage) : null,
          cgpa: record.cgpa ? parseFloat(record.cgpa) : null,
        }));

        await tx.education_records.createMany({
          data: educationData,
        });
      }

      // Handle document uploads if any files were uploaded
      if (uploadedFiles && Object.keys(uploadedFiles).length > 0) {
        const documentData = [];
        
        for (const [fieldName, filePath] of Object.entries(uploadedFiles)) {
          // Map field names to document types
          const documentTypeMap = {
            photo: 'photo',
            citizenship: 'citizenship',
            slc_certificate: 'slc_certificate',
            plus2_certificate: 'plus2_certificate',
            plus2_transcript: 'plus2_transcript',
            bachelor_certificate: 'bachelor_certificate',
            bachelor_transcript: 'bachelor_transcript',
            character_certificate: 'character_certificate',
            migration_certificate: 'migration_certificate',
            medical_certificate: 'medical_certificate',
            other: 'other'
          };

          const documentType = documentTypeMap[fieldName] || 'other';
          
          // Get file info from request
          const fileInfo = req.files[fieldName] ? req.files[fieldName][0] : null;
          
          if (fileInfo) {
            documentData.push({
              application_id: application.id,
              document_type: documentType,
              original_name: fileInfo.originalname,
              file_name: fileInfo.filename,
              file_path: filePath,
              file_size: fileInfo.size,
              mime_type: fileInfo.mimetype,
              is_required: ['photo', 'citizenship', 'slc_certificate'].includes(documentType),
              is_submitted: status === 'submitted',
            });
          }
        }

        if (documentData.length > 0) {
          await tx.application_documents.createMany({
            data: documentData,
          });
        }
      }

      // Create status history entry
      await tx.application_status_history.create({
        data: {
          application_id: application.id,
          from_status: null,
          to_status: status,
          reason: "Application created",
          notes: `Application ${application_number} created`,
        },
      });

      return application;
    });

    // Send confirmation email if application is submitted
    if (status === 'submitted') {
      try {
        await sendEmail({
          to: email,
          subject: `Application Submitted - ${application_number}`,
          htmlContent: applicationSubmittedEmailTemplate(full_name, application_number, program_applied)
        });
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the application creation if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: status === 'draft' ? 'Application draft saved successfully' : 'Application submitted successfully',
      data: {
        id: encodeId(result.id),
        application_number: result.application_number,
        full_name: result.full_name,
        email: result.email,
        phone: result.phone,
        program_applied: result.program_applied,
        status: result.status,
        created_at: result.created_at,
      },
    });

  } catch (error) {
    console.error("Error in createApplication controller:", error);
    
    // Clean up uploaded files if application creation fails
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      await deleteFiles(files.map(file => file.path));
    }

    res.status(500).json({
      success: false,
      message: "Error creating application",
      error: error.message,
    });
  }
};

// Get application by ID (Admin/Author only)
export const getApplicationById = async (req, res) => {
  try {
    const { id } = req.params;
    let decodedId;
    
    try {
      decodedId = decodeId(id);
    } catch (decodeError) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const application = await prisma.applications.findUnique({
      where: { id: decodedId },
      include: {
        education_records: {
          orderBy: { level: 'asc' }
        },
        documents: {
          orderBy: { document_type: 'asc' }
        },
        status_history: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true
              }
            }
          },
          orderBy: { created_at: 'desc' }
        },
        reviewer: {
          select: {
            id: true,
            username: true,
            full_name: true
          }
        }
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Generate file URLs for documents
    const documentsWithUrls = application.documents.map(doc => ({
      ...doc,
      id: encodeId(doc.id),
      file_url: req.protocol + '://' + req.get('host') + '/' + doc.file_path.replace(/\\/g, '/'),
      verified_by: doc.verified_by ? encodeId(doc.verified_by) : null
    }));

    // Format education records
    const educationRecords = application.education_records.map(record => ({
      ...record,
      id: encodeId(record.id)
    }));

    // Format status history
    const statusHistory = application.status_history.map(history => ({
      ...history,
      id: encodeId(history.id),
      changed_by: history.changed_by ? encodeId(history.changed_by) : null,
      user: history.user ? {
        ...history.user,
        id: encodeId(history.user.id)
      } : null
    }));

    res.json({
      success: true,
      message: "Application retrieved successfully",
      data: {
        ...application,
        id: encodeId(application.id),
        reviewed_by: application.reviewed_by ? encodeId(application.reviewed_by) : null,
        reviewer: application.reviewer ? {
          ...application.reviewer,
          id: encodeId(application.reviewer.id)
        } : null,
        education_records: educationRecords,
        documents: documentsWithUrls,
        status_history: statusHistory,
      },
    });

  } catch (error) {
    console.error("Error in getApplicationById controller:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving application",
      error: error.message,
    });
  }
};

// Get all applications with filtering and pagination (Admin/Author only)
export const getAllApplications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_at",
      sortOrder = "desc",
      status,
      program_applied,
      search,
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    
    if (status) where.status = status;
    if (program_applied) where.program_applied = program_applied;
    
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { application_number: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    // Add soft delete filter
    where.deleted_at = null;

    const [applications, total] = await Promise.all([
      prisma.applications.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          education_records: {
            select: {
              level: true,
              institution: true,
              percentage: true,
              cgpa: true
            }
          },
          documents: {
            select: {
              document_type: true,
              is_verified: true,
              is_submitted: true
            }
          },
          reviewer: {
            select: {
              id: true,
              username: true,
              full_name: true
            }
          }
        },
      }),
      prisma.applications.count({ where }),
    ]);

    const formattedApplications = applications.map(app => ({
      id: encodeId(app.id),
      application_number: app.application_number,
      full_name: app.full_name,
      email: app.email,
      phone: app.phone,
      gender: app.gender,
      program_applied: app.program_applied,
      status: app.status,
      entrance_test_rollNumber: app.entrance_test_rollNumber,
      entrance_test_date: app.entrance_test_date,
      entrance_test_score: app.entrance_test_score,
      declaration_agreed: app.declaration_agreed,
      terms_agreed: app.terms_agreed,
      reviewed_by: app.reviewed_by ? encodeId(app.reviewed_by) : null,
      reviewed_at: app.reviewed_at,
      created_at: app.created_at,
      reviewer: app.reviewer ? {
        ...app.reviewer,
        id: encodeId(app.reviewer.id)
      } : null,
      education_summary: app.education_records.length,
      documents_summary: {
        total: app.documents.length,
        verified: app.documents.filter(doc => doc.is_verified).length,
        submitted: app.documents.filter(doc => doc.is_submitted).length
      }
    }));

    res.json({
      success: true,
      message: "Applications retrieved successfully",
      data: formattedApplications,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: skip + take < total,
        hasPrev: parseInt(page) > 1
      },
    });

  } catch (error) {
    console.error("Error in getAllApplications controller:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving applications",
      error: error.message,
    });
  }
};

// Update application status (Admin/Author only)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason, notes } = req.body;
    const userId = req.user.id; // From auth middleware
    
    let decodedId;
    try {
      decodedId = decodeId(id);
    } catch (decodeError) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const application = await prisma.applications.findUnique({
      where: { id: decodedId },
      select: {
        id: true,
        application_number: true,
        full_name: true,
        email: true,
        status: true,
        program_applied: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Update application within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update application
      const updatedApplication = await tx.applications.update({
        where: { id: decodedId },
        data: {
          status,
          reviewed_by: userId,
          reviewed_at: new Date(),
          rejection_reason: status === 'rejected' ? reason : null
        },
      });

      // Create status history entry
      await tx.application_status_history.create({
        data: {
          application_id: decodedId,
          from_status: application.status,
          to_status: status,
          changed_by: userId,
          reason,
          notes,
        },
      });

      return updatedApplication;
    });

    // Send status update email
    try {
      await sendEmail({
        to: application.email,
        subject: `Application Status Update - ${application.application_number}`,
        htmlContent: applicationStatusUpdateEmailTemplate(
          application.full_name,
          application.application_number,
          application.program_applied,
          application.status,
          status,
          reason
        )
      });
    } catch (emailError) {
      console.error('Error sending status update email:', emailError);
    }

    res.json({
      success: true,
      message: "Application status updated successfully",
      data: {
        id: encodeId(result.id),
        application_number: result.application_number,
        status: result.status,
        reviewed_at: result.reviewed_at,
      },
    });

  } catch (error) {
    console.error("Error in updateApplicationStatus controller:", error);
    res.status(500).json({
      success: false,
      message: "Error updating application status",
      error: error.message,
    });
  }
};

// Update application (Admin/Author only) - for editing application details
export const updateApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;
    
    let decodedId;
    try {
      decodedId = decodeId(id);
    } catch (decodeError) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const application = await prisma.applications.findUnique({
      where: { id: decodedId }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Prepare update data
    const {
      education_records,
      documents,
      status_change,
      ...applicationData
    } = updateData;

    // Handle date conversions
    if (applicationData.date_of_birth) {
      applicationData.date_of_birth = new Date(applicationData.date_of_birth);
    }
    if (applicationData.entrance_test_date) {
      applicationData.entrance_test_date = new Date(applicationData.entrance_test_date);
    }
    if (applicationData.entrance_test_score) {
      applicationData.entrance_test_score = parseFloat(applicationData.entrance_test_score);
    }

    // Update within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update main application
      const updatedApplication = await tx.applications.update({
        where: { id: decodedId },
        data: {
          ...applicationData,
          reviewed_by: userId,
          reviewed_at: new Date()
        },
      });

      // Update education records if provided
      if (education_records && Array.isArray(education_records)) {
        // Delete existing records
        await tx.education_records.deleteMany({
          where: { application_id: decodedId }
        });

        // Create new records
        if (education_records.length > 0) {
          const educationData = education_records.map(record => ({
            application_id: decodedId,
            level: record.level,
            board: record.board,
            institution: record.institution,
            year_completed: record.year_completed ? parseInt(record.year_completed) : null,
            division: record.division,
            percentage: record.percentage ? parseFloat(record.percentage) : null,
            cgpa: record.cgpa ? parseFloat(record.cgpa) : null,
          }));

          await tx.education_records.createMany({
            data: educationData,
          });
        }
      }

      // Create admin note in status history
      await tx.application_status_history.create({
        data: {
          application_id: decodedId,
          from_status: application.status,
          to_status: application.status,
          changed_by: userId,
          reason: "Application details updated by admin",
          notes: `Application updated: ${Object.keys(applicationData).join(', ')}`
        },
      });

      return updatedApplication;
    });

    res.json({
      success: true,
      message: "Application updated successfully",
      data: {
        id: encodeId(result.id),
        application_number: result.application_number,
        full_name: result.full_name,
        status: result.status,
        updated_at: result.updated_at || new Date()
      },
    });

  } catch (error) {
    console.error("Error in updateApplication controller:", error);
    res.status(500).json({
      success: false,
      message: "Error updating application",
      error: error.message,
    });
  }
};

// Soft delete application (Admin/Author only)
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;
    let decodedId;
    
    try {
      decodedId = decodeId(id);
    } catch (decodeError) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const application = await prisma.applications.findUnique({
      where: { id: decodedId },
      include: {
        documents: true
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    // Soft delete the application
    await prisma.applications.update({
      where: { id: decodedId },
      data: {
        deleted_at: new Date()
      }
    });

    res.json({
      success: true,
      message: "Application deleted successfully",
    });

  } catch (error) {
    console.error("Error in deleteApplication controller:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting application",
      error: error.message,
    });
  }
};

// Get application statistics (Admin/Author only)
export const getApplicationStatistics = async (req, res) => {
  try {
    const { startDate, endDate, program } = req.query;

    const where = {
      deleted_at: null
    };
    
    if (startDate && endDate) {
      where.created_at = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (program) {
      where.program_applied = program;
    }

    const [
      totalApplications,
      statusStats,
      programStats,
      monthlyStats,
      genderStats
    ] = await Promise.all([
      prisma.applications.count({ where }),
      prisma.applications.groupBy({
        by: ["status"],
        where,
        _count: { id: true },
      }),
      prisma.applications.groupBy({
        by: ["program_applied"],
        where,
        _count: { id: true },
      }),
      prisma.applications.groupBy({
        by: ["created_at"],
        where,
        _count: { id: true },
      }),
      prisma.applications.groupBy({
        by: ["gender"],
        where,
        _count: { id: true },
      })
    ]);

    // Process monthly stats
    const monthlyData = monthlyStats.reduce((acc, curr) => {
      const month = new Date(curr.created_at).toISOString().slice(0, 7);
      acc[month] = (acc[month] || 0) + curr._count.id;
      return acc;
    }, {});

    res.json({
      success: true,
      message: "Application statistics retrieved successfully",
      data: {
        overview: {
          total_applications: totalApplications,
          date_range: startDate && endDate ? { startDate, endDate } : null,
          program_filter: program || null
        },
        by_status: statusStats.map(item => ({
          status: item.status,
          count: item._count.id,
          percentage: ((item._count.id / totalApplications) * 100).toFixed(2)
        })),
        by_program: programStats.map(item => ({
          program: item.program_applied,
          count: item._count.id,
          percentage: ((item._count.id / totalApplications) * 100).toFixed(2)
        })),
        by_gender: genderStats.map(item => ({
          gender: item.gender,
          count: item._count.id,
          percentage: ((item._count.id / totalApplications) * 100).toFixed(2)
        })),
        monthly_trend: Object.entries(monthlyData)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => a.month.localeCompare(b.month))
      },
    });

  } catch (error) {
    console.error("Error in getApplicationStatistics controller:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving application statistics",
      error: error.message,
    });
  }
};

// Bulk operations (Admin/Author only)
export const bulkUpdateApplications = async (req, res) => {
  try {
    const { ids, action, status, reason } = req.body;
    const userId = req.user.id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Application IDs are required",
      });
    }

    // Decode IDs
    const decodedIds = [];
    for (const id of ids) {
      try {
        decodedIds.push(decodeId(id));
      } catch (decodeError) {
        return res.status(400).json({
          success: false,
          message: `Invalid ID format: ${id}`,
        });
      }
    }

    // Get applications
    const applications = await prisma.applications.findMany({
      where: {
        id: { in: decodedIds },
        deleted_at: null
      },
      select: {
        id: true,
        application_number: true,
        full_name: true,
        email: true,
        status: true,
        program_applied: true
      }
    });

    if (applications.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No applications found",
      });
    }

    let updateCount = 0;

    if (action === 'updateStatus' && status) {
      // Update status for all applications
      await prisma.$transaction(async (tx) => {
        for (const app of applications) {
          await tx.applications.update({
            where: { id: app.id },
            data: {
              status,
              reviewed_by: userId,
              reviewed_at: new Date(),
              rejection_reason: status === 'rejected' ? reason : null
            }
          });

          await tx.application_status_history.create({
            data: {
              application_id: app.id,
              from_status: app.status,
              to_status: status,
              changed_by: userId,
              reason: reason || `Bulk status update to ${status}`,
              notes: `Bulk operation performed by admin`
            }
          });

          updateCount++;
        }
      });

      // Send bulk status update emails
      for (const app of applications) {
        try {
          await sendEmail({
            to: app.email,
            subject: `Application Status Update - ${app.application_number}`,
            htmlContent: applicationStatusUpdateEmailTemplate(
              app.full_name,
              app.application_number,
              app.program_applied,
              app.status,
              status,
              reason
            )
          });
        } catch (emailError) {
          console.error(`Error sending email to ${app.email}:`, emailError);
        }
      }

    } else if (action === 'delete') {
      // Soft delete applications
      await prisma.applications.updateMany({
        where: { id: { in: decodedIds } },
        data: { deleted_at: new Date() }
      });
      updateCount = applications.length;
    }

    res.json({
      success: true,
      message: `Bulk operation completed successfully`,
      data: {
        processed: updateCount,
        total_requested: ids.length,
        action: action
      },
    });

  } catch (error) {
    console.error("Error in bulkUpdateApplications controller:", error);
    res.status(500).json({
      success: false,
      message: "Error performing bulk operation",
      error: error.message,
    });
  }
};

// Email templates for applications
const applicationSubmittedEmailTemplate = (fullName, applicationNumber, program) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
    <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">
        Kantipur Institute of Technology & Management
      </h1>
      <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 14px;">
        Application Submitted Successfully
      </p>
    </div>
    
    <div style="background-color: white; padding: 40px 30px;">
      <h2 style="color: #1e3c72; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        ✅ Application Submitted Successfully!
      </h2>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Dear <strong>${fullName}</strong>,
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Thank you for submitting your application to KITM. We have successfully received your application for the <strong>${program}</strong> program.
      </p>
      
      <div style="background-color: #f8f9ff; border: 2px solid #e3f2fd; border-radius: 8px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #1e3c72; margin: 0 0 15px 0; font-size: 18px;">
          📋 Application Details
        </h3>
        <div style="background-color: white; border-radius: 6px; padding: 20px; border-left: 4px solid #2a5298;">
          <p style="margin: 0 0 10px 0; color: #333;">
            <strong>Application Number:</strong> <code style="background-color: #f1f3f4; padding: 4px 8px; border-radius: 4px; color: #1e3c72; font-weight: 600;">${applicationNumber}</code>
          </p>
          <p style="margin: 0 0 10px 0; color: #333;">
            <strong>Program Applied:</strong> ${program}
          </p>
          <p style="margin: 0; color: #333;">
            <strong>Status:</strong> <span style="background-color: #e8f5e8; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-weight: 600;">Submitted</span>
          </p>
        </div>
      </div>
      
      <div style="background-color: #e7f3ff; border: 2px solid #b3d9ff; border-radius: 8px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #0066cc; margin: 0 0 15px 0; font-size: 18px;">
          📋 What's Next?
        </h3>
        <ul style="color: #333; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Our admission team will review your application</li>
          <li>We may contact you for additional documents or information</li>
          <li>You'll receive updates about your application status via email</li>
          <li>Keep checking your email for entrance test schedules</li>
        </ul>
      </div>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        If you have any questions, please contact our admission office at <strong>admission@kitm.edu.np</strong> or call us at <strong>+977-9803864719</strong>.
      </p>
    </div>
    
    <div style="background-color: #f1f3f4; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
        <strong>Kantipur Institute of Technology & Management</strong><br>
        Excellence in IT Education & Professional Training<br>
        Affiliated with Rajarahi Janak University
      </p>
      <p style="color: #888; margin: 0; font-size: 12px;">
        📧 <a href="mailto:info@kitm.edu.np" style="color: #1e3c72; text-decoration: none;">info@kitm.edu.np</a> | 
        📱 +977-9803864719, +977-9851137540 | 
        🌐 <a href="https://kitm.edu.np" style="color: #1e3c72; text-decoration: none;">kitm.edu.np</a>
      </p>
    </div>
  </div>
`;

const applicationStatusUpdateEmailTemplate = (fullName, applicationNumber, program, oldStatus, newStatus, reason) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
    <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">
        Kantipur Institute of Technology & Management
      </h1>
      <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 14px;">
        Application Status Update
      </p>
    </div>
    
    <div style="background-color: white; padding: 40px 30px;">
      <h2 style="color: #1e3c72; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
        📄 Application Status Updated
      </h2>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Dear <strong>${fullName}</strong>,
      </p>
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        Your application status has been updated. Please find the details below:
      </p>
      
      <div style="background-color: #f8f9ff; border: 2px solid #e3f2fd; border-radius: 8px; padding: 25px; margin: 25px 0;">
        <h3 style="color: #1e3c72; margin: 0 0 15px 0; font-size: 18px;">
          📋 Application Details
        </h3>
        <div style="background-color: white; border-radius: 6px; padding: 20px; border-left: 4px solid #2a5298;">
          <p style="margin: 0 0 10px 0; color: #333;">
            <strong>Application Number:</strong> <code style="background-color: #f1f3f4; padding: 4px 8px; border-radius: 4px; color: #1e3c72; font-weight: 600;">${applicationNumber}</code>
          </p>
          <p style="margin: 0 0 10px 0; color: #333;">
            <strong>Program Applied:</strong> ${program}
          </p>
          <p style="margin: 0 0 10px 0; color: #333;">
            <strong>Previous Status:</strong> <span style="background-color: #f1f3f4; color: #666; padding: 4px 8px; border-radius: 4px;">${oldStatus}</span>
          </p>
          <p style="margin: 0; color: #333;">
            <strong>Current Status:</strong> <span style="background-color: ${getStatusColor(newStatus)}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${newStatus.toUpperCase()}</span>
          </p>
          ${reason ? `
          <div style="margin-top: 15px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              <strong>Note:</strong> ${reason}
            </p>
          </div>
          ` : ''}
        </div>
      </div>
      
      ${getStatusSpecificContent(newStatus)}
      
      <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
        If you have any questions about this update, please contact our admission office at <strong>admission@kitm.edu.np</strong> or call us at <strong>+977-9803864719</strong>.
      </p>
    </div>
    
    <div style="background-color: #f1f3f4; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
        <strong>Kantipur Institute of Technology & Management</strong><br>
        Excellence in IT Education & Professional Training<br>
        Affiliated with Rajarahi Janak University
      </p>
      <p style="color: #888; margin: 0; font-size: 12px;">
        📧 <a href="mailto:info@kitm.edu.np" style="color: #1e3c72; text-decoration: none;">info@kitm.edu.np</a> | 
        📱 +977-9803864719, +977-9851137540 | 
        🌐 <a href="https://kitm.edu.np" style="color: #1e3c72; text-decoration: none;">kitm.edu.np</a>
      </p>
    </div>
  </div>
`;

// Helper functions for email templates
const getStatusColor = (status) => {
  const colors = {
    'draft': '#6c757d',
    'submitted': '#007bff',
    'under_review': '#ffc107',
    'document_verification': '#fd7e14',
    'provisionally_selected': '#28a745',
    'enrollment_completed': '#198754',
    'rejected': '#dc3545',
    'cancelled': '#6f42c1',
    'waitlisted': '#20c997'
  };
  return colors[status] || '#6c757d';
};

const getStatusSpecificContent = (status) => {
  const content = {
    'under_review': `
      <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">📋 Your Application is Under Review</h4>
        <p style="color: #856404; margin: 0; line-height: 1.6;">
          Our admission committee is currently reviewing your application. We will update you once the review process is complete.
        </p>
      </div>
    `,
    'document_verification': `
      <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">📋 Document Verification in Progress</h4>
        <p style="color: #0c5460; margin: 0; line-height: 1.6;">
          We are currently verifying the documents you submitted. Please ensure all required documents are complete and authentic.
        </p>
      </div>
    `,
    'provisionally_selected': `
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">🎉 Congratulations! Provisionally Selected</h4>
        <p style="color: #155724; margin: 0; line-height: 1.6;">
          You have been provisionally selected for admission. Please wait for further instructions regarding enrollment procedures.
        </p>
      </div>
    `,
    'enrollment_completed': `
      <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 6px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">🎓 Welcome to KITM!</h4>
        <p style="color: #155724; margin: 0; line-height: 1.6;">
          Your enrollment has been completed successfully. Welcome to the KITM family! You will receive your student ID and class schedule soon.
        </p>
      </div>
    `,
    'rejected': `
      <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #721c24; margin: 0 0 10px 0; font-size: 16px;">❌ Application Not Approved</h4>
        <p style="color: #721c24; margin: 0; line-height: 1.6;">
          Unfortunately, your application could not be approved at this time. You may contact our admission office for feedback and guidance on reapplication.
        </p>
      </div>
    `,
    'waitlisted': `
      <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; border-radius: 6px; padding: 20px; margin: 25px 0;">
        <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">⏳ You're on the Waitlist</h4>
        <p style="color: #0c5460; margin: 0; line-height: 1.6;">
          Your application has been placed on the waitlist. We will notify you if a seat becomes available in your preferred program.
        </p>
      </div>
    `
  };
  return content[status] || '';
};