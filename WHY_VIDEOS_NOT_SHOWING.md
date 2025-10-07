# Why Videos Are Not Showing in Card - Troubleshooting Guide

## 🔍 Quick Checklist

### ✅ Things That MUST Be True for Videos to Show:

1. **Job Selected** - You MUST select a job from the dropdown first
2. **Candidate in Results** - The candidate must appear in the screening results
3. **Assessment Completed** - Candidate must have `assessment_completed: true`
4. **Video URLs Present** - API must return video URLs
5. **Page Refreshed** - Must refresh after code changes

---

## 📋 Step-by-Step Instructions

### Step 1: Open Screening Page
```
http://localhost:3000/screening
```

### Step 2: Select a Job
Look for the **dropdown at the top** that says "Select Job"
- Click it
- Choose ANY job from the list
- The page will load candidates who applied to that job

**⚠️ IMPORTANT**: If you don't select a job, NO candidates will show!

### Step 3: Look for Blue Border
After selecting a job, scroll through the candidate cards and look for a **BLUE BORDER** around the videos section.

The videos section now has a blue border to make it easier to find:
```
┌─────────────────────────────────┐
│ 📹 Assessment Recordings:       │ ← BLUE BORDER
│ [Camera Video] [Screen Video]   │
└─────────────────────────────────┘
```

### Step 4: Check Browser Console
Press `F12` and go to Console tab. Look for any errors.

---

## 🐛 Common Issues

### Issue #1: "I don't see any candidates"

**Cause**: No job selected

**Solution**:
1. Look at the TOP of the page
2. Find the "Select Job" dropdown
3. Click and select a job
4. Candidates will appear below

### Issue #2: "I see candidates but no videos"

**Possible Causes**:

**A) Candidate hasn't completed assessment**
- Check if card shows "Assessment: Completed"
- If not, they haven't taken the test yet

**B) No video recordings**
- Check API: `http://localhost:8000/api/candidates/[ID]/`
- Look for `assessment_video_recording` and `assessment_screen_recording`
- If they're `null` or empty, no videos exist

**C) Page not refreshed**
- Press `Ctrl + Shift + R` (hard refresh)
- Or clear cache and reload

**D) Videos below the fold**
- Scroll down within the card
- Videos are after "Assessment: Completed" badge

### Issue #3: "I see the blue border but no videos"

**Cause**: Video player not rendering

**Solution**:
1. Check browser console for errors
2. Verify video URLs are accessible:
   - `http://localhost:8000/media/assessment_videos/camera_XXX.webm`
   - `http://localhost:8000/media/assessment_screens/screen_XXX.webm`
3. Try opening URL directly in browser
4. Check if Django backend is serving media files

### Issue #4: "Videos show but won't play"

**Possible Causes**:

**A) Video files corrupted**
- Download the file and try to play locally
- Check file size (should be > 0 bytes)

**B) Browser doesn't support WebM**
- Try Chrome/Edge (best WebM support)
- Firefox also supports WebM
- Safari might have issues

**C) Network error**
- Check browser Network tab (F12)
- Look for failed requests to video files
- Verify Django is serving media correctly

---

## 🎯 How to Verify Videos Exist

### Method 1: Check API Response

```bash
curl http://localhost:8000/api/candidates/202/ | grep assessment_video_recording
```

Should return:
```json
"assessment_video_recording": "http://localhost:8000/media/assessment_videos/camera_202_1759763858681.webm"
```

### Method 2: Check Files on Disk

```bash
ls D:/recruit/backend/media/assessment_videos/
ls D:/recruit/backend/media/assessment_screens/
```

Should list `.webm` files

### Method 3: Test URL Directly

Open in browser:
- `http://localhost:8000/media/assessment_videos/camera_202_1759763858681.webm`

Video should download or play

---

## 🔧 Force Videos to Show (Debug Mode)

I've added a **BLUE BORDER** around the videos section. If you see this border, it means:
- ✅ The condition is true
- ✅ The code is running
- ✅ React is rendering the component

If you DON'T see the blue border, it means:
- ❌ The condition `(result.candidate.assessment_video_recording || result.candidate.assessment_screen_recording)` is FALSE
- ❌ Both video fields are null/empty/undefined
- ❌ The candidate doesn't have video recordings

---

## 📱 Visual Guide

### What You Should See:

```
┌────────────────────────────────────────────────────────┐
│ Screening Page                                         │
├────────────────────────────────────────────────────────┤
│ [Select Job ▼] [Search...] [Min Score: 60%]          │  ← Step 1: Select Job
├────────────────────────────────────────────────────────┤
│                                                        │
│ ┌────────────────────────────────────────────────────┐│
│ │ [NK] Nithish Kumar                    [📥][📧][🗑️]││  ← Candidate Card
│ │ snithish...@gmail.com                              ││
│ │                                                    ││
│ │ 🔐 WebDesk Login:                                  ││
│ │ User: nithish5739  Pass: TXUk55JE                 ││
│ │                                                    ││
│ │ ✅ Assessment: Completed                           ││
│ │ Score: 9%                                          ││
│ │                                                    ││
│ │ ┌──────────────────────────────────────────────┐  ││  ← LOOK FOR BLUE BORDER
│ │ │ 📹 Assessment Recordings:                    │  ││
│ │ │ ┌──────────┐  ┌──────────┐                  │  ││
│ │ │ │📷 Camera │  │🖥️ Screen │                  │  ││
│ │ │ │ [▶️ Play]│  │ [▶️ Play]│                  │  ││
│ │ │ └──────────┘  └──────────┘                  │  ││
│ │ └──────────────────────────────────────────────┘  ││
│ └────────────────────────────────────────────────────┘│
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🧪 Test Scenarios

### Test 1: Candidate with Videos (ID: 202)
```bash
# Check API
curl http://localhost:8000/api/candidates/202/ | grep -E "assessment_video_recording|assessment_screen_recording"

# Expected:
# "assessment_video_recording": "http://localhost:8000/media/assessment_videos/camera_202_1759763858681.webm"
# "assessment_screen_recording": "http://localhost:8000/media/assessment_screens/screen_202_1759763858682.webm"
```

### Test 2: Candidate with Videos (ID: 200)
```bash
curl http://localhost:8000/api/candidates/200/ | grep -E "assessment_video_recording|assessment_screen_recording"

# Expected:
# "assessment_video_recording": "http://localhost:8000/media/assessment_videos/camera_200_1759762250307.webm"
# "assessment_screen_recording": "http://localhost:8000/media/assessment_screens/screen_200_1759762250307.webm"
```

---

## 🎬 Quick Test

1. **Open**: http://localhost:3000/screening
2. **Select ANY job** from dropdown
3. **Find** "Nithish Kumar" or "DHINA A" card
4. **Look for BLUE BORDER** below "Assessment: Completed"
5. **See videos** inside the blue border
6. **Click ▶️** to play

---

## 📊 What Data is Required

For videos to show, the API must return:

```json
{
  "assessment_video_recording": "http://localhost:8000/media/assessment_videos/camera_XXX.webm",
  "assessment_screen_recording": "http://localhost:8000/media/assessment_screens/screen_XXX.webm"
}
```

**OR** at least ONE of them (not null, not empty string)

---

## 🔍 Debug Console Commands

Open browser console (F12) and run:

```javascript
// Check if videos exist in DOM
document.querySelectorAll('video').length
// Should return number > 0 if videos are present

// Get all video sources
Array.from(document.querySelectorAll('video source')).map(s => s.src)
// Should return array of video URLs

// Check for blue borders (debug mode)
document.querySelectorAll('.border-blue-500').length
// Should return number > 0 if video sections exist
```

---

## ✅ Success Indicators

You'll know videos are working when you see:

1. ✅ Blue border around a section
2. ✅ "📹 Assessment Recordings:" text
3. ✅ Two boxes labeled "📷 Camera" and "🖥️ Screen"
4. ✅ Video players with play controls
5. ✅ Videos actually play when you click ▶️

---

## 🆘 Still Not Working?

If videos still don't show:

1. **Take screenshot** of the screening page
2. **Check** browser console for errors (F12 → Console)
3. **Verify** API response: `http://localhost:8000/api/candidates/202/`
4. **Test** video URL directly in browser
5. **Confirm** Django is serving media files
6. **Try** different browser (Chrome recommended)
7. **Clear** all browser cache and cookies
8. **Restart** both frontend and backend servers

---

## 📞 Additional Help

**Files to Check**:
- Frontend Code: `D:\recruit\frontend\src\app\screening\page.tsx` (line 1968-2010)
- Backend Media: `D:\recruit\backend\media\assessment_videos\`
- Backend Media: `D:\recruit\backend\media\assessment_screens\`

**Commands to Run**:
```bash
# Check if backend is running
curl -I http://localhost:8000

# Check if frontend is running
curl -I http://localhost:3000

# Check video files exist
ls D:/recruit/backend/media/assessment_videos/

# Test video accessibility
curl -I http://localhost:8000/media/assessment_videos/camera_202_1759763858681.webm
```

The blue border makes it very easy to spot where videos should be!
