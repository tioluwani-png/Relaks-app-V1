import type { ReactNode } from 'react'

/** Article frame for legal pages: title, last-updated date, and readable prose spacing. */
export function LegalPage({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string
  lastUpdated: string
  intro?: ReactNode
  children: ReactNode
}) {
  return (
    <article className="container mx-auto px-4 max-w-3xl py-14 md:py-20">
      <header className="mb-10">
        <h1 className="font-display text-[36px] md:text-[48px] font-bold leading-tight text-relaks-ink mb-3">{title}</h1>
        <p className="text-sm text-gray-700">Last updated: {lastUpdated}</p>
        {intro && <div className="mt-6 text-lg text-gray-700 leading-relaxed max-w-[62ch]">{intro}</div>}
      </header>
      <div className="space-y-10 max-w-[65ch] text-gray-700 leading-relaxed [&_a]:font-semibold [&_a]:text-relaks-coral-ink [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </article>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-[26px] md:text-[32px] font-semibold leading-tight text-relaks-ink">{title}</h2>
      {children}
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-6 space-y-2">{children}</ul>
}
