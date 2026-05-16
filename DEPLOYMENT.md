# Rasayan 2026 - Deployment Guide

This project is a **Full-Stack Application** (React + Express). 

## 🌐 Deployment Options

### 1. Vercel (Recommended)
Vercel is the easiest place to host this app because it automatically handles the Express backend.
1. Push your code to a GitHub Repository.
2. Connect your GitHub Repo to [Vercel](https://vercel.com).
3. **Environment Variables**: Add `gamezztester@gmailcom` and `nitin@9969119067` in the Vercel Project Settings.
4. Vercel will automatically detect the `package.json` and deploy both the UI and the API.

### 2. GitHub Pages (Static Only)
**Warning**: GitHub Pages only hosts the "Frontend". 
- **What will work**: Home page, Registration form (UI), Dashboard (UI).
- **What will NOT work**: 
  - Confirmation Emails (requires Backend).
  - Health checks in Admin Panel (will show 'Offline').
  - The site might show a white screen if not correctly built.

### 🛠️ Common Issue: White Screen on GitHub
If your screen is blank after deploying to GitHub:
1. Ensure the **Vite Base Path** is correct in `vite.config.ts`. (I have already set this to `./`).
2. Ensure you are using **HashRouter** instead of BrowserRouter. (I have already switched this for you).
3. Ensure you are deploying the contents of the **`dist/`** folder, not the root of the project.

## 🧪 Testing Locally/In Preview
To test if emails work, use the **Admin Command Center**. 
- Look for the **Server: OK** status.
- Look for the **SMTP: Configured** status.
- If SMTP is "Missing Credentials", go to **Settings > Secrets** in the editor and add `SMTP_USER` and `SMTP_PASS`.
