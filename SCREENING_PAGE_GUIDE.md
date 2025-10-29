# WebDesk Assessment - Screening Page Guide

## 🎯 How to View Assessment Results for Candidate DHINA A (ID: 200)

### Step 1: Navigate to Screening Page
Go to: `http://localhost:3000/screening`

### Step 2: Select a Job
- Click on the **"Select Job"** dropdown at the top
- Select the job with ID 22 (or any job the candidate applied to)
- This will load all candidates who applied to that job

### Step 3: Find the Candidate Card
Look for the card with:
- **Name**: DHINA A
- **Email**: vjsri.a2002@gmail.com

## 📊 What You'll See in the Card Header

### Left Side (Candidate Info):
- **Avatar Circle**: DA (initials)
- **Name**: DHINA A
- **Email**: vjsri.a2002@gmail.com
- **Phone**: 7010866584

**WebDesk Login Credentials** (Red box):
```
🔐 WebDesk Login:
User: dhina8231
Pass: DUzW70Fu
```

**Assessment Status** (Green box):
```
✅ Assessment: Completed
Score: 22%
```

### Right Side (Scores):
Two scores displayed:
1. **Match Score**: [Percentage from resume screening algorithm]
2. **Assessment Score: 22%** ← WebDesk assessment result

### Action Buttons:
- **Green Download Icon** 📥 - Download PDF report
- **Blue Trash Icon** 🗑️ - Remove from screening

## 📝 When You Expand the Card (Click Anywhere on Card)

### Section 1: Assessment Responses
Shows all 7 questions with answers:

**Question 1 (MCQ)**: What is the time complexity of binary search?
- Selected: O(n²) ❌ Wrong
- Correct: O(log n)

**Question 2 (MCQ)**: Which data structure uses LIFO?
- Not answered ❌

**Question 3 (Coding)**: Palindrome function
- Not answered

**Question 4 (MCQ)**: What does REST stand for?
- Selected: Representational State Transfer ✓ Correct

**Question 5 (Text)**: SQL vs NoSQL difference
- Answer: "dfsefdsfdf erjwehr uqwjqwgeuqwbde"

**Question 6 (Coding)**: Factorial function
- Not answered

**Question 7 (MCQ)**: Virtual DOM purpose
- Selected: To store component state ❌ Wrong
- Correct: To make the app faster

**Total Score Summary**:
```
Total Score: 22% (24/110 points)
```

**Download PDF Button**: Large blue button - "Download Assessment Report (PDF)"

### Section 2: WebDesk Assessment Recordings

Two video players:

#### 📷 Camera Recording
- **URL**: `http://localhost:8000/media/assessment_videos/camera_200_1759762250307.webm`
- **Controls**: Play, Pause, Volume, Fullscreen
- **Shows**: Candidate's face during assessment

#### 🖥️ Screen Recording
- **URL**: `http://localhost:8000/media/assessment_screens/screen_200_1759762250307.webm`
- **Controls**: Play, Pause, Volume, Fullscreen
- **Shows**: Candidate's screen activity during assessment

**Time Info**:
- Duration: 0m 39s

## 📄 PDF Report Contents

When you click download, the PDF includes:

### Page 1:
- **Header**: Assessment Report
- **Candidate Info**: Name, Email, Status
- **Metrics**:
  - Time Taken: 0m 39s
  - Tab Switches: 0
- **Score**: 22% (24/110 points)

### Remaining Pages:
- All 7 questions with full text
- All answer options (for MCQ questions)
- Candidate's selected/written answers
- Correct answer indicators
- Color coding (Green = correct, Red = wrong)
- Clickable links to video recordings
- Page numbers and timestamp

## 🔧 Troubleshooting

### If you don't see the candidate:
1. Make sure you selected Job ID 22 from the dropdown
2. Check that candidate ID 200 has `status: "screening"` in the API
3. Verify the candidate applied to job ID 22

### If videos don't play:
1. Check browser console for errors
2. Verify the URLs are accessible:
   - http://localhost:8000/media/assessment_videos/camera_200_1759762250307.webm
   - http://localhost:8000/media/assessment_screens/screen_200_1759762250307.webm
3. Ensure Django media files are being served correctly

### If PDF download fails:
1. Check browser console for JavaScript errors
2. Ensure jsPDF library loaded correctly
3. Try refreshing the page

## 📱 Current Status for DHINA A

✅ Assessment Completed
✅ Not Disqualified
✅ Score: 22% (24/110 points)
✅ Time: 39 seconds
✅ Tab Switches: 0
✅ Camera Recording: Available
✅ Screen Recording: Available
✅ All 7 Questions: Recorded in PDF

## 🎬 How to Play Videos

1. Expand the candidate card by clicking on it
2. Scroll down to "📹 WebDesk Assessment Recordings" section
3. You'll see two video boxes side by side:
   - Left: 📷 Camera Recording
   - Right: 🖥️ Screen Recording
4. Click the **Play button** (▶️) in the center of each video
5. Use the video controls:
   - Play/Pause
   - Volume
   - Seek bar to jump to specific time
   - Fullscreen button (bottom right of video)

Both videos have HTML5 native controls and should play directly in the browser without any plugins.
