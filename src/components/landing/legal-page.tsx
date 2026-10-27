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
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">{title}</h1>
        <p className="text-sm text-gray-600">Last updated: {lastUpdated}</p>
        {intro && <div className="mt-6 text-lg text-gray-700 leading-relaxed">{intro}</div>}
      </header>
      <div className="space-y-10 text-gray-700 leading-relaxed [&_a]:text-purple-700 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-purple-900">
        {children}
      </div>
    </article>
  )
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl md:text-2xl font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc pl-6 space-y-2">{children}</ul>
}
