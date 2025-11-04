const nodemailer = require("nodemailer");
const { generateResponse } = require('../utils/responseHelper');

// Helper functions for responses
const successResponse = (message, data) => generateResponse(true, message, data);
const errorResponse = (message, statusCode) => generateResponse(false, message, null, { statusCode });

// Test email configuration
const testEmailConfiguration = async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    // Check if email configuration exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json(errorResponse('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in environment variables.', 400));
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Test email configuration
    try {
      await transporter.verify();
      console.log('✅ Email configuration verified successfully');
      
      res.json(successResponse('Email configuration is working correctly!', {
        emailUser: process.env.EMAIL_USER,
        verified: true
      }));
    } catch (verifyError) {
      console.error('❌ Email configuration verification failed:', verifyError);
      
      res.status(400).json(errorResponse(`Email configuration verification failed: ${verifyError.message}`, 400));
    }

  } catch (error) {
    console.error('Error testing email configuration:', error);
    res.status(500).json(errorResponse('Failed to test email configuration', 500));
  }
};

// Send test email
const sendTestEmail = async (req, res) => {
  try {
    const userId = req.userId;
    const { testEmail } = req.body;
    
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated', 401));
    }

    if (!testEmail) {
      return res.status(400).json(errorResponse('Test email address is required', 400));
    }

    // Check if email configuration exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(400).json(errorResponse('Email configuration missing. Please set EMAIL_USER and EMAIL_PASS in environment variables.', 400));
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Create test email
    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ Test Email - Restaurant Management System</h2>
            <p>This is a test email to verify email configuration.</p>
          </div>
          <p>If you receive this email, your email configuration is working correctly!</p>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;

    // Send test email
    const emailResult = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: testEmail,
      subject: '✅ Test Email - Restaurant Management System',
      html: testEmailHtml
    });

    console.log('✅ Test email sent successfully:', emailResult);
    
    res.json(successResponse('Test email sent successfully!', {
      to: testEmail,
      messageId: emailResult.messageId,
      response: emailResult.response
    }));

  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json(errorResponse(`Failed to send test email: ${error.message}`, 500));
  }
};

module.exports = {
  testEmailConfiguration,
  sendTestEmail
};
