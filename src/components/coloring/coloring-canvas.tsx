'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import {
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Save,
  Download,
  ChevronDown,
  Minus,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'

interface ColoringCanvasProps {
  imageUrl: string
  onSave?: (canvasDataUrl: string) => void
}

const colorPalette = [
  // Row 1 - Reds & Pinks
  '#FF6B6B', '#EE5A5A', '#FF1493', '#FF69B4', '#FFB6C1',
  // Row 2 - Oranges & Yellows
  '#FF8C00', '#FFA500', '#FFD700', '#FFEA00', '#FFFACD',
  // Row 3 - Greens
  '#228B22', '#32CD32', '#90EE90', '#00FA9A', '#006400',
  // Row 4 - Blues
  '#0000FF', '#1E90FF', '#00BFFF', '#87CEEB', '#483D8B',
  // Row 5 - Purples
  '#800080', '#9932CC', '#BA55D3', '#DA70D6', '#E6E6FA',
  // Row 6 - Browns & Neutrals
  '#8B4513', '#D2691E', '#DEB887', '#F5DEB3', '#FAEBD7',
  // Row 7 - Grays
  '#000000', '#555555', '#999999', '#DDDDDD', '#FFFFFF',
]

export function ColoringCanvas({ imageUrl, onSave }: ColoringCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null)

  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [brushSize, setBrushSize] = useState(12)
  const [color, setColor] = useState('#FF6B6B')
  const [showColors, setShowColors] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Load background image
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Size canvas to fit container while maintaining aspect ratio
      const container = containerRef.current
      if (!container) return

      const maxWidth = container.clientWidth
      const maxHeight = container.clientHeight
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height, 1)

      canvas.width = img.width * scale
      canvas.height = img.height * scale

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      setImageLoaded(true)

      // Save initial state
      const dataUrl = canvas.toDataURL()
      setHistory([dataUrl])
      setHistoryIndex(0)
    }
    img.onerror = () => {
      toast.error('Failed to load image')
    }
    img.src = imageUrl
  }, [imageUrl])

  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dataUrl = canvas.toDataURL()
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(dataUrl)
      // Keep max 30 states
      if (newHistory.length > 30) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 29))
  }, [historyIndex])

  const undo = useCallback(() => {
    if (historyIndex <= 0) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newIndex = historyIndex - 1
    const img = new window.Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      setHistoryIndex(newIndex)
    }
    img.src = history[newIndex]
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const newIndex = historyIndex + 1
    const img = new window.Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      setHistoryIndex(newIndex)
    }
    img.src = history[newIndex]
  }, [history, historyIndex])

  const getCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    } else if ('clientX' in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    }
    return null
  }

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    const pos = getCoordinates(e)
    if (!pos) return

    isDrawingRef.current = true
    lastPosRef.current = pos

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawingRef.current) return
    e.preventDefault()

    const pos = getCoordinates(e)
    if (!pos) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = brushSize
    ctx.strokeStyle = color

    if (lastPosRef.current) {
      ctx.beginPath()
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }

    lastPosRef.current = pos
  }

  const stopDrawing = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false
      lastPosRef.current = null
      saveToHistory()
    }
  }

  const handleSave = () => {
    const canvas = canvasRef.current
    if (!canvas || !onSave) return
    onSave(canvas.toDataURL('image/png'))
    toast.success('Progress saved!')
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = `relaks-colored-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
    toast.success('Downloaded!')
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 dark:bg-gray-950">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto flex-shrink-0">
        {/* Tools */}
        <button
          onClick={() => setTool('brush')}
          className={`p-2.5 rounded-xl transition ${
            tool === 'brush'
              ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-600'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Brush"
        >
          <Paintbrush size={20} />
        </button>
        <button
          onClick={() => setTool('eraser')}
          className={`p-2.5 rounded-xl transition ${
            tool === 'eraser'
              ? 'bg-purple-100 dark:bg-purple-950/30 text-purple-600'
              : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          title="Eraser"
        >
          <Eraser size={20} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Brush Size */}
        <button
          onClick={() => setBrushSize(prev => Math.max(2, prev - 4))}
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <Minus size={16} />
        </button>
        <div className="flex items-center justify-center w-10">
          <div
            className="rounded-full bg-current"
            style={{
              width: Math.min(brushSize, 24),
              height: Math.min(brushSize, 24),
              color: tool === 'eraser' ? '#999' : color,
            }}
          />
        </div>
        <button
          onClick={() => setBrushSize(prev => Math.min(48, prev + 4))}
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
        >
          <Plus size={16} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Color picker toggle */}
        <button
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-1.5 px-2 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <div
            className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: color }}
          />
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${showColors ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={historyIndex <= 0}
          className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          title="Undo"
        >
          <Undo2 size={20} />
        </button>
        <button
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
          title="Redo"
        >
          <Redo2 size={20} />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Save/Download */}
        {onSave && (
          <button
            onClick={handleSave}
            className="p-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600"
            title="Save"
          >
            <Save size={20} />
          </button>
        )}
        <button
          onClick={handleDownload}
          className="p-2.5 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Download"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Color Palette */}
      {showColors && (
        <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800 px-3 py-3 flex-shrink-0">
          <div className="grid grid-cols-5 gap-2 max-w-xs mx-auto">
            {colorPalette.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c)
                  setTool('brush')
                  setShowColors(false)
                }}
                className={`w-10 h-10 rounded-xl transition-transform ${
                  color === c ? 'ring-2 ring-purple-500 ring-offset-2 scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0"
      >
        {!imageLoaded && (
          <div className="text-gray-400 text-sm">Loading image...</div>
        )}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`max-w-full max-h-full bg-white rounded-xl shadow-lg touch-none ${
            !imageLoaded ? 'hidden' : ''
          }`}
          style={{ cursor: 'crosshair' }}
        />
      </div>
    </div>
  )
}
