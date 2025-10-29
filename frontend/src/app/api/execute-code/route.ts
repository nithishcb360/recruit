import { NextRequest, NextResponse } from 'next/server'

// Language ID mappings for Judge0 API
const LANGUAGE_IDS: Record<string, number> = {
  'python': 71,      // Python 3
  'javascript': 63,  // JavaScript (Node.js)
  'java': 62,        // Java
  'cpp': 54,         // C++ (GCC)
  'c': 50,           // C (GCC)
  'typescript': 74,  // TypeScript
  'go': 60,          // Go
  'rust': 73,        // Rust
}

export async function POST(request: NextRequest) {
  try {
    const { language, code, input } = await request.json()

    if (!language || !code) {
      return NextResponse.json(
        { error: 'Language and code are required' },
        { status: 400 }
      )
    }

    const languageId = LANGUAGE_IDS[language]
    if (!languageId) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      )
    }

    // Use Judge0 CE (free, open-source code execution system)
    // You can host your own instance or use the public API with rate limits
    const JUDGE0_API = process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com'
    const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '' // Optional: Get from RapidAPI

    // Create submission
    const submissionResponse = await fetch(`${JUDGE0_API}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(JUDGE0_API_KEY && {
          'X-RapidAPI-Key': JUDGE0_API_KEY,
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        })
      },
      body: JSON.stringify({
        language_id: languageId,
        source_code: code,
        stdin: input || '',
        cpu_time_limit: 5, // 5 seconds max
        memory_limit: 128000, // 128 MB
      })
    })

    if (!submissionResponse.ok) {
      // Fallback: Return a mock execution result if Judge0 is not available
      return NextResponse.json({
        output: `Note: Code execution service is not configured.\n\nYour code:\n${code}\n\nPlease ensure your code is correct. It will be manually reviewed.`,
        demo: true
      })
    }

    const result = await submissionResponse.json()

    // Check execution result
    if (result.status?.id === 3) {
      // Success
      return NextResponse.json({
        output: result.stdout || '(No output)',
        stderr: result.stderr || '',
        time: result.time,
        memory: result.memory
      })
    } else if (result.status?.id === 6) {
      // Compilation error
      return NextResponse.json({
        error: result.compile_output || 'Compilation failed',
        type: 'compilation'
      })
    } else if (result.status?.id === 5) {
      // Time limit exceeded
      return NextResponse.json({
        error: 'Time limit exceeded (max 5 seconds)',
        type: 'timeout'
      })
    } else if (result.status?.id === 11 || result.status?.id === 12) {
      // Runtime error
      return NextResponse.json({
        error: result.stderr || 'Runtime error',
        type: 'runtime'
      })
    } else {
      // Other errors
      return NextResponse.json({
        error: result.stderr || result.message || 'Execution failed',
        status: result.status?.description
      })
    }

  } catch (error) {
    console.error('Error executing code:', error)

    // Return a friendly error with instructions
    return NextResponse.json({
      output: `Code execution service is currently unavailable.\n\nYour code has been saved and will be reviewed manually.\n\nPlease continue with the assessment.`,
      demo: true
    })
  }
}
