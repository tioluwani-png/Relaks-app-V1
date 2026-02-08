'use client'

import Link from 'next/link'
import { Upload, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/shared/motion'

const options = [
  {
    href: '/create/upload',
    icon: Upload,
    title: 'Upload Artwork',
    description: 'Share your colored pages with the community',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    href: '/create/generate',
    icon: Sparkles,
    title: 'AI Generate',
    description: 'Create custom coloring pages with AI',
    gradient: 'from-pink-500 to-rose-500',
  },
]

export function CreateContent() {
  return (
    <div className="p-4 space-y-4">
      <p className="text-muted-foreground text-center mb-6">
        What would you like to create today?
      </p>
      <div className="grid gap-4">
        {options.map((option, index) => (
          <FadeIn key={option.href} delay={index * 0.1}>
            <Link href={option.href}>
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="bg-card rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden cursor-pointer"
              >
                <div className="flex items-center gap-4 p-5">
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-r ${option.gradient} flex items-center justify-center flex-shrink-0`}>
                    <option.icon className="h-7 w-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </FadeIn>
        ))}
      </div>
    </div>
  )
}
