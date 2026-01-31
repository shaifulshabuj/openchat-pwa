import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square, Play, Pause, Trash2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AudioRecorderProps {
  onRecordingComplete?: (audioBlob: Blob, duration: number) => void
  onCancel?: () => void
  maxDuration?: number // in seconds
  className?: string
}

export default function AudioRecorder({
  onRecordingComplete,
  onCancel,
  maxDuration = 300, // 5 minutes default
  className
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Check microphone permission
  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('Audio recording not supported in this browser')
          return
        }

        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        setHasPermission(result.state === 'granted')
        
        result.addEventListener('change', () => {
          setHasPermission(result.state === 'granted')
        })
      } catch (err) {
        console.error('Permission check failed:', err)
      }
    }
    
    checkPermission()
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      
      streamRef.current = stream
      setHasPermission(true)

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' 
      })
      
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        setAudioUrl(URL.createObjectURL(audioBlob))
        
        // Stop stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
        }
      }

      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setDuration(0)

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1
          if (newDuration >= maxDuration) {
            stopRecording()
          }
          return newDuration
        })
      }, 1000)

    } catch (err: any) {
      setError(err.name === 'NotAllowedError' 
        ? 'Microphone permission denied. Please allow microphone access to record audio.'
        : 'Failed to start recording. Please check your microphone.')
      setHasPermission(false)
    }
  }, [maxDuration])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setIsPaused(false)
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRecording])

  const playAudio = useCallback(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }, [audioUrl])

  const pauseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [])

  const deleteRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setIsPlaying(false)
  }, [audioUrl])

  const sendRecording = useCallback(() => {
    if (audioBlob && onRecordingComplete) {
      onRecordingComplete(audioBlob, duration)
    }
  }, [audioBlob, duration, onRecordingComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl)
      }
    }
  }, [audioUrl])

  if (error) {
    return (
      <div className={cn("p-4 bg-red-50 border border-red-200 rounded-lg", className)}>
        <p className="text-red-600 text-sm">{error}</p>
        <Button
          onClick={onCancel}
          variant="outline"
          size="sm"
          className="mt-2"
        >
          Cancel
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("p-4 bg-white dark:bg-gray-800 border rounded-lg space-y-3", className)}>
      {/* Recording Controls */}
      {!audioBlob && (
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={hasPermission === false}
              className="bg-red-500 hover:bg-red-600 text-white"
              size="sm"
            >
              <Mic className="w-4 h-4 mr-2" />
              {hasPermission === false ? 'Permission Denied' : 'Start Recording'}
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              className="bg-gray-500 hover:bg-gray-600 text-white"
              size="sm"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          )}
          
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatTime(duration)}
            {maxDuration && ` / ${formatTime(maxDuration)}`}
          </span>
          
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
          )}
        </div>
      )}

      {/* Recording Visualization */}
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-red-500 font-medium">Recording...</span>
        </div>
      )}

      {/* Playback Controls */}
      {audioBlob && (
        <div className="space-y-3">
          <audio
            ref={audioRef}
            src={audioUrl || ''}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          
          <div className="flex items-center gap-3">
            <Button
              onClick={isPlaying ? pauseAudio : playAudio}
              variant="outline"
              size="sm"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatTime(duration)}
            </span>
            
            <div className="flex-1" />
            
            <Button
              onClick={deleteRecording}
              variant="outline"
              size="sm"
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={sendRecording}
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}