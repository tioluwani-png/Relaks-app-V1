import type { ReactNode } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Flame, Sparkles } from 'lucide-react'
import type { AppScreenData } from '@/lib/landing/data'

/**
 * Mock app screens for the app section's phone frames, built from real Relaks content:
 * official color references, an AI page made by the team, real journal prompts and the
 * coloring page from the hero. Everything is sized in em off the frame's width (cqw),
 * so the screens scale with the phone on any device.
 */
function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full" style={{ containerType: 'inline-size' }} aria-hidden="true">
      <div
        className="flex h-full flex-col bg-relaks-cream px-[1.1em] pb-[1.2em] pt-[2.8em] text-relaks-ink"
        style={{ fontSize: '5.2cqw' }}
      >
        {children}
      </div>
    </div>
  )
}

function TopBar({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-[0.5em]">
      <ChevronLeft className="h-[1.2em] w-[1.2em] shrink-0 text-relaks-ink/50" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[1.05em] font-bold leading-tight">{title}</p>
        {sub && <p className="truncate text-[0.78em] leading-tight text-relaks-ink/60">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

/** "Never stuck on colors": an official reference page from the references table. */
export function ReferencesScreen({ reference }: { reference: NonNullable<AppScreenData['reference']> }) {
  return (
    <Screen>
      <TopBar title={reference.edition} sub={`Page ${reference.page}`} />
      <div className="relative mt-[0.8em] min-h-0 flex-1 overflow-hidden rounded-[0.9em] bg-white shadow-sm">
        <Image src={reference.imageUrl} alt="" fill sizes="(min-width: 768px) 220px, 140px" className="object-cover" />
        <span className="absolute left-[0.6em] top-[0.6em] rounded-full bg-white/90 px-[0.6em] py-[0.25em] text-[0.7em] font-semibold text-relaks-purple-ink">
          Official reference
        </span>
      </div>
      <div className="mt-[0.8em] flex items-center justify-between rounded-full bg-white px-[0.9em] py-[0.55em] text-[0.8em] font-semibold shadow-sm">
        <span>See community versions</span>
        <ChevronRight className="h-[1.1em] w-[1.1em] text-relaks-ink/50" />
      </div>
    </Screen>
  )
}

/** "Imagine a page, get a page": an AI page made by the Relaks team, with its prompt. */
export function AiScreen({ example, price }: { example: NonNullable<AppScreenData['aiExample']>; price: string }) {
  return (
    <Screen>
      <TopBar title="Create a page" sub="AI coloring pages" />
      <div className="mt-[0.8em] flex gap-[0.5em] rounded-[0.8em] bg-white p-[0.7em] shadow-sm">
        <Sparkles className="mt-[0.1em] h-[1em] w-[1em] shrink-0 text-relaks-orange" />
        <p className="line-clamp-3 text-[0.8em] leading-snug text-relaks-ink/80">{example.prompt}</p>
      </div>
      <div className="relative mt-[0.7em] min-h-0 flex-1 overflow-hidden rounded-[0.9em] bg-white shadow-sm">
        <Image src={example.imageUrl} alt="" fill sizes="(min-width: 768px) 220px, 140px" className="object-contain p-[0.4em]" />
      </div>
      <div className="mt-[0.8em] rounded-full bg-gradient-to-r from-relaks-purple via-relaks-coral to-relaks-orange py-[0.6em] text-center text-[0.85em] font-bold text-white">
        Generate · {price}
      </div>
    </Screen>
  )
}

const MOODS = ['#FF6B81', '#FF9F43', '#E8B33C', '#7EC8C1', '#A758FF']

/** "Reflect and keep your streak": today's prompt from src/lib/journal-prompts.ts. */
export function JournalScreen({ prompt, category }: { prompt: string; category: string }) {
  return (
    <Screen>
      <TopBar
        title="Journal"
        sub="Tonight"
        right={
          <span className="flex shrink-0 items-center gap-[0.25em] rounded-full bg-relaks-orange/15 px-[0.55em] py-[0.25em] text-[0.72em] font-bold text-relaks-orange-ink">
            <Flame className="h-[1em] w-[1em]" />7 days
          </span>
        }
      />
      <p className="mt-[1em] text-[0.78em] font-semibold text-relaks-ink/70">How are you feeling?</p>
      <div className="mt-[0.45em] flex justify-between">
        {MOODS.map((color, i) => (
          <span
            key={color}
            className="block h-[1.9em] w-[1.9em] rounded-full"
            style={{
              backgroundColor: color,
              opacity: i === 3 ? 1 : 0.35,
              boxShadow: i === 3 ? `0 0 0 0.18em #fff, 0 0 0 0.32em ${color}` : undefined,
            }}
          />
        ))}
      </div>
      <div className="mt-[1em] rounded-[0.8em] bg-relaks-orange/10 p-[0.75em]">
        <p className="text-[0.62em] font-bold uppercase tracking-wider text-relaks-orange-ink">{category}</p>
        <p className="mt-[0.3em] text-[0.88em] font-semibold leading-snug">{prompt}</p>
      </div>
      <div
        className="mt-[0.7em] min-h-0 flex-1 rounded-[0.8em] bg-white p-[0.75em] text-[0.78em] leading-[1.9em] text-relaks-ink/70 shadow-sm"
        style={{ backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 1.85em, rgba(30,30,44,0.08) 1.85em, rgba(30,30,44,0.08) 1.9em)' }}
      >
        Finished my page tonight and my shoulders finally dropped.
      </div>
      <div className="mt-[0.8em] rounded-full bg-relaks-ink py-[0.6em] text-center text-[0.85em] font-bold text-white">Save entry</div>
    </Screen>
  )
}

/** "Color on your phone" (coming soon): the hero's coloring page, part-colored, with a palette. */
export function CanvasScreen({ svg, palette, comingSoon }: { svg: string; palette: string[]; comingSoon: string }) {
  return (
    <Screen>
      <TopBar
        title="Color"
        sub="Tap to fill"
        right={
          <span className="shrink-0 rounded-full bg-relaks-orange px-[0.6em] py-[0.25em] text-[0.7em] font-bold text-white">
            {comingSoon}
          </span>
        }
      />
      <div
        className="mt-[0.8em] min-h-0 flex-1 overflow-hidden rounded-[0.9em] bg-white p-[0.5em] shadow-sm [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="mt-[0.8em] flex justify-between">
        {palette.slice(0, 6).map((color, i) => (
          <span
            key={color}
            className="block h-[1.6em] w-[1.6em] rounded-full"
            style={{ backgroundColor: color, boxShadow: i === 0 ? `0 0 0 0.15em #fff, 0 0 0 0.28em ${color}` : undefined }}
          />
        ))}
      </div>
      <div className="mt-[0.8em] h-[0.3em] rounded-full bg-relaks-ink/10">
        <div className="h-full w-2/5 rounded-full bg-relaks-ink/40" />
      </div>
    </Screen>
  )
}
