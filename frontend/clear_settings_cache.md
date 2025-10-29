# Clear Settings Cache to See Retell AI Agent Option

## The Issue
Your browser's localStorage has old settings that don't include the "Retell AI Agent Prompt" option.

## Solution - Choose ONE of these methods:

### Method 1: Clear localStorage (Easiest)
1. Open your browser's Developer Tools (F12)
2. Go to **Console** tab
3. Paste this command and press Enter:
   ```javascript
   localStorage.removeItem('organizationSettings')
   ```
4. Refresh the page (F5)
5. Go to Settings → AI Prompts tab
6. You should now see **"Retell AI Agent Prompt"** in the dropdown! ✅

### Method 2: Automatic Migration (Alternative)
The code now includes automatic migration that will add the Retell AI Agent option if it's missing.

Just **refresh the page** and check Settings → AI Prompts.

The migration code will automatically detect that `retellAgent` is missing and add it.

### Method 3: Manual localStorage Update
1. Open Developer Tools (F12)
2. Go to **Console** tab
3. Paste this code:
   ```javascript
   const settings = JSON.parse(localStorage.getItem('organizationSettings') || '{}');
   if (!settings.ai.implementations.retellAgent) {
     settings.ai.implementations.retellAgent = {
       name: "Retell AI Agent Prompt",
       prompt: "You are an AI recruiter conducting initial phone screening calls. Be professional, friendly, and conversational..."
     };
     localStorage.setItem('organizationSettings', JSON.stringify(settings));
     console.log('✅ Retell AI Agent added!');
   }
   ```
4. Refresh the page

## Verify It's Working

After using any method above:

1. Go to **Settings** page
2. Click **AI Prompts** tab
3. Open the **AI Implementation** dropdown
4. You should see these 3 options:
   - Job Description Generation
   - Questions Generation with AI
   - **Retell AI Agent Prompt** ← NEW! 🎉

## What You'll See

When you select "Retell AI Agent Prompt":
- 📝 Large textarea with the prompt
- 🟣 **"Fetch from Retell"** button (purple) - Loads current prompt from Retell API
- 🟣 **"Save to Retell"** button (purple) - Saves your changes to Retell API
- ⚪ "Reset to Default" button
- 🔵 "Save & Update API" button

## If Still Not Showing

If you still don't see it after trying all methods:
1. Close the browser completely
2. Reopen and go to the Settings page
3. The migration logic will run automatically

The code has been updated to ensure the Retell AI Agent option is always available! 🚀
