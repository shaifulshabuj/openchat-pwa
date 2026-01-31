'use client'

import { useId, useState, useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Music, Video, Download } from 'lucide-react'
import { Button } from './ui/button'

interface FileUploadProps {
  onFileUploaded: (fileInfo: {
    id: string
    filename: string
    mimetype: string
    size: number
    url: string
    thumbnailUrl?: string
  }) => void
  onClose: () => void
  maxSize?: number // in MB
  allowedTypes?: string[]
}

export function FileUpload({ 
  onFileUploaded, 
  onClose, 
  maxSize = 10,
  allowedTypes = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf',
    'text/plain',
    'audio/mpeg',
    'audio/wav',
    'video/mp4',
    'video/webm'
  ]
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  const inferMimeType = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop()
    if (!ext) return ''
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
      pdf: 'application/pdf',
      txt: 'text/plain',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      mp4: 'video/mp4',
      webm: 'video/webm'
    }
    return mimeMap[ext] || ''
  }

  const isAllowedFileType = (file: File) => {
    if (!allowedTypes.length) return true
    const allowAnyImage = allowedTypes.includes('image/*')
    const type = file.type || inferMimeType(file.name)
    if (!type) {
      return allowAnyImage
    }
    if (allowedTypes.includes(type)) return true
    const [group] = type.split('/')
    return allowedTypes.includes(`${group}/*`)
  }

  const triggerFilePicker = () => {
    const input = fileInputRef.current
    if (!input) return
    input.value = ''
    
    // Mobile-specific handling
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    if (isMobile) {
      // On mobile, use capture for better camera integration
      input.setAttribute('capture', 'environment')
    }
    
    if (typeof (input as HTMLInputElement & { showPicker?: () => void }).showPicker === 'function') {
      ;(input as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
      return
    }
    input.click()
  }

  const handleFileSelect = (file: File) => {
    setError(null)
    
    // Validate file size
    const maxBytes = maxSize * 1024 * 1024
    if (file.size > maxBytes) {
      setError(`File too large. Maximum size is ${maxSize}MB.`)
      return
    }

    // Validate file type
    if (!isAllowedFileType(file)) {
      setError('File type not supported')
      return
    }

    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setUploadProgress(progress)
        }
      }

      xhr.onload = () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText)
          if (response.success) {
            onFileUploaded(response.data)
            onClose()
          } else {
            setError('Upload failed')
          }
        } else {
          const errorResponse = JSON.parse(xhr.responseText)
          setError(errorResponse.error || 'Upload failed')
        }
        setUploading(false)
      }

      xhr.onerror = () => {
        setError('Upload failed')
        setUploading(false)
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'
      xhr.open('POST', `${apiBase}/api/upload/file`)
      
      // Add auth header
      const token = localStorage.getItem('auth_token')
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`)
      }

      xhr.send(formData)

    } catch (error) {
      console.error('Upload error:', error)
      setError('Upload failed')
      setUploading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      
      // Handle HEIC/HEIF files by attempting to convert them
      if (file.type === 'image/heic' || file.type === 'image/heif' || 
          file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
        try {
          // For now, try to process as-is and let the server handle it
          // In the future, we could add client-side conversion
          handleFileSelect(file)
        } catch (error) {
          setError('HEIC/HEIF format not supported on this device. Please use JPEG or PNG.')
          return
        }
      } else {
        handleFileSelect(file)
      }
    }
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="w-8 h-8" />
    if (type.startsWith('audio/')) return <Music className="w-8 h-8" />
    if (type.startsWith('video/')) return <Video className="w-8 h-8" />
    return <FileText className="w-8 h-8" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Upload File
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {uploading ? (
            <div className="text-center py-8">
              <div className="mb-4">
                <Upload className="w-12 h-12 text-green-500 mx-auto animate-pulse" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Uploading... {Math.round(uploadProgress)}%
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div
                className={`relative w-full border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer flex flex-col items-center ${
                  dragOver 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={triggerFilePicker}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    triggerFilePicker()
                  }
                }}
              >
                <input
                  id={inputId}
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileInputChange}
                  accept={allowedTypes.includes('image/*') ? 'image/*' : allowedTypes.join(',')}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />
                <div className="pointer-events-none flex flex-col items-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Tap to choose from camera, photo library, or files
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Maximum {maxSize}MB • Images, Documents, Audio, Video
                  </p>
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Tap anywhere in this area to select a file
                  </p>
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
                <p className="font-medium mb-1">Supported formats:</p>
                <p>Images: JPEG, PNG, GIF, WebP, HEIC</p>
                <p>Documents: PDF, TXT</p>
                <p>Audio: MP3, WAV</p>
                <p>Video: MP4, WebM</p>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
