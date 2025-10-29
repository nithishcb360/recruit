"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Calendar, Clock, Users, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface InterviewSchedulerProps {
  candidateName: string
  jobTitle: string
  applicationId: number
  onScheduleSuccess: () => void
  onClose: () => void
}

export default function InterviewScheduler({
  candidateName,
  jobTitle,
  applicationId,
  onScheduleSuccess,
  onClose
}: InterviewSchedulerProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    type: '',
    duration: '60',
    interviewer: '',
    location: '',
    notes: ''
  })

  const handleSchedule = async () => {
    setIsLoading(true)
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 1000)) // Mock delay
      
      toast({
        title: "Interview Scheduled",
        description: `Interview with ${candidateName} has been scheduled successfully.`,
        variant: "default"
      })
      
      onScheduleSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to schedule interview. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Interview
        </CardTitle>
        <div className="text-sm text-black">
          <p><strong>Candidate:</strong> {candidateName}</p>
          <p><strong>Position:</strong> {jobTitle}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-black">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="text-black">Time</Label>
            <Input
              id="time"
              type="time"
              value={formData.time}
              onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-black">Interview Type</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phone">Phone Screen</SelectItem>
                <SelectItem value="video">Video Call</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="technical">Technical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-black">Duration (minutes)</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, duration: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="60" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interviewer" className="text-black">Interviewer</Label>
          <Input
            id="interviewer"
            placeholder="Enter interviewer name"
            value={formData.interviewer}
            onChange={(e) => setFormData(prev => ({ ...prev, interviewer: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-black">Location / Meeting Link</Label>
          <Input
            id="location"
            placeholder="Conference room or video meeting link"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-black">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes for the interview"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleSchedule} 
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Scheduling..." : "Schedule Interview"}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}