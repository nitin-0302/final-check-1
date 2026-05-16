import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/notify-admin", async (req, res) => {
    const { registrationData, userName, userEmail, uniqueCode } = req.body;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const adminEmails = process.env.ADMIN_EMAIL || 'brothernitin99@gmail.com,nitin.c@somaiya.edu';

    if (!host || !user || !pass) {
      console.warn("SMTP credentials not fully configured. Email skipped.");
      return res.status(200).json({ message: "Email skipped (SMTP not configured)", success: false });
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const eventsList = registrationData.map((reg: any) => `- ${reg.eventName} (${reg.type})`).join('\n');

      // Admin Email
      const adminMailOptions = {
        from: `"Rasayan 2026 Admin" <${user}>`,
        to: adminEmails,
        subject: `New Registration [ID: ${uniqueCode}]: ${userName}`,
        text: `
Hello Admin,

A new user has registered for events at Rasayan 2026.

Participant Details:
- Name: ${userName}
- Email: ${userEmail}
- Registration ID: ${uniqueCode}
- College: ${registrationData[0]?.college || 'Not specified'}

Events Registered:
${eventsList}

Please check the Admin Dashboard for more details.
        `,
      };

      // User Confirmation Email
      const userMailOptions = {
        from: `"Rasayan 2026" <${user}>`,
        to: userEmail,
        subject: `Registration Confirmed: Rasayan 2026`,
        text: `
Hello ${userName},

Your registration for Rasayan 2026 is confirmed!

Your Unique Registration ID is: ${uniqueCode}

Please keep this ID safe as it will be required during the event for verification.

Events you registered for:
${eventsList}

Venue: K J Somaiya College of Science and Commerce
Date: 16th December, 2026

We look forward to seeing you!

Best regards,
Team Rasayan 2026
        `,
      };

      await transporter.sendMail(adminMailOptions);
      await transporter.sendMail(userMailOptions);

      res.json({ message: "Notification emails sent", success: true });
    } catch (error) {
      console.error("Error sending registration emails:", error);
      res.status(500).json({ error: "Failed to send notification emails", success: false });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
