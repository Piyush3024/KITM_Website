import SibApiV3Sdk from 'sib-api-v3-sdk';
import dotenv from 'dotenv';

dotenv.config();



// Configure Brevo API client
const configureBrevo = () => {
    try {
        if (!process.env.BREVO_API_KEY) {
            
            throw new Error('BREVO_API_KEY is not set in .env');
        }
        
        // Initialize the default client
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        
        // Configure API key authorization
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        
        // Return the transactional emails API instance
        return new SibApiV3Sdk.TransactionalEmailsApi();
    } catch (error) {
        console.error('Brevo configuration error:', error.message);
        throw error;
    }
};

// Send email using Brevo API
export const sendEmail = async ({ to, subject, htmlContent }) => {
    try {
        console.log('Attempting to send email...');
        
        // Configure API client
        const defaultClient = SibApiV3Sdk.ApiClient.instance;
        const apiKey = defaultClient.authentications['api-key'];
        apiKey.apiKey = process.env.BREVO_API_KEY;
        
        // Setup API instance
        const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
        
        const sender = {
            email: process.env.SENDER_EMAIL || 'no-reply@kitm.edu.np',
            name: process.env.SENDER_NAME || 'KITM - Kantipur Institute of Technology & Management'
        };

        // Configure email using Brevo's SendSmtpEmail model
        const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
        sendSmtpEmail.sender = sender;
        sendSmtpEmail.to = [{ email: to }];
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = htmlContent;

        console.log('Sending email with configuration:', {
            to,
            subject,
            sender: sender.email,
            senderName: sender.name
        });

        // Send email
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('Email sent successfully via Brevo API');
        console.log('Message ID:', response.messageId);
        
        return { success: true, messageId: response.messageId };
    } catch (error) {
        console.error('Error sending email via Brevo:', error.message);
        
        // Log more details about the error for debugging
        if (error.response) {
            console.error('Brevo API Error Response:', error.response.text || error.response.body);
        }
        
        throw error;
    }
};

// Email templates for KITM
export const emailTemplates = {
    // Author registration email with credentials
    authorRegistrationEmail: ( username, temporaryPassword, loginLink, role) => ({
        subject: 'Welcome to KITM - Your Account Has Been Created',
        htmlContent: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">
                        Kantipur Institute of Technology & Management
                    </h1>
                    <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 14px;">
                        Excellence in IT Education & Professional Training
                    </p>
                </div>
                
                <!-- Main Content -->
                <div style="background-color: white; padding: 40px 30px;">
                    <h2 style="color: #1e3c72; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                        Welcome to KITM Author Portal!
                    </h2>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Dear <strong>${username}</strong>,
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        Your author account has been successfully created by the KITM administration. You now have access to our content management system with <strong>${role}</strong> privileges.
                    </p>
                    
                    <!-- Credentials Box -->
                    <div style="background-color: #f8f9ff; border: 2px solid #e3f2fd; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1e3c72; margin: 0 0 15px 0; font-size: 18px;">
                            📋 Your Login Credentials
                        </h3>
                        <div style="background-color: white; border-radius: 6px; padding: 20px; border-left: 4px solid #2a5298;">
                            <p style="margin: 0 0 10px 0; color: #333;">
                                <strong>Username:</strong> <code style="background-color: #f1f3f4; padding: 4px 8px; border-radius: 4px; color: #1e3c72; font-weight: 600;">${username}</code>
                            </p>
                            <p style="margin: 0 0 10px 0; color: #333;">
                                <strong>Temporary Password:</strong> <code style="background-color: #f1f3f4; padding: 4px 8px; border-radius: 4px; color: #1e3c72; font-weight: 600;">${temporaryPassword}</code>
                            </p>
                            <p style="margin: 0; color: #333;">
                                <strong>Role:</strong> <span style="background-color: #e8f5e8; color: #2e7d32; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${role}</span>
                            </p>
                        </div>
                    </div>
                    
                    <!-- Login Button -->
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${loginLink}" 
                           style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); 
                                  color: white; 
                                  padding: 15px 35px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  display: inline-block; 
                                  font-weight: 600; 
                                  font-size: 16px;
                                  box-shadow: 0 4px 12px rgba(30, 60, 114, 0.3);
                                  transition: all 0.3s ease;">
                            🚀 Access KITM Author Portal
                        </a>
                    </div>
                    
                    <!-- Important Notes -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 20px; margin: 25px 0;">
                        <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">
                            ⚠️ Important Security Notes:
                        </h4>
                        <ul style="color: #856404; margin: 0; padding-left: 20px; line-height: 1.6;">
                            <li>Please change your temporary password immediately after first login</li>
                            <li>Keep your credentials secure and do not share them with anyone</li>
                            <li>If you have trouble accessing your account, contact the IT support team</li>
                        </ul>
                    </div>
                    
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 25px 0 0 0;">
                        If the login button doesn't work, copy and paste this URL into your browser:<br>
                        <span style="word-break: break-all; color: #1e3c72; font-family: monospace;">${loginLink}</span>
                    </p>
                </div>
                
                <!-- Footer -->
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
        `
    }),

    // Password reset email
    passwordResetEmail: (userName, resetLink) => ({
        subject: 'Reset Your KITM Account Password',
        htmlContent: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">
                        Kantipur Institute of Technology & Management
                    </h1>
                    <p style="color: #ffeaa7; margin: 10px 0 0 0; font-size: 14px;">
                        Password Reset Request
                    </p>
                </div>
                
                <!-- Main Content -->
                <div style="background-color: white; padding: 40px 30px;">
                    <h2 style="color: #dc3545; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                        🔒 Reset Your Password
                    </h2>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Dear <strong>${userName}</strong>,
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        We received a request to reset the password for your KITM account. If you made this request, click the button below to securely reset your password.
                    </p>
                    
                    <!-- Reset Button -->
                    <div style="text-align: center; margin: 35px 0;">
                        <a href="${resetLink}" 
                           style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); 
                                  color: white; 
                                  padding: 15px 35px; 
                                  text-decoration: none; 
                                  border-radius: 6px; 
                                  display: inline-block; 
                                  font-weight: 600; 
                                  font-size: 16px;
                                  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                                  transition: all 0.3s ease;">
                            🔑 Reset My Password
                        </a>
                    </div>
                    
                    <!-- Security Info -->
                    <div style="background-color: #e7f3ff; border: 2px solid #b3d9ff; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #0066cc; margin: 0 0 15px 0; font-size: 18px;">
                            🛡️ Security Information
                        </h3>
                        <div style="background-color: white; border-radius: 6px; padding: 20px; border-left: 4px solid #0066cc;">
                            <ul style="color: #333; margin: 0; padding-left: 20px; line-height: 1.6;">
                                <li><strong>Reset link expires in 1 hour</strong> for your security</li>
                                <li>This link can only be used once</li>
                                <li>If you didn't request this reset, ignore this email</li>
                                <li>Your current password remains unchanged until you complete the reset</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Manual Link -->
                    <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 25px 0;">
                        If the reset button doesn't work, copy and paste this URL into your browser:<br>
                        <span style="word-break: break-all; color: #dc3545; font-family: monospace; background-color: #f8f9fa; padding: 8px; border-radius: 4px; display: inline-block; margin-top: 5px;">${resetLink}</span>
                    </p>
                    
                    <!-- Warning -->
                    <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 6px; padding: 20px; margin: 25px 0;">
                        <p style="color: #856404; margin: 0; font-size: 14px; line-height: 1.6;">
                            <strong>⚠️ Didn't request a password reset?</strong><br>
                            If you didn't request this password reset, please ignore this email and your password will remain unchanged. 
                            Consider changing your password if you're concerned about account security.
                        </p>
                    </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f1f3f4; padding: 25px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="color: #666; margin: 0 0 10px 0; font-size: 14px; line-height: 1.6;">
                        <strong>Kantipur Institute of Technology & Management</strong><br>
                        Excellence in IT Education & Professional Training<br>
                        Affiliated with Rajarahi Janak University
                    </p>
                    <p style="color: #888; margin: 0; font-size: 12px;">
                        📧 <a href="mailto:info@kitm.edu.np" style="color: #dc3545; text-decoration: none;">info@kitm.edu.np</a> | 
                        📱 +977-9803864719, +977-9851137540 | 
                        🌐 <a href="https://kitm.edu.np" style="color: #dc3545; text-decoration: none;">kitm.edu.np</a>
                    </p>
                </div>
            </div>
        `
    }),

    // Welcome email for general users (optional)
    welcomeEmail: (userName) => ({
        subject: 'Welcome to KITM - Kantipur Institute of Technology & Management',
        htmlContent: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 650px; margin: 0 auto; padding: 0; background-color: #f8f9fa;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 300;">
                        Kantipur Institute of Technology & Management
                    </h1>
                    <p style="color: #e3f2fd; margin: 10px 0 0 0; font-size: 14px;">
                        Excellence in IT Education & Professional Training
                    </p>
                </div>
                
                <!-- Main Content -->
                <div style="background-color: white; padding: 40px 30px;">
                    <h2 style="color: #1e3c72; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                        Welcome to KITM!
                    </h2>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Dear <strong>${userName}</strong>,
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        Welcome to the Kantipur Institute of Technology & Management! We're excited to have you join our community of learners and innovators.
                    </p>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        At KITM, we provide high-quality academic and vocational education in Information Technology and Business Management. Our programs, including BCA and BSc CSIT, are designed to create high-value professionals ready for the demands of today's industry.
                    </p>
                    
                    <div style="background-color: #f8f9ff; border: 2px solid #e3f2fd; border-radius: 8px; padding: 25px; margin: 25px 0;">
                        <h3 style="color: #1e3c72; margin: 0 0 15px 0; font-size: 18px;">
                            🎓 What You Can Expect:
                        </h3>
                        <ul style="color: #333; margin: 0; padding-left: 20px; line-height: 1.6;">
                            <li>Industry-focused curriculum and practical training</li>
                            <li>Professional development and internship opportunities</li>
                            <li>Access to modern learning resources and facilities</li>
                            <li>Guidance from experienced faculty and industry experts</li>
                        </ul>
                    </div>
                    
                    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                        If you have any questions or need assistance, don't hesitate to reach out to our support team. We're here to help you succeed!
                    </p>
                </div>
                
                <!-- Footer -->
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
        `
    })
};

export const generateTemporaryPassword = (length = 12) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special character
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};