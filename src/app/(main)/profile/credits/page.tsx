'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Coins, Loader2, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { FadeIn } from '@/components/shared/motion'

const bundles = [
  {
    type: 'ai_starter',
    name: 'Starter',
    credits: 5,
    generations: 1,
    price: 500,
    perGeneration: 500,
    discount: 0,
    popular: false,
  },
  {
    type: 'ai_popular',
    name: 'Popular',
    credits: 25,
    generations: 5,
    price: 2000,
    perGeneration: 400,
    discount: 20,
    popular: true,
  },
  {
    type: 'ai_pro',
    name: 'Pro',
    credits: 50,
    generations: 10,
    price: 3500,
    perGeneration: 350,
    discount: 30,
    popular: false,
  },
]

export default function CreditsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [processingType, setProcessingType] = useState<string | null>(null)

  const aiCredits = profile?.ai_credits || 0

  const handlePurchase = async (type: string) => {
    setProcessingType(type)

    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize payment')
      }

      // Redirect to Paystack checkout
      window.location.href = data.authorization_url
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment failed')
      setProcessingType(null)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">AI Credits</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Current Balance */}
        <FadeIn>
          <Card className="border-0 shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="gradient-purple-pink p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm">Your Balance</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Sparkles className="h-7 w-7" />
                    <span className="text-4xl font-bold">{aiCredits}</span>
                  </div>
                  <p className="text-white/70 text-sm mt-1">
                    {aiCredits === 1 ? 'credit' : 'credits'} remaining
                  </p>
                </div>
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Coins className="h-8 w-8" />
                </div>
              </div>
            </div>
          </Card>
        </FadeIn>

        {/* What Credits Buy */}
        <FadeIn delay={0.1}>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">WHAT YOU CAN DO</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">AI Generate</p>
                  <p className="text-xs text-muted-foreground">Create custom coloring pages</p>
                </div>
                <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">5 credits</span>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Credit Bundles */}
        <FadeIn delay={0.2}>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">BUY CREDITS</h2>
            <div className="space-y-3">
              {bundles.map((bundle) => (
                <div
                  key={bundle.type}
                  className={`relative rounded-2xl p-4 border-2 transition ${
                    bundle.popular
                      ? 'border-purple-500 shadow-lg shadow-purple-500/10'
                      : 'border-border'
                  }`}
                >
                  {bundle.popular && (
                    <div className="absolute -top-3 left-4 gradient-purple-pink text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <Crown className="h-3 w-3" />
                      BEST VALUE
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{bundle.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <span className="text-2xl font-bold">{bundle.generations}</span>
                        <span className="text-muted-foreground text-sm">
                          {bundle.generations === 1 ? 'generation' : 'generations'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bundle.credits} credits &middot; {'\u20A6'}{bundle.perGeneration}/generation
                      </p>
                      {bundle.discount > 0 && (
                        <span className="inline-block mt-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-0.5 rounded-full">
                          Save {bundle.discount}%
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => handlePurchase(bundle.type)}
                      disabled={processingType !== null}
                      className={`rounded-xl px-5 ${
                        bundle.popular
                          ? 'gradient-purple-pink text-white border-0'
                          : ''
                      }`}
                      variant={bundle.popular ? 'default' : 'outline'}
                    >
                      {processingType === bundle.type ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `\u20A6${bundle.price.toLocaleString()}`
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* Coloring Pages - Coming Soon */}
        <FadeIn delay={0.3}>
          <div className="rounded-2xl p-5 border-2 border-dashed border-border bg-muted/30 text-center">
            <h2 className="text-sm font-semibold text-muted-foreground mb-2">COLORING PAGES</h2>
            <p className="text-sm text-muted-foreground">
              Page bundles and unlimited downloads coming soon!
            </p>
          </div>
        </FadeIn>
      </main>
    </div>
  )
}
