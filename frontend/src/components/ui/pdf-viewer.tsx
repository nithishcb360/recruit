'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { Download, FileText, ExternalLink } from 'lucide-react';

interface PDFViewerProps {
  url: string;
  candidateName?: string;
  className?: string;
}

export function PDFViewer({ url, candidateName, className }: PDFViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const downloadPDF = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${candidateName || 'resume'}_resume.pdf`;
    link.click();
  };

  const openInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-lg ${className}`}>
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 text-center mb-4">
          Unable to load PDF preview
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openInNewTab}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg bg-gray-50 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-900">Resume PDF</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={openInNewTab}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPDF}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading PDF...</span>
          </div>
        )}

        <iframe
          src={`${url}#toolbar=0&navpanes=0&scrollbar=1`}
          className="w-full h-96 border-0"
          title={`Resume - ${candidateName}`}
          onLoad={handleLoad}
          onError={handleError}
        />
      </div>
    </div>
  );
}