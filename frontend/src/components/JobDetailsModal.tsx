'use client';

import Modal from '@/components/ui/modal';
import JobCreationForm from './JobCreationForm';
import { Job } from '@/lib/api/jobs';

interface JobDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job | null;
  onJobUpdated?: () => void;
}

export default function JobDetailsModal({ isOpen, onClose, job, onJobUpdated }: JobDetailsModalProps) {
  if (!job) return null;

  const handleSuccess = () => {
    if (onJobUpdated) {
      onJobUpdated();
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="View Job Details"
      maxWidth="4xl"
    >
      <JobCreationForm
        onSuccess={handleSuccess}
        onClose={onClose}
        editingJob={job}
        isModal={true}
      />
    </Modal>
  );
}