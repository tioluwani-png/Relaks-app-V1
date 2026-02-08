'use client'

import Link from 'next/link'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, Image as ImageIcon, Trophy, Sparkles } from 'lucide-react'

const sections = [
  {
    href: '/references',
    icon: Palette,
    title: 'Color References',
    description: 'Curated color inspiration for each Relaks edition',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    href: '/discover/pages',
    icon: ImageIcon,
    title: 'Coloring Pages',
    description: 'Download free and premium coloring pages',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    href: '/discover/leaderboard',
    icon: Trophy,
    title: 'Leaderboard',
    description: 'See top posts and colorists',
    color: 'bg-yellow-100 text-yellow-600',
  },
  {
    href: '/create/generate',
    icon: Sparkles,
    title: 'AI Generator',
    description: 'Create custom coloring pages with AI',
    color: 'bg-blue-100 text-blue-600',
  },
]

export function DiscoverContent() {
  return (
    <div className="p-4 space-y-4">
      <div className="grid gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <div className={`p-3 rounded-lg ${section.color}`}>
                  <section.icon className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-base">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
