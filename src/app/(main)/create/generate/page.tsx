'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Sparkles, Loader2, Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
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
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<AIStyle>('mandala')
  const [complexity, setComplexity] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)

  const aiCredits = profile?.ai_credits || 0

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a description')
      return
    }

    if (aiCredits <= 0) {
      toast.error('No AI credits remaining. Please purchase more.')
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedImage(null)
                    setGenerationId(null)
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  New
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generation Form */}
        {!generatedImage && (
          <div className="space-y-6">
            {/* Prompt */}
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

            {/* Style */}
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

            {/* Generate Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || aiCredits <= 0}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate (1 credit)
                </>
              )}
            </Button>

            {aiCredits === 0 && (
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
          </div>
        )}
      </main>
    </div>
  )
}
