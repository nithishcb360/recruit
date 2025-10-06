import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const candidateId = formData.get('candidateId') as string;
    const videoBlob = formData.get('video') as Blob | null;
    const audioBlob = formData.get('audio') as Blob | null;
    const screenBlob = formData.get('screen') as Blob | null;

    if (!candidateId) {
      return NextResponse.json(
        { success: false, error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    // For now, we'll store the blobs as data URLs
    // In production, upload to cloud storage (AWS S3, Cloudinary, etc.)
    const videoUrl = videoBlob ? await blobToDataUrl(videoBlob) : '';
    const audioUrl = audioBlob ? await blobToDataUrl(audioBlob) : '';
    const screenUrl = screenBlob ? await blobToDataUrl(screenBlob) : '';

    // Update candidate record with recording URLs
    const response = await fetch(`http://localhost:8000/api/candidates/${candidateId}/`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        assessment_video_url: videoUrl,
        assessment_audio_url: audioUrl,
        assessment_screen_url: screenUrl,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update candidate with recording URLs');
    }

    return NextResponse.json({
      success: true,
      message: 'Recordings saved successfully',
      urls: {
        videoUrl,
        audioUrl,
        screenUrl,
      },
    });
  } catch (error) {
    console.error('Error saving recording:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save recording',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
