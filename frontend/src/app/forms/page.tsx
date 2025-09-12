"use client"
 
import { Badge } from "@/components/ui/badge"
 
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Send, Trash, Edit, Save, XCircle, MessageSquareText, Star, ListChecks, Loader2, Image, Video, Calendar, Clock, Radio, CalendarClock, Eye } from "lucide-react"
import {
  getFeedbackTemplates,
  createFeedbackTemplate,
  updateFeedbackTemplate,
  deleteFeedbackTemplate,
  publishFeedbackTemplate,
  unpublishFeedbackTemplate,
  type FeedbackTemplate,
  type Question
} from "@/lib/api/feedback-templates"
import { saveFormResponse, getFormResponses, deleteFormResponse, cleanupFormResponsesStorage, type FormResponse } from "@/lib/api/form-responses"

// Helper function for fetch with timeout and complete error suppression
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 3000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  // Store original console.error to restore later
  const originalError = console.error
  
  try {
    // Temporarily suppress console.error for fetch calls
    console.error = () => {}
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    console.error = originalError // Restore console.error
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    console.error = originalError // Restore console.error
    
    // Create a clean error without exposing connection details
    if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
      throw new Error('Backend unavailable')
    }
    throw error
  }
}
import { useToast } from "@/hooks/use-toast"
 
 
export default function FeedbackFormBuilder() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("forms")
  const [forms, setForms] = useState<FeedbackTemplate[]>([])
  const [editingForm, setEditingForm] = useState<FeedbackTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newQuestionText, setNewQuestionText] = useState("")
  const [newQuestionType, setNewQuestionType] = useState<Question["type"]>("text")
  const [newQuestionOptions, setNewQuestionOptions] = useState("")
  const [newQuestionRequired, setNewQuestionRequired] = useState(false)
  const [previewForm, setPreviewForm] = useState<FeedbackTemplate | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isFillingForm, setIsFillingForm] = useState(false)
  const [formResponses, setFormResponses] = useState<Record<number, any>>({})
  const [savedFormResponses, setSavedFormResponses] = useState<FormResponse[]>([])
  const [savingQuestions, setSavingQuestions] = useState<Set<number>>(new Set())
  const [builderResponses, setBuilderResponses] = useState<Record<number, any>>({})
  const [isFillingInBuilder, setIsFillingInBuilder] = useState(false)

  // Helper functions for local storage
  const saveFormsToLocalStorage = (forms: FeedbackTemplate[]) => {
    try {
      localStorage.setItem('feedback-forms', JSON.stringify(forms))
    } catch (error) {
      console.warn('Failed to save forms to localStorage:', error)
    }
  }

  const loadFormsFromLocalStorage = (): FeedbackTemplate[] => {
    try {
      const stored = localStorage.getItem('feedback-forms')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.warn('Failed to load forms from localStorage:', error)
      return []
    }
  }
 
  // Load feedback templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        
        // Clean up any corrupted form response data on startup
        cleanupFormResponsesStorage()
        
        // Try to load from backend first
        let backendForms: FeedbackTemplate[] = []
        try {
          const response = await getFeedbackTemplates()
          backendForms = response.results
        } catch (error) {
          console.warn('Backend not available, using local storage:', error)
        }
        
        // Load locally created forms
        const localForms = loadFormsFromLocalStorage()
        
        // Combine backend and local forms, remove duplicates
        const allForms = [...backendForms, ...localForms]
        const uniqueForms = allForms.filter((form, index, array) => 
          array.findIndex(f => f.id === form.id) === index
        )
        
        setForms(uniqueForms)
      } catch (error) {
        console.error('Error loading feedback templates:', error)
        // Fallback to local storage only
        const localForms = loadFormsFromLocalStorage()
        setForms(localForms)
        
        toast({
          title: "Offline Mode",
          description: "Loading forms from local storage. Backend not available.",
          variant: "default"
        })
      } finally {
        setIsLoading(false)
      }
    }
 
    fetchTemplates()
  }, [toast])
 
  const handleCreateNewForm = () => {
    setEditingForm({
      id: 0, // New form
      name: "New Feedback Form",
      description: "",
      questions: [],
      sections: [],
      rating_criteria: [],
      status: "draft",
      is_active: true,
      is_default: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    setActiveTab("builder")
  }
 
  const handleEditForm = async (form: FeedbackTemplate) => {
    // Check if this is a local form (timestamp-based ID > 1000000000000)
    const isLocalForm = form.id > 1000000000000
    
    if (!isLocalForm) {
      // Only try backend validation for server forms
      try {
        const response = await fetchWithTimeout(`http://localhost:8000/api/feedback-templates/${form.id}/`, {
          method: 'GET'
        })
        
        if (!response.ok && response.status === 404) {
          toast({
            title: "Note",
            description: `Form "${form.name}" not found on server. Editing locally.`,
            variant: "default"
          })
        }
      } catch (error) {
        console.warn('Backend validation failed, editing locally:', error)
        toast({
          title: "Offline Mode", 
          description: "Editing form locally. Backend not available.",
          variant: "default"
        })
      }
    }
    
    // Always proceed with editing regardless of backend status
    setEditingForm({ ...form })
    setActiveTab("builder")
  }
 
  const handleSaveForm = async () => {
    if (!editingForm) return
 
    // Debug logging to understand form state

    try {
      setIsSubmitting(true)
     
      const formData = {
        name: editingForm.name,
        description: editingForm.description,
        questions: editingForm.questions,
        status: editingForm.status,
        is_active: editingForm.is_active,
        is_default: editingForm.is_default
      }
 
      let savedForm: FeedbackTemplate
     
      // Check if this is a new form (ID is 0, null, or undefined)
      if (!editingForm.id || editingForm.id === 0) {
        // Create new form
        try {
          savedForm = await createFeedbackTemplate(formData)
        } catch (error) {
          // If backend fails, create locally with unique ID
          console.warn('Backend create failed, creating locally:', error)
          savedForm = {
            ...formData,
            id: Date.now(), // Use timestamp as unique ID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sections: [],
            rating_criteria: []
          } as FeedbackTemplate
        }
        
        setForms(prev => {
          const newForms = [...prev, savedForm]
          // Save updated forms to localStorage
          saveFormsToLocalStorage(newForms)
          return newForms
        })
        
        toast({
          title: "Success!",
          description: `Feedback form "${savedForm.name}" has been created.`,
          variant: "default"
        })
      } else {
        // Update existing form
        console.log('Updating form with ID:', editingForm.id, 'Data:', formData)
        
        // Validate that we have a valid ID before attempting update
        if (!editingForm.id || editingForm.id === 0) {
          throw new Error('Cannot update form: Invalid or missing form ID')
        }
        
        const isLocalForm = editingForm.id > 1000000000000
        let updateFailed = false
        
        if (isLocalForm) {
          // For local forms, skip backend call and update locally
          updateFailed = true
          savedForm = {
            ...editingForm,
            ...formData,
            updated_at: new Date().toISOString()
          }
        } else {
          // For server forms, try backend update first
          try {
            savedForm = await updateFeedbackTemplate(editingForm.id, formData)
          } catch (updateError: any) {
            // If backend update fails, update locally
            console.warn('Backend update failed, updating locally:', updateError)
            updateFailed = true
            savedForm = {
              ...editingForm,
              ...formData,
              updated_at: new Date().toISOString()
            }
          }
        }
        
        setForms(prev => {
          const updatedForms = prev.map(f => f.id === savedForm.id ? savedForm : f)
          // Save updated forms to localStorage
          saveFormsToLocalStorage(updatedForms)
          return updatedForms
        })
        
        toast({
          title: updateFailed ? "Offline Update" : "Success!",
          description: updateFailed 
            ? "Form updated locally. Backend not available." 
            : `Feedback form "${savedForm.name}" has been updated.`,
          variant: "default"
        })
      }
     
      setEditingForm(null)
      setActiveTab("forms")
     
    } catch (error: any) {
      console.error('Error saving feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
 
  const handleDeleteForm = async (id: number) => {
    if (!confirm("Are you sure you want to delete this form?")) return
   
    try {
      setIsSubmitting(true)
      try {
        await deleteFeedbackTemplate(id)
      } catch (error) {
        console.warn('Backend delete failed, deleting locally:', error)
      }
      
      setForms(prev => {
        const filteredForms = prev.filter(form => form.id !== id)
        // Save updated forms to localStorage
        saveFormsToLocalStorage(filteredForms)
        return filteredForms
      })
      toast({
        title: "Success!",
        description: "Feedback form has been deleted.",
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error deleting feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenForm = async (form: FeedbackTemplate) => {
    setPreviewForm(form)
    setIsPreviewOpen(true)
    setIsFillingForm(false)
    setFormResponses({})
    
    // Load existing responses for this form
    try {
      const responses = await getFormResponses(form.id)
      setSavedFormResponses(responses)
      
      // Populate form responses state with existing data
      const responseMap: Record<number, any> = {}
      console.log('Loading saved form responses:', responses.length, 'responses found')
      
      responses.forEach(response => {
        console.log(`Processing response for question ${response.question_id}:`, {
          type: response.response_type,
          fileName: response.file_name,
          fileType: response.file_type,
          hasFileData: !!response.response_file,
          fileDataPreview: response.response_file?.substring(0, 50)
        })
        
        if (response.response_type === 'text' || response.response_type === 'textarea') {
          responseMap[response.question_id] = response.response_text || ''
        } else if (response.response_type === 'audio' || response.response_type === 'video') {
          responseMap[response.question_id] = {
            name: response.file_name,
            type: response.file_type,
            data: response.response_file,
            uploadType: response.response_type
          }
        }
      })
      setFormResponses(responseMap)
      
      console.log('Form responses state updated:', Object.keys(responseMap))
    } catch (error) {
      console.error('Error loading form responses:', error)
      setSavedFormResponses([])
    }
  }

  const handleStartFilling = () => {
    setIsFillingForm(true)
    // Don't clear formResponses - keep existing saved responses
  }

  const handleResponseChange = (questionId: number, value: any) => {
    setFormResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleFileUpload = async (questionId: number, file: File, type: 'audio' | 'video') => {
    try {
      // Convert file to base64 for persistent storage
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setFormResponses(prev => ({
        ...prev,
        [questionId]: {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data, // Store as base64
          uploadType: type
        }
      }))
    } catch (error) {
      console.error('Error converting file:', error)
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSaveIndividualQuestion = async (questionId: number) => {
    if (!previewForm) return
    
    const response = formResponses[questionId]
    if (!response) {
      toast({
        title: "No Response",
        description: "Please add a response before saving.",
        variant: "destructive"
      })
      return
    }

    setSavingQuestions(prev => new Set([...prev, questionId]))

    try {
      const question = previewForm.questions.find(q => q.id === questionId)
      if (!question) throw new Error('Question not found')

      let responseData
      if (question.type === 'text' || question.type === 'textarea') {
        responseData = {
          form_id: previewForm.id,
          question_id: questionId,
          response_text: response,
          response_type: question.type as 'text' | 'textarea'
        }
      } else if (question.type === 'audio' || question.type === 'video') {
        responseData = {
          form_id: previewForm.id,
          question_id: questionId,
          response_file: response.data,
          file_name: response.name,
          file_type: response.type,
          response_type: question.type as 'audio' | 'video'
        }
      } else {
        throw new Error('Unsupported question type')
      }

      const savedResponse = await saveFormResponse(responseData)
      console.log('Response saved successfully:', savedResponse)
      
      // Update saved responses
      const responses = await getFormResponses(previewForm.id)
      console.log('Reloaded responses after save:', responses.length, 'responses')
      setSavedFormResponses(responses)

      // Show appropriate success message based on storage method
      const isLocalStorage = savedResponse.id && savedResponse.id > 1000000000000 // localStorage uses timestamp IDs
      toast({
        title: isLocalStorage ? "Saved Locally!" : "Saved!",
        description: isLocalStorage ? 
          `Response saved to local storage (backend unavailable). Data will persist until browser storage is cleared.` :
          `Response for question ${questionId} has been saved to server.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Error saving question response:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: "Save Failed",
        description: `Failed to save response: ${errorMessage}. Please check your connection and try again.`,
        variant: "destructive"
      })
    } finally {
      setSavingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }

  const handleSaveResponses = () => {
    if (!previewForm) return
    
    // Filter out empty responses
    const filteredResponses = Object.entries(formResponses)
      .filter(([_, value]) => {
        if (typeof value === 'string') {
          return value.trim() !== ''
        }
        if (typeof value === 'object' && value !== null) {
          return value.data || value.name // For file uploads
        }
        return value !== null && value !== undefined && value !== ''
      })
      .reduce((acc, [key, value]) => {
        acc[parseInt(key)] = value
        return acc
      }, {} as Record<number, any>)

    // Save responses to localStorage for demo
    const responseData = {
      formId: previewForm.id,
      formName: previewForm.name,
      responses: filteredResponses,
      totalQuestions: previewForm.questions.length,
      answeredQuestions: Object.keys(filteredResponses).length,
      submittedAt: new Date().toISOString()
    }
    
    console.log('Saving response data:', responseData) // Debug log
    console.log('Form responses state:', formResponses) // Debug current state
    
    try {
      const existingResponses = localStorage.getItem('form-responses')
      const responses = existingResponses ? JSON.parse(existingResponses) : []
      responses.push(responseData)
      localStorage.setItem('form-responses', JSON.stringify(responses))
      
      console.log('All responses saved:', responses) // Debug log
      
      toast({
        title: "Success!",
        description: `Your responses have been saved successfully. (${Object.keys(filteredResponses).length} answers)`,
        variant: "default"
      })
      
      setIsFillingForm(false)
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Error",
        description: "Failed to save responses. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleBuilderResponseChange = (questionId: number, value: any) => {
    setBuilderResponses(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  const handleBuilderFileUpload = async (questionId: number, file: File, type: 'audio' | 'video') => {
    try {
      // Convert file to base64 for persistent storage
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      setBuilderResponses(prev => ({
        ...prev,
        [questionId]: {
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64Data,
          uploadType: type
        }
      }))
    } catch (error) {
      console.error('Error converting file:', error)
      toast({
        title: "Error",
        description: "Failed to upload file. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleSaveBuilderQuestion = async (questionId: number) => {
    if (!editingForm) return
    
    const response = builderResponses[questionId]
    if (!response) {
      toast({
        title: "No Response",
        description: "Please add a response before saving.",
        variant: "destructive"
      })
      return
    }

    setSavingQuestions(prev => new Set([...prev, questionId]))

    try {
      const question = editingForm.questions.find(q => q.id === questionId)
      if (!question) throw new Error('Question not found')

      let responseData
      if (question.type === 'text' || question.type === 'textarea') {
        responseData = {
          form_id: editingForm.id,
          question_id: questionId,
          response_text: response,
          response_type: question.type as 'text' | 'textarea'
        }
      } else if (question.type === 'audio' || question.type === 'video') {
        responseData = {
          form_id: editingForm.id,
          question_id: questionId,
          response_file: response.data,
          file_name: response.name,
          file_type: response.type,
          response_type: question.type as 'audio' | 'video'
        }
      } else {
        throw new Error('Unsupported question type')
      }

      await saveFormResponse(responseData)

      toast({
        title: "Question Saved!",
        description: `Response for this question has been saved.`,
        variant: "default"
      })
    } catch (error) {
      console.error('Error saving builder question response:', error)
      toast({
        title: "Error",
        description: "Failed to save response. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSavingQuestions(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }
 
  const handlePublishForm = async (id: number) => {
    try {
      setIsSubmitting(true)
      await publishFeedbackTemplate(id)
      setForms(prev => prev.map(form =>
        form.id === id ? { ...form, status: "published" } : form
      ))
      toast({
        title: "Success!",
        description: "Feedback form has been published.",
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error publishing feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to publish feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
 
  const handleUnpublishForm = async (id: number) => {
    try {
      setIsSubmitting(true)
      await unpublishFeedbackTemplate(id)
      setForms(prev => prev.map(form =>
        form.id === id ? { ...form, status: "draft" } : form
      ))
      toast({
        title: "Success!",
        description: "Feedback form has been unpublished.",
        variant: "default"
      })
    } catch (error: any) {
      console.error('Error unpublishing feedback form:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to unpublish feedback form. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
 
  const handleAddQuestion = () => {
    if (!editingForm || !newQuestionText) return
 
    const newQ: Question = {
      id: editingForm.questions.length ? Math.max(...editingForm.questions.map((q) => q.id)) + 1 : 1,
      text: newQuestionText,
      type: newQuestionType,
      required: newQuestionRequired,
    }
    
 
    setEditingForm((prev) => {
      const updated = prev ? { ...prev, questions: [...prev.questions, newQ] } : null
      return updated
    })
    setNewQuestionText("")
    setNewQuestionType("text")
    setNewQuestionOptions("")
    setNewQuestionRequired(false)
  }
 
  const handleRemoveQuestion = (id: number) => {
    setEditingForm((prev) => (prev ? { ...prev, questions: prev.questions.filter((q) => q.id !== id) } : null))
  }
 
  const handleQuestionPropertyChange = (questionId: number, field: keyof Question, value: any) => {
    setEditingForm((prev) =>
      prev
        ? {
            ...prev,
            questions: prev.questions.map((q) => (q.id === questionId ? { ...q, [field]: value } : q)),
          }
        : null,
    )
  }
 
  const getQuestionIcon = (type: Question["type"]) => {
    switch (type) {
      case "text":
      case "textarea":
        return <MessageSquareText className="h-4 w-4" />
      case "audio":
        return <Radio className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      default:
        return <MessageSquareText className="h-4 w-4" />
    }
  }
 
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feedback Form Builder</h1>
        <p className="text-muted-foreground">Create and manage custom feedback forms for interviews and assessments.</p>
      </div>
 
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="forms">Your Forms</TabsTrigger>
          <TabsTrigger value="builder" disabled={!editingForm}>
            Form Builder
          </TabsTrigger>
        </TabsList>
 
        <TabsContent value="forms" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>Existing Feedback Forms</CardTitle>
              <Button onClick={handleCreateNewForm} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" /> Create New Form
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading feedback forms...</span>
                </div>
              ) : forms.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No feedback forms created yet.</div>
              ) : (
                <div className="space-y-4">
                  {forms.map((form, formIndex) => (
                    <div key={`form-${form.id}-${formIndex}`} className="border rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{form.name}</h3>
                        <p className="text-sm text-muted-foreground">{form.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={form.status === "published" ? "default" : "secondary"}>
                            {form.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {form.questions.length} questions
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleEditForm(form)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {form.status === "draft" ? (
                          <Button
                            size="sm"
                            onClick={() => handlePublishForm(form.id)}
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:text-white"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleUnpublishForm(form.id)}
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:text-white"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleOpenForm(form)}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleDeleteForm(form.id)}
                          disabled={isSubmitting}
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:text-white"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
 
        <TabsContent value="builder" className="mt-4">
          {editingForm && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="form-name">Form Name</Label>
                    <Input
                      id="form-name"
                      value={editingForm.name}
                      onChange={(e) => setEditingForm({ ...editingForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="form-description">Description</Label>
                    <Textarea
                      id="form-description"
                      value={editingForm.description}
                      onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>
 
              <Card>
                <CardHeader>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>Add and manage questions for this feedback form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {editingForm.questions && editingForm.questions.length > 0 ? (
                      editingForm.questions.map((question, questionIndex) => (
                      <div key={`edit-question-${question.id || questionIndex}`} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getQuestionIcon(question.type)}
                            <span className="font-medium">Question {question.id}</span>
                            <Badge variant="secondary">{question.type}</Badge>
                            {question.required && <Badge variant="outline">Required</Badge>}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={handleSaveForm}
                              disabled={isSubmitting}
                              className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400 disabled:text-white"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRemoveQuestion(question.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Input
                            value={question.text}
                            onChange={(e) =>
                              handleQuestionPropertyChange(question.id, "text", e.target.value)
                            }
                            placeholder="Question text..."
                          />
                          <div className="flex gap-4">
                            <Select
                              value={question.type}
                              onValueChange={(value) =>
                                handleQuestionPropertyChange(question.id, "type", value)
                              }
                            >
                              <SelectTrigger className="w-40 text-black">
                                <SelectValue className="text-black" />
                              </SelectTrigger>
                              <SelectContent className="text-black bg-white border border-gray-200">
                                <SelectItem value="text" className="text-black">Text</SelectItem>
                                <SelectItem value="textarea" className="text-black">Textarea</SelectItem>
                                <SelectItem value="audio" className="text-black">Audio</SelectItem>
                                <SelectItem value="video" className="text-black">Video</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`required-${question.id}`}
                                checked={question.required}
                                onCheckedChange={(checked) =>
                                  handleQuestionPropertyChange(question.id, "required", checked)
                                }
                              />
                              <Label htmlFor={`required-${question.id}`}>Required</Label>
                            </div>
                          </div>
                          {/* {question.type === "text" && (
                            <div className="mt-2">
                              <label className="text-sm text-gray-600">Text Input Preview:</label>
                              <Input
                                placeholder="User can type text here..."
                                className="bg-white border border-gray-300 mt-1"
                              />
                            </div>
                          )}
                          {question.type === "textarea" && (
                            <div className="mt-2">
                              <label className="text-sm text-gray-600">Textarea Preview:</label>
                              <Textarea
                                placeholder="User can type long text here..."
                                rows={3}
                                className="bg-white border border-gray-300 mt-1"
                              />
                            </div>
                          )}
                          {question.type === "audio" && (
                            <div className="mt-2">
                              <label className="text-sm text-gray-600">Audio Upload Preview:</label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white mt-1">
                                <Radio className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 mb-2">User can upload audio files here</p>
                                <input type="file" accept="audio/*" className="text-sm text-gray-600" />
                              </div>
                            </div>
                          )}
                          {question.type === "video" && (
                            <div className="mt-2">
                              <label className="text-sm text-gray-600">Video Upload Preview:</label>
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white mt-1">
                                <Video className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 mb-2">User can upload video files here</p>
                                <input type="file" accept="video/*" className="text-sm text-gray-600" />
                              </div>
                            </div>
                          )} */}

                          {/* Add Response Section for each question in builder */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <h5 className="font-medium text-gray-900">Test This Question</h5>
                              <Button
                                size="sm"
                                onClick={() => setIsFillingInBuilder(!isFillingInBuilder)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                {isFillingInBuilder ? 'Hide Response' : 'Add Response'}
                              </Button>
                            </div>
                            
                            {isFillingInBuilder && (
                              <div className="space-y-3">
                                {question.type === "text" && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Your Response:</label>
                                    <Input
                                      value={builderResponses[question.id] || ''}
                                      onChange={(e) => handleBuilderResponseChange(question.id, e.target.value)}
                                      placeholder="Type your response here..."
                                      className="mt-1"
                                    />
                                  </div>
                                )}
                                
                                {question.type === "textarea" && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Your Response:</label>
                                    <Textarea
                                      value={builderResponses[question.id] || ''}
                                      onChange={(e) => handleBuilderResponseChange(question.id, e.target.value)}
                                      placeholder="Type your detailed response here..."
                                      rows={3}
                                      className="mt-1"
                                    />
                                  </div>
                                )}
                                
                                {question.type === "audio" && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Upload Audio:</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mt-1">
                                      <Radio className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                                      <input
                                        type="file"
                                        accept="audio/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleBuilderFileUpload(question.id, file, 'audio');
                                          }
                                        }}
                                        className="text-sm"
                                      />
                                    </div>
                                    {builderResponses[question.id] && (
                                      <div className="bg-blue-50 p-2 rounded mt-2">
                                        <p className="text-sm text-blue-700">{builderResponses[question.id].name}</p>
                                        <audio controls className="mt-1 w-full">
                                          <source src={builderResponses[question.id].data} type={builderResponses[question.id].type} />
                                        </audio>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {question.type === "video" && (
                                  <div>
                                    <label className="text-sm font-medium text-gray-700">Upload Video:</label>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center mt-1">
                                      <Video className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                                      <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleBuilderFileUpload(question.id, file, 'video');
                                          }
                                        }}
                                        className="text-sm"
                                      />
                                    </div>
                                    {builderResponses[question.id] && (
                                      <div className="bg-purple-50 p-2 rounded mt-2">
                                        <p className="text-sm text-purple-700">{builderResponses[question.id].name}</p>
                                        <video controls className="mt-1 w-full max-w-xs">
                                          <source src={builderResponses[question.id].data} type={builderResponses[question.id].type} />
                                        </video>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="flex justify-end">
                                  <Button
                                    onClick={() => handleSaveBuilderQuestion(question.id)}
                                    disabled={savingQuestions.has(question.id) || !builderResponses[question.id]}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400"
                                  >
                                    {savingQuestions.has(question.id) ? (
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                      <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Save Response
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                    ) : (
                      <div className="text-center text-gray-500 py-4">
                        No questions added yet. Use the form below to add questions.
                      </div>
                    )}
                  </div>
 
                  <div className="border-2 border-dashed rounded-lg p-6">
                    <h4 className="font-medium mb-4">Add New Question</h4>
                    <div className="space-y-4">
                      <Input
                        value={newQuestionText}
                        onChange={(e) => setNewQuestionText(e.target.value)}
                        placeholder="Enter question text..."
                      />
                      <div className="flex gap-4">
                        <Select
                          value={newQuestionType}
                          onValueChange={(value) => setNewQuestionType(value as Question["type"])}
                        >
                          <SelectTrigger className="w-40 text-black">
                            <SelectValue className="text-black" />
                          </SelectTrigger>
                          <SelectContent className="text-black bg-white border border-gray-200">
                            <SelectItem value="text" className="text-black">Text</SelectItem>
                            <SelectItem value="textarea" className="text-black">Textarea</SelectItem>
                            <SelectItem value="audio" className="text-black">Audio</SelectItem>
                            <SelectItem value="video" className="text-black">Video</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="new-required"
                            checked={newQuestionRequired}
                            onCheckedChange={(checked) => setNewQuestionRequired(checked as boolean)}
                          />
                          <Label htmlFor="new-required">Required</Label>
                        </div>
                      </div>
                      {newQuestionType === "text" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600">Text Input Preview:</label>
                          <Input
                            placeholder="User can type text here..."
                            className="bg-white border border-gray-300 mt-1"
                          />
                        </div>
                      )}
                      {newQuestionType === "textarea" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600">Textarea Preview:</label>
                          <Textarea
                            placeholder="User can type long text here..."
                            rows={3}
                            className="bg-white border border-gray-300 mt-1"
                          />
                        </div>
                      )}
                      {newQuestionType === "audio" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600">Audio Upload Preview:</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white mt-1">
                            <Radio className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 mb-2">User can upload audio files here</p>
                            <input type="file" accept="audio/*" className="text-sm text-gray-600" />
                          </div>
                        </div>
                      )}
                      {newQuestionType === "video" && (
                        <div className="mt-2">
                          <label className="text-sm text-gray-600">Video Upload Preview:</label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white mt-1">
                            <Video className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600 mb-2">User can upload video files here</p>
                            <input type="file" accept="video/*" className="text-sm text-gray-600" />
                          </div>
                        </div>
                      )}
                      <Button onClick={handleAddQuestion} disabled={!newQuestionText} className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:text-white">
                        <Plus className="h-4 w-4 mr-2" /> Add Question
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
 
              <div className="flex gap-2">
                <Button onClick={handleSaveForm} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400 disabled:text-white">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Form
                </Button>
                <Button
                  onClick={() => {
                    setEditingForm(null)
                    setActiveTab("forms")
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Form Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-white text-black p-0 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b bg-white flex-shrink-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-bold text-black">{previewForm?.name}</DialogTitle>
              {!isFillingForm ? (
                <Button
                  onClick={handleStartFilling}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Fill Form
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setIsFillingForm(false)
                      toast({
                        title: "Form Closed",
                        description: "Individual responses have been saved. Use 'Save This Answer' on each question.",
                        variant: "default"
                      })
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Close Form
                  </Button>
                  <Button
                    onClick={() => setIsFillingForm(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-4 bg-white min-h-0"
            style={{ 
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f8fafc',
              maxHeight: 'calc(95vh - 80px)'
            }}
          >
          
          {previewForm && (
            <div className="space-y-6 text-black">
              {/* Form Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={previewForm.status === "published" ? "default" : "secondary"}>
                    {previewForm.status}
                  </Badge>
                  {previewForm.is_default && <Badge variant="outline">Default</Badge>}
                </div>
                {previewForm.description && (
                  <p className="text-gray-700">{previewForm.description}</p>
                )}
              </div>

              {/* Questions Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-black">
                  {isFillingForm ? 'Fill Out Form' : `Questions (${previewForm.questions.length})`}
                </h3>
                
                {previewForm.questions.length === 0 ? (
                  <p className="text-gray-600 italic">No questions added yet.</p>
                ) : (
                  <div className="space-y-6">
                    {previewForm.questions.map((question, index) => (
                      <div key={`form-question-${question.id || index}`} className="border border-gray-200 rounded-lg p-6 bg-white">
                        <div className="mb-4">
                          <div className="flex items-center gap-2 mb-2">
                            {getQuestionIcon(question.type)}
                            <span className="font-medium text-black">Question {index + 1}</span>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                          <p className="text-base font-medium text-black mb-4">{question.text}</p>
                        </div>
                        
                        {/* Interactive Form Elements */}
                        {isFillingForm ? (
                          <div className="space-y-4">
                            {question.type === "text" && (
                              <Input
                                value={formResponses[question.id] || ''}
                                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                                placeholder="Enter your response here..."
                                className="w-full"
                              />
                            )}
                            
                            {question.type === "textarea" && (
                              <Textarea
                                value={formResponses[question.id] || ''}
                                onChange={(e) => handleResponseChange(question.id, e.target.value)}
                                placeholder="Enter your detailed response here..."
                                rows={4}
                                className="w-full"
                              />
                            )}
                            
                            {question.type === "audio" && (
                              <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <Radio className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-600 mb-3">Upload Audio File</p>
                                  <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(question.id, file, 'audio');
                                      }
                                    }}
                                    className="mb-2"
                                  />
                                </div>
                                {formResponses[question.id] && (
                                  <div className="bg-green-50 p-3 rounded border">
                                    <p className="text-sm text-green-700 font-medium">Audio uploaded:</p>
                                    <p className="text-sm text-green-600">{formResponses[question.id].name}</p>
                                    <audio controls className="mt-2 w-full">
                                      <source src={formResponses[question.id].data} type={formResponses[question.id].type} />
                                      Your browser does not support the audio element.
                                    </audio>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {question.type === "video" && (
                              <div className="space-y-3">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                  <Video className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-600 mb-3">Upload Video File</p>
                                  <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(question.id, file, 'video');
                                      }
                                    }}
                                    className="mb-2"
                                  />
                                </div>
                                {formResponses[question.id] && (
                                  <div className="bg-green-50 p-3 rounded border">
                                    <p className="text-sm text-green-700 font-medium">Video uploaded:</p>
                                    <p className="text-sm text-green-600">{formResponses[question.id].name}</p>
                                    <video controls className="mt-2 w-full max-w-md">
                                      <source src={formResponses[question.id].data} type={formResponses[question.id].type} />
                                      Your browser does not support the video element.
                                    </video>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Individual Save Button for each question */}
                            <div className="flex justify-end pt-3 border-t border-gray-200">
                              <Button
                                onClick={() => handleSaveIndividualQuestion(question.id)}
                                disabled={savingQuestions.has(question.id) || !formResponses[question.id]}
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-400"
                              >
                                {savingQuestions.has(question.id) ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4 mr-2" />
                                )}
                                Save This Answer
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* Preview Mode with Saved Response */
                          <div >
                            <div >
                              {/* <div className="text-xs text-gray-600 mb-2 flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {question.type.replace('-', ' ').replace('_', ' ')}
                                </Badge>
                                Preview Mode
                              </div> */}
                              {/* {question.type === "text" && (
                                <Input placeholder="Text input preview..." disabled className="bg-gray-100" />
                              )}
                              {question.type === "textarea" && (
                                <Textarea placeholder="Textarea preview..." rows={3} disabled className="bg-gray-100" />
                              )}
                              {question.type === "audio" && (
                                <div className="border border-gray-300 rounded p-3 text-center text-gray-500">
                                  <Radio className="h-6 w-6 mx-auto mb-1" />
                                  <p className="text-sm">Audio upload field</p>
                                </div>
                              )}
                              {question.type === "video" && (
                                <div className="border border-gray-300 rounded p-3 text-center text-gray-500">
                                  <Video className="h-6 w-6 mx-auto mb-1" />
                                  <p className="text-sm">Video upload field</p>
                                </div>
                              )} */}
                            </div>
                            
                            {/* Show Saved Response */}
                            {(() => {
                              const savedResponse = savedFormResponses.find(r => r.question_id === question.id)
                              if (savedResponse) {
                                return (
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="outline" className="text-green-700 border-green-300">
                                        Saved Response
                                      </Badge>
                                      <span className="text-xs text-green-600">
                                        {new Date(savedResponse.created_at || '').toLocaleString()}
                                      </span>
                                    </div>
                                    
                                    {(question.type === 'text' || question.type === 'textarea') && (
                                      <div className="bg-white p-3 rounded border">
                                        <p className="text-gray-800">{savedResponse.response_text}</p>
                                      </div>
                                    )}
                                    
                                    {question.type === 'audio' && savedResponse.response_file && (
                                      <div className="bg-white p-3 rounded border">
                                        <p className="text-sm text-blue-700 font-medium mb-2">Audio Response: {savedResponse.file_name}</p>
                                        <audio controls className="w-full">
                                          <source src={savedResponse.response_file} type={savedResponse.file_type} />
                                          Your browser does not support the audio element.
                                        </audio>
                                      </div>
                                    )}
                                    
                                    {question.type === 'video' && savedResponse.response_file && (
                                      <div className="bg-white p-3 rounded border">
                                        <p className="text-sm text-purple-700 font-medium mb-2">Video Response: {savedResponse.file_name}</p>
                                        {(() => {
                                          console.log('Rendering saved video response:', {
                                            fileName: savedResponse.file_name,
                                            fileType: savedResponse.file_type,
                                            hasData: !!savedResponse.response_file,
                                            dataLength: savedResponse.response_file?.length,
                                            dataPreview: savedResponse.response_file?.substring(0, 50)
                                          });
                                          return null;
                                        })()}
                                        {savedResponse.response_file?.startsWith('data:') ? (
                                          <div className="relative">
                                            <video 
                                              controls 
                                              className="w-full max-w-md" 
                                              preload="metadata"
                                              style={{ maxHeight: '300px' }}
                                              onLoadStart={() => console.log('Saved video loading started:', savedResponse.file_name)}
                                              onCanPlay={() => {
                                                console.log('Saved video can play:', savedResponse.file_name);
                                                // Remove any existing error messages when video loads successfully
                                                const errorDiv = document.querySelector('.saved-video-error');
                                                if (errorDiv) errorDiv.remove();
                                              }}
                                              onLoadedMetadata={(e) => {
                                                const video = e.target as HTMLVideoElement;
                                                console.log('Saved video metadata loaded:', {
                                                  name: savedResponse.file_name,
                                                  duration: video.duration,
                                                  videoWidth: video.videoWidth,
                                                  videoHeight: video.videoHeight
                                                });
                                              }}
                                              onError={(e) => {
                                                console.error('Saved video playback error:', e, 'for file:', savedResponse.file_name);
                                                console.error('Saved video data length:', savedResponse.response_file?.length);
                                                console.error('Saved video data preview:', savedResponse.response_file?.substring(0, 100));
                                                const target = e.target as HTMLVideoElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent && !parent.querySelector('.saved-video-error')) {
                                                  const errorDiv = document.createElement('div');
                                                  errorDiv.className = 'text-sm text-red-600 p-2 border border-red-200 rounded bg-red-50 saved-video-error';
                                                  errorDiv.innerHTML = `
                                                    <p><strong>Saved Video Playback Error</strong></p>
                                                    <p>File: ${savedResponse.file_name}</p>
                                                    <p>Type: ${savedResponse.file_type}</p>
                                                    <p>Data length: ${savedResponse.response_file?.length || 0} chars</p>
                                                    <p class="text-xs mt-1">The saved video may be corrupted or in an unsupported format.</p>
                                                  `;
                                                  parent.appendChild(errorDiv);
                                                }
                                              }}
                                            >
                                              <source src={savedResponse.response_file} type={savedResponse.file_type || 'video/mp4'} />
                                              <source src={savedResponse.response_file} type="video/mp4" />
                                              <source src={savedResponse.response_file} type="video/webm" />
                                              <source src={savedResponse.response_file} type="video/ogg" />
                                              Your browser does not support the video element.
                                            </video>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-500 p-2 border border-gray-200 rounded bg-gray-50">
                                            <p><strong>Saved Video Issue</strong></p>
                                            <p><strong>File:</strong> {savedResponse.file_name}</p>
                                            <p><strong>Type:</strong> {savedResponse.file_type}</p>
                                            <p><strong>Issue:</strong> Video data format appears invalid or missing.</p>
                                            <p className="text-xs mt-2 font-mono truncate">
                                              Data format: {savedResponse.response_file ? 
                                                (savedResponse.response_file.startsWith('data:') ? 'Base64 Data URL' : 'Raw data') : 
                                                'No data'
                                              }
                                            </p>
                                            {savedResponse.response_file && (
                                              <p className="text-xs font-mono truncate">Preview: {savedResponse.response_file.substring(0, 50)}...</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Metadata */}
              <div className="border-t border-gray-200 pt-4 text-sm text-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong className="text-black">Created:</strong> {new Date(previewForm.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <strong className="text-black">Last Updated:</strong> {new Date(previewForm.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}