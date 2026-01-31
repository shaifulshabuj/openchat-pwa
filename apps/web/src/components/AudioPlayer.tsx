import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AudioPlayerProps {
  src: string
  title?: string
  duration?: number
  className?: string
  showDownload?: boolean
  autoPlay?: boolean
}

export default function AudioPlayer({
  src,
  title,
  duration: providedDuration,
  className,
  showDownload = true,
  autoPlay = false
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(providedDuration || 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [waveformData, setWaveformData] = useState<number[]>([])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleError = () => {
      setError('Failed to load audio')
      setIsLoading(false)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
      setIsLoading(false)
      
      // Generate simple waveform visualization data
      const bars = 32
      const waveform = Array.from({ length: bars }, () => 
        0.2 + Math.random() * 0.8 // Random heights between 0.2 and 1
      )
      setWaveformData(waveform)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('error', handleError)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

  const toggleMute = () => {
    const audio = audioRef.current
    if (!audio) return

    audio.muted = !audio.muted
    setIsMuted(audio.muted)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const width = rect.width
    const seekTime = (clickX / width) * duration

    audio.currentTime = seekTime
    setCurrentTime(seekTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg", className)}>
        <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Volume2 className="w-4 h-4 text-gray-500" />
        </div>
        <span className="text-sm text-gray-500">{error}</span>
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg min-w-0 max-w-sm", className)}>
      <audio
        ref={audioRef}
        src={src}
        autoPlay={autoPlay}
        preload="metadata"
        className="hidden"
      />

      {/* Play/Pause Button */}
      <Button
        onClick={togglePlay}
        disabled={isLoading}
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 flex-shrink-0"
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </Button>

      {/* Waveform Visualization */}
      <div className="flex-1 min-w-0">
        <div 
          className="flex items-end gap-0.5 h-8 cursor-pointer"
          onClick={handleSeek}
        >
          {waveformData.map((height, index) => {
            const barProgress = (index / waveformData.length) * 100
            const isPlayed = barProgress <= progressPercentage
            
            return (
              <div
                key={index}
                className={cn(
                  "flex-1 rounded-sm transition-colors min-w-0",
                  isPlayed 
                    ? "bg-blue-500" 
                    : "bg-gray-300 dark:bg-gray-600"
                )}
                style={{ height: `${height * 100}%` }}
              />
            )
          })}
        </div>
        
        {/* Progress indicator */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          onClick={toggleMute}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
        >
          {isMuted ? (
            <VolumeX className="w-3 h-3" />
          ) : (
            <Volume2 className="w-3 h-3" />
          )}
        </Button>

        {showDownload && (
          <Button
            onClick={() => window.open(src, '_blank')}
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Download audio"
          >
            <Download className="w-3 h-3" />
          </Button>
        )}
      </div>

      {title && (
        <div className="absolute top-0 left-0 right-0 p-1">
          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
            {title}
          </p>
        </div>
      )}
    </div>
  )
}