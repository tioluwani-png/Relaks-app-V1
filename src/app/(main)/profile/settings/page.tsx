'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  Shield,
  LogOut,
  HelpCircle,
  ChevronRight,
  Mail,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

export default function SettingsPage() {
  const router = useRouter()
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [settings, setSettings] = useState({
    pushNotifications: true,
    emailNotifications: false,
    likesNotifications: true,
    commentsNotifications: true,
    followsNotifications: true,
    journalReminder: true,
    privateProfile: false,
  })

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
      router.push('/login')
    } catch {
      toast.error('Failed to log out')
    } finally {
      setIsLoggingOut(false)
      setShowLogoutDialog(false)
    }
  }

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
    // TODO: Persist to backend
    toast.success('Setting updated')
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* Notifications Section */}
        <section className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
              <Switch
                checked={settings.pushNotifications}
                onCheckedChange={() => toggleSetting('pushNotifications')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive updates via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={() => toggleSetting('emailNotifications')}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-sm">Likes on your posts</p>
              <Switch
                checked={settings.likesNotifications}
                onCheckedChange={() => toggleSetting('likesNotifications')}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm">Comments on your posts</p>
              <Switch
                checked={settings.commentsNotifications}
                onCheckedChange={() => toggleSetting('commentsNotifications')}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm">New followers</p>
              <Switch
                checked={settings.followsNotifications}
                onCheckedChange={() => toggleSetting('followsNotifications')}
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm">Daily journal reminder</p>
              <Switch
                checked={settings.journalReminder}
                onCheckedChange={() => toggleSetting('journalReminder')}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Privacy Section */}
        <section className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Privacy</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Private Profile</p>
                <p className="text-sm text-muted-foreground">
                  Only followers can see your posts
                </p>
              </div>
              <Switch
                checked={settings.privateProfile}
                onCheckedChange={() => toggleSetting('privateProfile')}
              />
            </div>
          </div>
        </section>

        <Separator />

        {/* Support Section */}
        <section className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold">Support</h2>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => window.open('mailto:support@relaks.app', '_blank')}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <span>Contact Support</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => toast.info('FAQ coming soon!')}
              className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span>FAQ</span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        </section>

        <Separator />

        {/* Logout Section */}
        <section className="p-4">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => setShowLogoutDialog(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </section>

        {/* App Version */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>Relaks App v1.0.0</p>
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out?</DialogTitle>
            <DialogDescription>
              Are you sure you want to log out of your account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Log Out'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
