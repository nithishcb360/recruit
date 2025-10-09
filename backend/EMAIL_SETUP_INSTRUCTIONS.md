# Email Setup Instructions for Automatic Candidate Emails

## Overview
The system sends **TWO automated emails** to candidates during the recruitment process:

### 📧 Email #1: Initial Selection Notification
**Trigger:** Candidate is moved to screening page (selected for interview)

**Contains:**
- Congratulations message
- Notification that they've been selected for next round
- "We will contact you shortly" message
- What to expect next (phone call, interview scheduling)

### 📧 Email #2: Interview Schedule & WebDesk Details
**Trigger:** After Retell AI call ends with scheduled interview time

**Contains:**
- Scheduled interview date and time
- WebDesk assessment link
- Login credentials (username & password)
- Time-based access instructions (15 min before → 2 hours after)

## Setup Steps

### 1. Configure Email Credentials

Edit the `.env` file in the `backend` folder (`d:\recruit\backend\.env`):

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password-here
DEFAULT_FROM_EMAIL=your-email@gmail.com
```

### 2. Get Gmail App Password (Required for Gmail)

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Create a new app password:
   - App: Mail
   - Device: Windows Computer (or other)
5. Copy the 16-character password (no spaces)
6. Paste it in `.env` as `EMAIL_HOST_PASSWORD`

**Example:**
```env
EMAIL_HOST_USER=recruiter@cloudberry.com
EMAIL_HOST_PASSWORD=abcd efgh ijkl mnop
DEFAULT_FROM_EMAIL=recruiter@cloudberry.com
```

### 3. Restart Django Server

After configuring the `.env` file, restart the Django server:

```bash
cd d:\recruit\backend
python manage.py runserver
```

### 4. Test the Email System

1. Move a candidate to the screening page
2. Wait for the automatic Retell call to complete
3. Check if the call summary shows interview was scheduled
4. Email should be sent automatically
5. Check the Django console for logs:
   - `✅ WebDesk email sent to candidate@email.com`
   - Or error messages if something failed

## How It Works

### Automatic Email Trigger

The email is sent automatically when:
1. ✅ Retell call status = `ended`
2. ✅ Interview is scheduled (`retell_interview_scheduled = True`)
3. ✅ Candidate has email address
4. ✅ Email credentials are configured

### Email Contents

**Subject:** `Technical Assessment - [Candidate Name]`

**Body includes:**
- Greeting with candidate name
- Interview schedule (date, time, timezone)
- WebDesk link with candidate ID
- Auto-generated credentials (username & password)
- Instructions for the assessment
- Important note about time-based access (15 min before → 2 hours after)

### Code Locations

- Email function: `backend/api/views.py` (line 60-155)
- Email trigger: `backend/api/views.py` (line 800-804)
- Email settings: `backend/project/settings.py` (line 75-82)

## Troubleshooting

### Email Not Sending?

1. **Check Django logs** for error messages
2. **Verify credentials** in `.env` file
3. **Test email configuration:**
   ```bash
   cd d:\recruit\backend
   python manage.py shell
   ```
   ```python
   from django.core.mail import send_mail
   send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
   ```

4. **Check Gmail settings:**
   - 2-Step Verification enabled?
   - App Password created?
   - Less secure app access disabled? (Use App Password instead)

### Email Sent But Not Received?

1. Check spam/junk folder
2. Verify recipient email is correct
3. Check Gmail sent items

### Common Errors

**Error: SMTPAuthenticationError**
- Wrong email or app password
- 2-Step Verification not enabled
- Need to create App Password

**Error: SMTPServerDisconnected**
- Wrong SMTP host or port
- Firewall blocking port 587

**Error: No module named 'dotenv'**
- Run: `pip install python-dotenv`

## Alternative Email Providers

### Using Other SMTP Servers

**Outlook/Hotmail:**
```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@outlook.com
EMAIL_HOST_PASSWORD=your-password
```

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key
```

**Custom SMTP:**
```env
EMAIL_HOST=your-smtp-server.com
EMAIL_PORT=587  # or 465 for SSL
EMAIL_HOST_USER=your-username
EMAIL_HOST_PASSWORD=your-password
```

## Testing Without Real Email

For development/testing without sending real emails:

```env
# Use console backend (prints emails to console)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

Or use file backend:
```env
EMAIL_BACKEND=django.core.mail.backends.filebased.EmailBackend
EMAIL_FILE_PATH=/tmp/app-emails
```

## Security Notes

⚠️ **IMPORTANT:**
- Never commit `.env` file to git
- Keep your App Password secure
- Use environment variables in production
- Rotate passwords regularly
- Use dedicated email account for system emails

## Support

If you encounter issues:
1. Check Django console logs
2. Verify all configuration steps
3. Test with console backend first
4. Check candidate has valid email address
5. Ensure call ended with interview scheduled
