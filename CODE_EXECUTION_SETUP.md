# WebDesk Code Execution Setup

The WebDesk assessment platform includes a multi-language code compiler that allows candidates to write and execute code during assessments.

## Supported Languages

- Python 3
- JavaScript (Node.js)
- TypeScript
- Java
- C++ (GCC)
- C (GCC)
- Go
- Rust

## Setup Options

### Option 1: Use RapidAPI Judge0 CE (Easiest)

1. Sign up at [RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Subscribe to the free tier (500 requests/day)
3. Copy your API key
4. Add to `frontend/.env.local`:
   ```
   JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
   JUDGE0_API_KEY=your_rapidapi_key_here
   ```

### Option 2: Self-Host Judge0 CE (Recommended for Production)

1. Install Docker and Docker Compose
2. Clone Judge0 CE:
   ```bash
   git clone https://github.com/judge0/judge0
   cd judge0
   ```
3. Start Judge0:
   ```bash
   docker-compose up -d
   ```
4. Add to `frontend/.env.local`:
   ```
   JUDGE0_API_URL=http://localhost:2358
   ```

### Option 3: Fallback Mode (No External Dependencies)

If neither option is configured, the system will run in fallback mode:
- Code is saved and stored with assessment results
- Mock execution results are shown to candidates
- Code will be manually reviewed by recruiters
- No external API calls are made

Simply leave the environment variables empty or don't create the `.env.local` file.

## Features

### For Candidates:
- **Multi-language support**: Choose from 8 popular programming languages
- **Real-time code execution**: Run code and see output instantly
- **Input support**: Provide custom input for testing
- **Syntax highlighting**: Code editor with monospace font
- **Error messages**: Clear compilation and runtime error feedback
- **Time limits**: 5-second execution timeout per run
- **Memory limits**: 128MB per execution

### For Recruiters:
- **Code review**: All submitted code is stored for manual review
- **Execution history**: See if candidate tested their code
- **Language choice tracking**: Know which language candidate used
- **Anti-cheating**: Code execution is monitored and recorded

## Security Features

- Sandboxed execution (via Judge0)
- Time limits prevent infinite loops
- Memory limits prevent resource exhaustion
- Code is executed in isolated containers
- No network access during execution
- No file system access

## Testing the Setup

1. Start the frontend: `npm run dev`
2. Navigate to WebDesk assessment
3. Find a coding question
4. Select a language from the dropdown
5. Write a simple program (e.g., `print("Hello, World!")` in Python)
6. Click "Run Code"
7. Verify output appears below the editor

## Troubleshooting

### "Code execution service is currently unavailable"
- Check your JUDGE0_API_URL and JUDGE0_API_KEY in `.env.local`
- Verify Judge0 service is running (if self-hosted)
- Check RapidAPI subscription status
- Review browser console for errors

### Slow execution
- RapidAPI free tier may have rate limits
- Consider self-hosting for better performance
- Check network connectivity

### Compilation errors
- Verify the code syntax is correct for the selected language
- Check language version compatibility
- Review error messages carefully

## Cost Considerations

**RapidAPI Free Tier:**
- 500 requests/day
- Suitable for small teams (5-10 assessments/day)
- No credit card required

**RapidAPI Pro:**
- $5-50/month for higher limits
- Good for medium teams

**Self-Hosted:**
- Free (open source)
- Requires server resources (2GB RAM minimum)
- Recommended for large teams or high-volume usage

## Architecture

```
WebDesk Frontend
    ↓
Next.js API Route (/api/execute-code)
    ↓
Judge0 API (RapidAPI or Self-Hosted)
    ↓
Isolated Docker Container
    ↓
Code Execution Result
    ↓
Return to Frontend
```

## Example Code Templates

The system provides starter templates for each language:

**Python:**
```python
# Write your code here
def solution():
    pass

# Test your code
solution()
```

**JavaScript:**
```javascript
// Write your code here
function solution() {

}

// Test your code
solution();
```

**Java:**
```java
public class Solution {
    public static void main(String[] args) {
        // Write your code here

    }
}
```

## License

Judge0 CE is licensed under GNU General Public License v3.0
