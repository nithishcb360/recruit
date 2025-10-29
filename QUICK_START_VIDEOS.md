# 🎬 Quick Start: How to See Assessment Videos RIGHT NOW

## ✅ PROBLEM SOLVED!

I've created a job application for candidate 203. Videos will now show in the screening page.

---

## 📋 Follow These Steps:

### Step 1: Open Screening Page
```
http://localhost:3000/screening
```

### Step 2: Hard Refresh Your Browser
**IMPORTANT**: The code was just updated, so you MUST refresh

**Windows/Linux**:
- Press `Ctrl + Shift + R`
- OR `Ctrl + F5`

**Mac**:
- Press `Cmd + Shift + R`

### Step 3: Select Job from Dropdown
1. Look at the **top of the page**
2. Find the dropdown that says **"Select Job"**
3. Click it and select **"software (Job #22)"**
4. Page will load candidates

### Step 4: Find the Candidate Card
Look for the candidate card:
- **Name**: Nithish kumar 2025-1
- **Email**: (will be shown in the card)
- **Assessment Score**: 9%

### Step 5: Look for Blue Border
Scroll down in the candidate card. You should see:

```
┌────────────────────────────────────────────────────┐
│ ✅ Assessment: Completed                           │
│ Score: 9%                                          │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │ ← BLUE BORDER
│ │ 📹 Assessment Recordings:                    │  │
│ │ ┌──────────┐  ┌──────────┐                  │  │
│ │ │📷 Camera │  │🖥️ Screen │                  │  │
│ │ │ [▶️ Play]│  │ [▶️ Play]│                  │  │
│ │ └──────────┘  └──────────┘                  │  │
│ └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Step 6: Play Videos
1. Click the **▶️ Play** button on either video
2. Videos should start playing
3. Use the controls:
   - Play/Pause
   - Volume
   - Seek bar
   - Fullscreen (bottom-right corner)

---

## 🎯 What You'll See:

### In the Card (Collapsed):
- **Two small video players** (120px height)
- Side-by-side layout
- Blue border around the section for easy visibility
- HTML5 controls for playback

### In the Card Header:
- **Match Score**: Resume screening score
- **Assessment Score**: 9% (WebDesk test result)
- **Assessment Status**: Completed badge

### Action Buttons:
- **📥 Green Button**: Download PDF report (all questions + video links)
- **📧 Purple Button**: Send email to candidate
- **🗑️ Blue Button**: Remove from screening

---

## 📄 PDF Report Features:

Click the **green download button** to get a PDF with:
1. Candidate information
2. Assessment metrics (time, tab switches, score)
3. All 7 questions with full text
4. All answer options (for multiple choice)
5. Candidate's answers (color-coded: green=correct, red=wrong)
6. Clickable links to video recordings
7. Professional formatting with page numbers

---

## 🐛 Troubleshooting:

### "I don't see any candidates"
- Make sure you selected **"software (Job #22)"** from the dropdown
- Try refreshing the page

### "I don't see the blue border"
- Candidate might not have videos
- Make sure you're looking at **Nithish kumar 2025-1** card
- Try hard refresh (Ctrl+Shift+R)

### "Videos won't play"
- Check browser console for errors (Press F12)
- Try a different browser (Chrome recommended)
- Verify backend is running: http://localhost:8000

### "I see the border but videos don't load"
- Open browser console (F12)
- Look for network errors
- Test video URL directly:
  - http://localhost:8000/media/assessment_videos/camera_203_1759773516919.webm
  - http://localhost:8000/media/assessment_screens/screen_203_1759773516919.webm

---

## ✅ Verification Checklist:

Before you start:
- [ ] Frontend server running: http://localhost:3000
- [ ] Backend server running: http://localhost:8000
- [ ] Browser updated to latest version
- [ ] JavaScript enabled in browser

During testing:
- [ ] Opened http://localhost:3000/screening
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Selected "software (Job #22)" from dropdown
- [ ] Found Nithish kumar 2025-1 card
- [ ] Saw blue border around video section
- [ ] Clicked play button
- [ ] Videos played successfully

---

## 🎬 Video Details:

### Camera Recording:
- **File**: camera_203_1759773516919.webm
- **Size**: 810 KB
- **Format**: WebM (VP8/VP9)
- **Shows**: Candidate's face during assessment

### Screen Recording:
- **File**: screen_203_1759773516919.webm
- **Size**: 4.3 MB
- **Format**: WebM (VP8/VP9)
- **Shows**: Candidate's screen during assessment

---

## 📞 Still Not Working?

If you still don't see videos after following ALL steps:

1. **Take a screenshot** of the screening page
2. **Open browser console** (F12) and copy any errors
3. **Check** if you see the blue border
4. **Verify** you selected the correct job (Job #22)
5. **Confirm** both servers are running

Common issues:
- Not selecting a job from dropdown
- Not hard refreshing after code changes
- Browser cache not cleared
- Backend not serving media files
- JavaScript errors in console

---

## 🎯 Expected Result:

After following these steps, you should see:
✅ Candidate card with blue border
✅ Two video players side-by-side
✅ Videos play when clicked
✅ Download PDF button works
✅ Email button works
✅ Both scores displayed (Match + Assessment)

---

**Status**: ✅ Ready to Test
**Last Updated**: October 6, 2025, 18:15 UTC
**Candidate**: Nithish kumar 2025-1 (ID: 203)
**Job**: software (ID: 22)
