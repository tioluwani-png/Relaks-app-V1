import { BottomNav } from '@/components/layout/bottom-nav'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background pb-[calc(5rem+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav />
    </div>
  )
}
