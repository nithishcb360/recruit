"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Calendar } from "lucide-react"
import { useState } from "react"
import JobCreationForm from "@/app/components/job-creation-form"
import InterviewScheduler from "@/app/components/interview-scheduler"
import FeedbackFormBuilder from "@/app/components/feedback-form-builder"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface QuickActionsProps {
  onJobCreated?: () => void;
}

export default function QuickActions({ onJobCreated }: QuickActionsProps) {
  const [isJobFormOpen, setIsJobFormOpen] = useState(false)
  const [isInterviewSchedulerOpen, setIsInterviewSchedulerOpen] = useState(false)
  const [isFeedbackFormBuilderOpen, setIsFeedbackFormBuilderOpen] = useState(false)

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="grid grid-cols-2 gap-2">
          <Dialog open={isJobFormOpen} onOpenChange={setIsJobFormOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="justify-start bg-transparent">
                <Plus className="mr-2 h-4 w-4" /> New Job
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create weNew Job Posting</DialogTitle>
              </DialogHeader>
              <JobCreationForm onJobCreated={onJobCreated} />
            </DialogContent>
          </Dialog>

          <Dialog open={isInterviewSchedulerOpen} onOpenChange={setIsInterviewSchedulerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="justify-start bg-transparent">
                <Calendar className="mr-2 h-4 w-4" /> Schedule Interview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Schedule New Interview</DialogTitle>
              </DialogHeader>
              <InterviewScheduler onClose={() => setIsInterviewSchedulerOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={isFeedbackFormBuilderOpen} onOpenChange={setIsFeedbackFormBuilderOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="justify-start bg-transparent">
                <FileText className="mr-2 h-4 w-4" /> New Feedback Form
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Feedback Form</DialogTitle>
              </DialogHeader>
              <FeedbackFormBuilder />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
