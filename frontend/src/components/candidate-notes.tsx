"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { StickyNote, Plus, Calendar, User } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Note {
  id: number
  content: string
  created_at: string
  created_by: string
  type: 'general' | 'interview' | 'screening' | 'feedback'
}

interface CandidateNotesProps {
  candidateId: number
  candidateName: string
  isOpen: boolean
  onClose: () => void
}

export default function CandidateNotes({
  candidateId,
  candidateName,
  isOpen,
  onClose
}: CandidateNotesProps) {
  const { toast } = useToast()
  const [notes, setNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadNotes()
    }
  }, [isOpen, candidateId])

  const loadNotes = async () => {
    setIsLoading(true)
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock notes data
      const mockNotes: Note[] = [
        {
          id: 1,
          content: "Initial phone screening completed. Candidate shows strong technical background and good communication skills. Interested in remote work opportunities.",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          created_by: "Sarah Johnson",
          type: 'screening'
        },
        {
          id: 2,
          content: "Technical interview scheduled for next Tuesday at 2 PM. Focus areas: React, Node.js, and system design.",
          created_at: new Date(Date.now() - 172800000).toISOString(),
          created_by: "Mike Chen",
          type: 'interview'
        },
        {
          id: 3,
          content: "Candidate has 5+ years experience with our tech stack. Salary expectation is within our budget range.",
          created_at: new Date(Date.now() - 259200000).toISOString(),
          created_by: "HR Team",
          type: 'general'
        }
      ]
      
      setNotes(mockNotes)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notes. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return

    setIsSaving(true)
    try {
      // Mock API call - replace with actual API
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const note: Note = {
        id: Date.now(),
        content: newNote,
        created_at: new Date().toISOString(),
        created_by: "Current User",
        type: 'general'
      }
      
      setNotes(prev => [note, ...prev])
      setNewNote("")
      
      toast({
        title: "Note Added",
        description: "Your note has been saved successfully.",
        variant: "default"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTypeColor = (type: Note['type']) => {
    const colors = {
      'general': 'bg-blue-100 text-blue-800',
      'interview': 'bg-purple-100 text-purple-800',
      'screening': 'bg-green-100 text-green-800',
      'feedback': 'bg-orange-100 text-orange-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Notes for {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Note */}
          <Card>
            <CardHeader className="pb-3">
              <h3 className="text-sm font-medium text-black">Add New Note</h3>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Enter your note about this candidate..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <button 
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Add Note"}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Notes List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-black">Loading notes...</p>
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-8">
                <StickyNote className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-black">No notes yet</p>
                <p className="text-sm text-gray-600">Add your first note above</p>
              </div>
            ) : (
              notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getInitials(note.created_by)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-black">{note.created_by}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Calendar className="h-3 w-3" />
                              {formatDate(note.created_at)}
                            </div>
                          </div>
                        </div>
                        <Badge className={getTypeColor(note.type)}>
                          {note.type}
                        </Badge>
                      </div>
                      <p className="text-sm leading-relaxed text-black">{note.content}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button 
            onClick={onClose}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}