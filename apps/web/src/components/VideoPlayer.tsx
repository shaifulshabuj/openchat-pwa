import { useState, useRef, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
  width?: number | string
  height?: number | string
  autoPlay?: boolean
  muted?: boolean
}

export default function VideoPlayer({ 
  src, 
  poster, 
  className,
  width = '100%',
  height = 'auto',
  autoPlay = false,
  muted = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(muted)
  const [volume, setVolume] = useState(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadStart = () => setIsLoading(true)
    const handleCanPlay = () => setIsLoading(false)
    const handleError = () => {
      setError('Failed to load video')
      setIsLoading(false)
    }
    
    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('loadstart', handleLoadStart)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('loadstart', handleLoadStart)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play()
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(video.muted)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const volumeValue = parseFloat(e.target.value)
    video.volume = volumeValue
    setVolume(volumeValue)
    
    if (volumeValue === 0 && !video.muted) {
      video.muted = true
      setIsMuted(true)
    } else if (volumeValue > 0 && video.muted) {
      video.muted = false
      setIsMuted(false)
    }
  }

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current
    if (!video) return

    const seekTime = parseFloat(e.target.value)
    video.currentTime = seekTime
    setCurrentTime(seekTime)
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const showControls = () => {
    setIsControlsVisible(true)
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current)
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setIsControlsVisible(false)
      }
    }, 3000)
  }

  const handleMouseMove = () => {
    showControls()
  }

  const handleFullscreen = () => {
    const video = videoRef.current
    if (!video) return

    if (video.requestFullscreen) {
      video.requestFullscreen()
    }
  }

  if (error) {
    return (
      <div className={cn("relative bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center", className)}>
        <div className="text-center p-4">
          <RotateCcw className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn("relative bg-black rounded-lg overflow-hidden", className)}
      style={{ width, height }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsControlsVisible(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        autoPlay={autoPlay}
        muted={muted}
        preload="metadata"
        onClick={togglePlay}
      >
        <source src={src} />
        Your browser does not support the video tag.
      </video>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause overlay */}
      {!isLoading && (
        <div 
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            isControlsVisible || !isPlaying ? "opacity-100" : "opacity-0"
          )}
          onClick={togglePlay}
        >
          {!isPlaying && (
            <div className="bg-black/50 rounded-full p-3">
              <Play className="w-8 h-8 text-white fill-current" />
            </div>
          )}
        </div>
      )}

      {/* Controls overlay */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-200",
          isControlsVisible ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress bar */}
        <div className="mb-3">
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #6b7280 ${(currentTime / duration) * 100}%, #6b7280 100%)`
            }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            <div className="w-16">
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleFullscreen}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}