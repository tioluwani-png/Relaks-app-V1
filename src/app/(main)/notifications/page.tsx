'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, MessageCircle, UserPlus, Award, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'

type NotificationType = 'like' | 'comment' | 'follow' | 'streak_milestone'

interface Notification {
  id: string
  type: NotificationType
  is_read: boolean
  post_id: string | null
  message: string | null
  created_at: string
  actor: {
    id: string
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  like: <Heart className="h-4 w-4 text-red-500 fill-red-500" />,
  comment: <MessageCircle className="h-4 w-4 text-blue-500" />,
  follow: <UserPlus className="h-4 w-4 text-green-500" />,
  streak_milestone: <Award className="h-4 w-4 text-yellow-500" />,
}

const notificationMessages: Record<NotificationType, string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  streak_milestone: 'Congratulations on your streak!',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
    markAllAsRead()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      const data = await response.json()
      if (response.ok) {
        setNotifications(data.notifications)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    if (notification.type === 'follow' && notification.actor) {
      router.push(`/user/${notification.actor.username}`)
    } else if (notification.post_id) {
      router.push(`/post/${notification.post_id}`)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="ml-4 text-lg font-semibold">Notifications</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-medium mb-1">No notifications yet</h2>
            <p className="text-sm text-muted-foreground text-center">
              When someone interacts with your posts, you&apos;ll see it here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors ${
                  !notification.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="relative">
                  {notification.actor ? (
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={notification.actor.avatar_url || undefined} />
                      <AvatarFallback>
                        {notification.actor.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {notificationIcons[notification.type]}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background flex items-center justify-center">
                    {notificationIcons[notification.type]}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    {notification.actor && (
                      <span className="font-medium">
                        {notification.actor.display_name || notification.actor.username}
                      </span>
                    )}{' '}
                    {notification.message || notificationMessages[notification.type]}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
