'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Sparkles, Loader2, Download, RefreshCw, Paintbrush, Upload, ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import type { AIStyle, AIComplexity } from '@/types/database'

const styles: { value: AIStyle; label: string }[] = [
  { value: 'mandala', label: 'Mandala' },
  { value: 'floral', label: 'Floral' },
  { value: 'animals', label: 'Animals' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' },
]

const complexityLabels: Record<number, AIComplexity> = {
  0: 'simple',
  1: 'medium',
  2: 'detailed',
}

export default function GeneratePage() {
  const router = useRouter()
  const { profile, refreshProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Shared state
  const [complexity, setComplexity] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)

  // Prompt tab state
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<AIStyle>('mandala')

  // Photo tab state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const aiCredits = profile?.ai_credits || 0

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description')
      return
    }

    if (aiCredits < 5) {
      toast.error('Not enough credits. You need 5 credits per generation.')
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)

    try {
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          complexity: complexityLabels[complexity],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate')
      }

      setGeneratedImage(data.generation.result_url)
      setGenerationId(data.generation.id)
      refreshProfile()
      toast.success('Image generated!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePhotoConvert = async () => {
    if (!uploadedFile) {
      toast.error('Please upload a photo first')
      return
    }

    if (aiCredits < 5) {
      toast.error('Not enough credits. You need 5 credits per generation.')
      return
    }

    setIsGenerating(true)
    setGeneratedImage(null)

    try {
      const formData = new FormData()
      formData.append('image', uploadedFile)
      formData.append('complexity', complexityLabels[complexity])

      const response = await fetch('/api/ai/photo-to-coloring', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to convert photo')
      }

      setGeneratedImage(data.generation.result_url)
      setGenerationId(data.generation.id)
      refreshProfile()
      toast.success('Photo converted to coloring page!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert photo')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      toast.error('Image must be under 4MB')
      return
    }

    setUploadedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const clearPhoto = () => {
    setUploadedFile(null)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDownload = async () => {
    if (!generatedImage) return

    try {
      const response = await fetch(generatedImage)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `relaks-coloring-page-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      toast.success('Downloaded!')
    } catch {
      toast.error('Failed to download')
    }
  }

  const handleReset = () => {
    setGeneratedImage(null)
    setGenerationId(null)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">AI Generator</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Credits Display */}
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">{aiCredits} credits</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/profile/credits')}>
              Get More
            </Button>
          </CardContent>
        </Card>

        {/* Generated Image Preview */}
        {generatedImage && (
          <Card>
            <CardContent className="p-4">
              <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                <Image
                  src={generatedImage}
                  alt="Generated coloring page"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                {generationId && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/color/${generationId}`)}
                  >
                    <Paintbrush className="h-4 w-4 mr-2" />
                    Color
                  </Button>
                )}
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation Forms */}
        {!generatedImage && (
          <Tabs defaultValue="prompt" className="space-y-6">
            <TabsList className="w-full">
              <TabsTrigger value="prompt" className="flex-1 gap-1.5">
                <Sparkles className="h-4 w-4" />
                From Prompt
              </TabsTrigger>
              <TabsTrigger value="photo" className="flex-1 gap-1.5">
                <ImagePlus className="h-4 w-4" />
                Ghibli Style
              </TabsTrigger>
            </TabsList>

            {/* From Prompt Tab */}
            <TabsContent value="prompt" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="prompt">Describe your coloring page</Label>
                <Input
                  id="prompt"
                  placeholder="e.g., A peaceful garden with butterflies"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {prompt.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label>Style</Label>
                <Select value={style} onValueChange={(v) => setStyle(v as AIStyle)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {styles.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Complexity */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Complexity</Label>
                  <span className="text-sm text-muted-foreground capitalize">
                    {complexityLabels[complexity]}
                  </span>
                </div>
                <Slider
                  value={[complexity]}
                  onValueChange={([v]) => setComplexity(v)}
                  max={2}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Simple</span>
                  <span>Medium</span>
                  <span>Detailed</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || aiCredits < 5}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate (5 credits)
                  </>
                )}
              </Button>
            </TabsContent>

            {/* From Photo Tab */}
            <TabsContent value="photo" className="space-y-6">
              <div className="space-y-2">
                <Label>Upload your photo</Label>
                <p className="text-xs text-muted-foreground">
                  Upload any photo and AI will transform it into a Studio Ghibli-style coloring page
                </p>

                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-purple-300 dark:border-purple-700">
                    <div className="relative aspect-square">
                      <Image
                        src={previewUrl}
                        alt="Upload preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      onClick={clearPhoto}
                      className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                      <p className="text-white text-sm truncate">{uploadedFile?.name}</p>
                      <p className="text-white/70 text-xs">
                        {uploadedFile && (uploadedFile.size / 1024 / 1024).toFixed(1)}MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 cursor-pointer hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition">
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Tap to upload a photo
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      JPG, PNG up to 4MB
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Complexity */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <Label>Detail Level</Label>
                  <span className="text-sm text-muted-foreground capitalize">
                    {complexityLabels[complexity]}
                  </span>
                </div>
                <Slider
                  value={[complexity]}
                  onValueChange={([v]) => setComplexity(v)}
                  max={2}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Simple</span>
                  <span>Medium</span>
                  <span>Detailed</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePhotoConvert}
                disabled={isGenerating || !uploadedFile || aiCredits < 5}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Convert to Ghibli Style (5 credits)
                  </>
                )}
              </Button>
            </TabsContent>

            {aiCredits < 5 && (
              <p className="text-sm text-center text-muted-foreground">
                You need credits to generate images.{' '}
                <button
                  onClick={() => router.push('/profile/credits')}
                  className="text-primary hover:underline"
                >
                  Get credits
                </button>
              </p>
            )}
          </Tabs>
        )}
      </main>
    </div>
  )
}
