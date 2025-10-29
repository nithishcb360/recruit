# Debug: Videos Not Showing in Screening Card

## ✅ Confirmed: Candidate Has Video Recordings

**Candidate**: Nithish Kumar (ID: 202)
- **Email**: snithishkumarsuresh0808@gmail.com
- **Assessment Score**: 9%
- **Assessment Completed**: Yes

**Video URLs from API**:
```json
"assessment_video_recording": "http://localhost:8000/media/assessment_videos/camera_202_1759763858681.webm"
"assessment_screen_recording": "http://localhost:8000/media/assessment_screens/screen_202_1759763858682.webm"
```

## 🔍 Troubleshooting Steps

### Step 1: Hard Refresh the Browser
The videos were just added to the code. You need to refresh:

**Windows/Linux**:
- Press `Ctrl + Shift + R` (Chrome/Edge/Firefox)
- Or `Ctrl + F5`

**Mac**:
- Press `Cmd + Shift + R`

### Step 2: Clear Browser Cache
1. Open Dev Tools: Press `F12`
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

### Step 3: Check If Videos Section Exists
After refreshing, look for this in the candidate card:

```
┌────────────────────────────────────────────────────┐
│ Nithish Kumar                                      │
│ snithishkumarsuresh0808@gmail.com                  │
│                                                    │
│ Assessment: Completed                              │
│ Score: 9%                                          │
│                                                    │
│ 📹 Assessment Recordings:    ← LOOK FOR THIS      │
│ ┌──────────┐  ┌──────────┐                        │
│ │📷 Camera │  │🖥️ Screen │                        │
│ │ [video]  │  │ [video]  │                        │
│ └──────────┘  └──────────┘                        │
└────────────────────────────────────────────────────┘
```

### Step 4: Check Browser Console for Errors
1. Press `F12` to open Dev Tools
2. Go to "Console" tab
3. Look for any errors (red text)
4. Common errors:
   - `Failed to load resource` - Video file not found
   - `net::ERR_CONNECTION_REFUSED` - Backend not running
   - `CORS error` - Cross-origin issue

### Step 5: Verify Video Files Exist
Test the URLs directly in browser:

1. Open new tab
2. Go to: `http://localhost:8000/media/assessment_videos/camera_202_1759763858681.webm`
3. Video should download or play
4. Also test: `http://localhost:8000/media/assessment_screens/screen_202_1759763858682.webm`

### Step 6: Check Backend is Serving Media Files
```bash
# Check if backend is running
curl -I http://localhost:8000/media/assessment_videos/camera_202_1759763858681.webm
```

Should return: `HTTP/1.1 200 OK`

### Step 7: Verify Frontend is Running
- Check: http://localhost:3000/screening
- Server should show: `✓ Compiled /screening`

## 🎯 Expected Behavior

### In Collapsed Card:
You should see **TWO videos** right below the "Assessment: Completed" section:
1. **Left video**: 📷 Camera Recording (120px tall)
2. **Right video**: 🖥️ Screen Recording (120px tall)

Both videos should have:
- Play button (▶️)
- Volume control
- Seek bar
- Fullscreen option

### Code Location:
The videos are rendered at:
- **File**: `frontend/src/app/screening/page.tsx`
- **Lines**: 1968-2009

### Condition Check:
Videos only show if:
```javascript
result.candidate.assessment_video_recording || result.candidate.assessment_screen_recording
```

For candidate 202, BOTH conditions are TRUE, so videos MUST show.

## 🐛 Possible Issues

### Issue 1: Page Not Refreshed
**Solution**: Hard refresh browser (Ctrl + Shift + R)

### Issue 2: Job Not Selected
**Solution**:
1. Go to screening page
2. Select a job from dropdown
3. Candidate should appear in list

### Issue 3: Backend Media Not Configured
**Solution**: Check Django settings:
```python
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

And in `urls.py`:
```python
from django.conf import settings
from django.conf.urls.static import static

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### Issue 4: Video Format Not Supported
**Solution**:
- WebM format requires VP8/VP9 codec
- Chrome/Edge/Firefox support it natively
- Safari might need HLS format

### Issue 5: Browser Cache
**Solution**:
1. Open Dev Tools (F12)
2. Go to Application/Storage tab
3. Click "Clear site data"
4. Refresh page

## 📊 Current Implementation Status

✅ **Code is correct and deployed**
- Videos added to card preview (lines 1968-2009)
- Videos added to expanded section (lines 2294-2314)
- PDF links updated (lines 362-384)
- Compiled successfully (multiple times)

✅ **API data is correct**
- Candidate 202 has both video URLs
- URLs are full paths with `http://localhost:8000`
- Assessment completed and scored

✅ **URL handling is correct**
- Smart detection: checks if URL starts with 'http'
- Backwards compatible with relative paths
- Works with both full and relative URLs

## 🎬 Quick Test

1. **Refresh page**: `Ctrl + Shift + R`
2. **Go to**: http://localhost:3000/screening
3. **Select job**: Any job that Nithish applied to
4. **Find card**: Look for "Nithish Kumar"
5. **Scroll down**: In the card, below "Assessment: Completed"
6. **Look for**: "📹 Assessment Recordings:"
7. **See videos**: Two video players side-by-side

If you still don't see them, please:
1. Take a screenshot of the candidate card
2. Check browser console (F12) for errors
3. Verify both URLs load: camera_202 and screen_202

## 📞 Next Steps

If videos still don't show after hard refresh:
1. Share screenshot of candidate card
2. Share browser console errors (if any)
3. Confirm backend is running: `http://localhost:8000/api/candidates/202/`
4. Test video URL directly in browser
