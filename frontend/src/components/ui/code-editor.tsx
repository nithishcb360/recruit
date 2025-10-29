"use client"

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Loader2, Terminal } from 'lucide-react'

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  question: string
}

interface LanguageConfig {
  id: string
  name: string
  template: string
  comment: string
}

const LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    name: 'Python',
    template: '# Write your code here\ndef solution():\n    pass\n\n# Test your code\nsolution()',
    comment: '#'
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    template: '// Write your code here\nfunction solution() {\n    \n}\n\n// Test your code\nsolution();',
    comment: '//'
  },
  {
    id: 'java',
    name: 'Java',
    template: 'public class Solution {\n    public static void main(String[] args) {\n        // Write your code here\n        \n    }\n}',
    comment: '//'
  },
  {
    id: 'cpp',
    name: 'C++',
    template: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}',
    comment: '//'
  },
  {
    id: 'c',
    name: 'C',
    template: '#include <stdio.h>\n\nint main() {\n    // Write your code here\n    \n    return 0;\n}',
    comment: '//'
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    template: '// Write your code here\nfunction solution(): void {\n    \n}\n\n// Test your code\nsolution();',
    comment: '//'
  },
  {
    id: 'go',
    name: 'Go',
    template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your code here\n    \n}',
    comment: '//'
  },
  {
    id: 'rust',
    name: 'Rust',
    template: 'fn main() {\n    // Write your code here\n    \n}',
    comment: '//'
  }
]

export function CodeEditor({ value, onChange, question }: CodeEditorProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python')
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [input, setInput] = useState<string>('')

  const handleLanguageChange = (langId: string) => {
    setSelectedLanguage(langId)
    const language = LANGUAGES.find(lang => lang.id === langId)
    if (language && !value) {
      onChange(language.template)
    }
  }

  const handleRunCode = async () => {
    setIsRunning(true)
    setOutput('')

    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          language: selectedLanguage,
          code: value,
          input: input
        })
      })

      const result = await response.json()

      if (response.ok) {
        if (result.error) {
          setOutput(`Error:\n${result.error}`)
        } else {
          setOutput(result.output || 'Code executed successfully (no output)')
        }
      } else {
        setOutput(`Execution failed: ${result.message || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error executing code:', error)
      setOutput('Failed to execute code. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
          <SelectTrigger className="w-48 bg-white text-black border-gray-300 font-semibold">
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent className="bg-white border-gray-300">
            {LANGUAGES.map(lang => (
              <SelectItem key={lang.id} value={lang.id} className="text-black font-medium hover:bg-gray-100">
                {lang.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={handleRunCode}
          disabled={isRunning || !value}
          className="bg-green-600 hover:bg-green-700 text-white font-bold"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Code
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Code Editor */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-black">Code Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Write your code here..."
              className="font-mono text-sm min-h-[300px] resize-y bg-white text-black border-gray-300"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* Input */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold text-black">Input (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Provide input for your program (if needed)..."
              className="font-mono text-sm min-h-[80px] bg-white text-black border-gray-300"
            />
          </CardContent>
        </Card>

        {/* Output */}
        {output && (
          <Card className="bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-black flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="font-mono text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto whitespace-pre-wrap">
                {output}
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
