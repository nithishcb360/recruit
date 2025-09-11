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
 
  // Load feedback templates on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true)
        const response = await getFeedbackTemplates()
        // Remove duplicates based on ID
        const uniqueForms = response.results.filter((form, index, array) => 
          array.findIndex(f => f.id === form.id) === index
        )
        setForms(uniqueForms)
      } catch (error) {
        console.error('Error fetching feedback templates:', error)
        toast({
          title: "Error",
          description: "Failed to load feedback templates. Please refresh the page.",
          variant: "destructive"
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
    // Validate that the form still exists before editing
    try {
      const response = await fetch(`http://localhost:8000/api/feedback-templates/${form.id}/`)
      if (!response.ok) {
        // Form doesn't exist anymore, refresh the list
        const templatesResponse = await getFeedbackTemplates()
        const uniqueForms = templatesResponse.results.filter((f, index, array) => 
          array.findIndex(ff => ff.id === f.id) === index
        )
        setForms(uniqueForms)
        toast({
          title: "Error",
          description: `Form "${form.name}" no longer exists. The forms list has been refreshed.`,
          variant: "destructive"
        })
        return
      }
      
      setEditingForm({ ...form })
      setActiveTab("builder")
    } catch (error) {
      console.error('Error validating form existence:', error)
      toast({
        title: "Error",
        description: "Unable to load form for editing. Please try again.",
        variant: "destructive"
      })
    }
  }
 
  const handleSaveForm = async () => {
    if (!editingForm) return
 
    // Debug logging to understand form state
    console.log('handleSaveForm - editingForm:', editingForm)
    console.log('handleSaveForm - editingForm.id:', editingForm.id, typeof editingForm.id)

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
        savedForm = await createFeedbackTemplate(formData)
        setForms(prev => {
          // Check if form already exists to prevent duplicates
          const exists = prev.find(f => f.id === savedForm.id)
          if (exists) {
            return prev.map(f => f.id === savedForm.id ? savedForm : f)
          }
          return [...prev, savedForm]
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
        
        try {
          savedForm = await updateFeedbackTemplate(editingForm.id, formData)
          setForms(prev => prev.map(f => f.id === savedForm.id ? savedForm : f))
          toast({
            title: "Success!",
            description: `Feedback form "${savedForm.name}" has been updated.`,
            variant: "default"
          })
        } catch (updateError: any) {
          console.error('Update failed for form ID:', editingForm.id, 'Error:', updateError)
          if (updateError.message.includes('Not found') || updateError.message.includes('No FeedbackTemplate matches')) {
            // Form might have been deleted, refresh the forms list
            const response = await getFeedbackTemplates()
            const uniqueForms = response.results.filter((form, index, array) => 
              array.findIndex(f => f.id === form.id) === index
            )
            setForms(uniqueForms)
            throw new Error(`Form with ID ${editingForm.id} no longer exists. The forms list has been refreshed.`)
          }
          throw updateError
        }
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
      await deleteFeedbackTemplate(id)
      setForms(prev => prev.filter(form => form.id !== id))
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

  const handleOpenForm = (form: FeedbackTemplate) => {
    setPreviewForm(form)
    setIsPreviewOpen(true)
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
    
    console.log('Adding question:', newQ)
    console.log('Question type:', newQuestionType)
    console.log('Current questions before add:', editingForm.questions)
    if (newQuestionType === "multiple-choice" || newQuestionType === "radio") {
      newQ.options = newQuestionOptions
        .split(",")
        .map((opt) => opt.trim())
        .filter(Boolean)
    }
 
    setEditingForm((prev) => {
      const updated = prev ? { ...prev, questions: [...prev.questions, newQ] } : null
      console.log('Updated form with questions:', updated?.questions)
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
      case "number":
      case "rating":
        return <Star className="h-4 w-4" />
      case "yes/no":
      case "multiple-choice":
        return <ListChecks className="h-4 w-4" />
      case "radio":
        return <Radio className="h-4 w-4" />
      case "image":
        return <Image className="h-4 w-4" />
      case "video":
        return <Video className="h-4 w-4" />
      case "date":
        return <Calendar className="h-4 w-4" />
      case "datetime":
        return <CalendarClock className="h-4 w-4" />
      case "time":
        return <Clock className="h-4 w-4" />
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
                            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleUnpublishForm(form.id)}
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
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
                          className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
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
                    {editingForm.questions.map((question, questionIndex) => (
                      <div key={`edit-question-${question.id || questionIndex}`} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getQuestionIcon(question.type)}
                            <span className="font-medium">Question {question.id}</span>
                            <Badge variant="secondary">{question.type}</Badge>
                            {question.required && <Badge variant="outline">Required</Badge>}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleRemoveQuestion(question.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
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
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text</SelectItem>
                                <SelectItem value="textarea">Long Text</SelectItem>
                                <SelectItem value="number">Number</SelectItem>
                                <SelectItem value="rating">Rating</SelectItem>
                                <SelectItem value="yes/no">Yes/No</SelectItem>
                                <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                <SelectItem value="radio">Radio Field</SelectItem>
                                <SelectItem value="image">Image</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="datetime">Date and Time</SelectItem>
                                <SelectItem value="time">Time</SelectItem>
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
                          {(question.type === "multiple-choice" || question.type === "radio") && (
                            <Textarea
                              value={question.options?.join(", ") || ""}
                              onChange={(e) =>
                                handleQuestionPropertyChange(
                                  question.id,
                                  "options",
                                  e.target.value.split(",").map((opt) => opt.trim()).filter(Boolean)
                                )
                              }
                              placeholder="Option 1, Option 2, Option 3..."
                              rows={2}
                            />
                          )}
                        </div>
                      </div>
                    ))}
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
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="rating">Rating</SelectItem>
                            <SelectItem value="yes/no">Yes/No</SelectItem>
                            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                            <SelectItem value="radio">Radio Field</SelectItem>
                            <SelectItem value="image">Image</SelectItem>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="datetime">Date and Time</SelectItem>
                            <SelectItem value="time">Time</SelectItem>
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
                      {(newQuestionType === "multiple-choice" || newQuestionType === "radio") && (
                        <Textarea
                          value={newQuestionOptions}
                          onChange={(e) => setNewQuestionOptions(e.target.value)}
                          placeholder="Option 1, Option 2, Option 3..."
                          rows={2}
                        />
                      )}
                      <Button onClick={handleAddQuestion} disabled={!newQuestionText} className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300">
                        <Plus className="h-4 w-4 mr-2" /> Add Question
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
 
              <div className="flex gap-2">
                <Button onClick={handleSaveForm} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300">
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Form
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingForm(null)
                    setActiveTab("forms")
                  }}
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
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full bg-white text-black overflow-hidden p-0">
          <div className="flex flex-col h-full">
            <DialogHeader className="px-6 py-4 border-b bg-white">
              <DialogTitle className="text-xl font-bold text-black">{previewForm?.name}</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-white"
              style={{ 
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f8fafc'
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

              {/* Questions Preview */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-black">Questions ({previewForm.questions.length})</h3>
                
                {previewForm.questions.length === 0 ? (
                  <p className="text-gray-600 italic">No questions added yet.</p>
                ) : (
                  <div className="space-y-4">
                    {previewForm.questions.map((question, index) => (
                      <div key={`preview-question-${question.id || index}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getQuestionIcon(question.type)}
                            <span className="font-medium text-black">Question {index + 1}</span>
                            <Badge variant="secondary" className="text-xs">
                              {question.type.replace('-', ' ').replace('_', ' ')}
                            </Badge>
                            {question.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-black">{question.text}</p>
                          
                          {/* Question Type Preview */}
                          <div className="text-sm text-gray-700">
                            <strong>Type:</strong> {question.type.replace('-', ' ').replace('_', ' ')}
                          </div>
                          
                          {/* Options Preview for multiple choice or radio */}
                          {(question.type === "multiple-choice" || question.type === "radio") && question.options && question.options.length > 0 && (
                            <div className="text-sm text-gray-700">
                              <strong>Options:</strong>
                              <ul className="list-disc list-inside ml-4 mt-1">
                                {question.options.map((option, optIndex) => (
                                  <li key={`preview-option-${question.id}-${optIndex}`} className="text-gray-800">{option}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Sample Input Preview */}
                          <div className="mt-3 p-3 bg-white border border-gray-300 rounded border-dashed">
                            <div className="text-xs text-gray-600 mb-2">Preview:</div>
                            {question.type === "text" && (
                              <Input placeholder="Text input..." disabled />
                            )}
                            {question.type === "textarea" && (
                              <Textarea placeholder="Long text input..." rows={3} disabled />
                            )}
                            {question.type === "number" && (
                              <Input type="number" placeholder="Number input..." disabled />
                            )}
                            {question.type === "date" && (
                              <Input type="date" disabled />
                            )}
                            {question.type === "datetime" && (
                              <Input type="datetime-local" disabled />
                            )}
                            {question.type === "time" && (
                              <Input type="time" disabled />
                            )}
                            {question.type === "rating" && (
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star key={star} className="h-4 w-4 text-gray-300" />
                                ))}
                              </div>
                            )}
                            {question.type === "yes/no" && (
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-gray-800">
                                  <input type="radio" disabled /> Yes
                                </label>
                                <label className="flex items-center gap-2 text-gray-800">
                                  <input type="radio" disabled /> No
                                </label>
                              </div>
                            )}
                            {question.type === "multiple-choice" && question.options && (
                              <div className="space-y-2">
                                {question.options.map((option, optIndex) => (
                                  <label key={`preview-checkbox-${question.id}-${optIndex}`} className="flex items-center gap-2 text-gray-800">
                                    <input type="checkbox" disabled /> {option}
                                  </label>
                                ))}
                              </div>
                            )}
                            {question.type === "radio" && question.options && (
                              <div className="space-y-2">
                                {question.options.map((option, optIndex) => (
                                  <label key={`preview-radio-${question.id}-${optIndex}`} className="flex items-center gap-2 text-gray-800">
                                    <input type="radio" name={`question-${question.id}`} disabled /> {option}
                                  </label>
                                ))}
                              </div>
                            )}
                            {question.type === "image" && (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <Image className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600">Image upload area</p>
                              </div>
                            )}
                            {question.type === "video" && (
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                                <Video className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600">Video upload area</p>
                              </div>
                            )}
                          </div>
                        </div>
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}