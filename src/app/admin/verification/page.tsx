'use client'

import { useEffect, useState } from 'react'
import { Search, Check, Shield, Star, Award, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { VerificationBadge } from '@/components/shared/verification-badge'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { VerificationType } from '@/types/database'

interface UserRow {
  id: string
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: string
  is_verified: boolean
  verification_type: VerificationType | null
  follower_count: number
}

const verificationTypes: { value: VerificationType; label: string; icon: typeof Shield; description: string }[] = [
  { value: 'staff', label: 'Staff', icon: Shield, description: 'Relaks team member' },
  { value: 'creator', label: 'Creator', icon: Star, description: 'Notable creator' },
  { value: 'brand', label: 'Brand', icon: Building2, description: 'Official brand' },
  { value: 'notable', label: 'Notable', icon: Award, description: 'Public figure' },
]

export default function AdminVerificationPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<UserRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified'>('all')
  const [verifyUser, setVerifyUser] = useState<UserRow | null>(null)
  const [selectedType, setSelectedType] = useState<VerificationType>('creator')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('users')
        .select('id, email, username, display_name, avatar_url, role, is_verified, verification_type, follower_count')
        .order('follower_count', { ascending: false })
        .limit(100)

      if (filter === 'verified') query = query.eq('is_verified', true)
      if (filter === 'unverified') query = query.eq('is_verified', false)

      const { data, error } = await query

      if (error) throw error
      setUsers((data as UserRow[]) || [])
    } catch {
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verifyUser) return
    setIsProcessing(true)

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('users')
        .update({
          is_verified: true,
          verification_type: selectedType,
          verified_at: new Date().toISOString(),
          verified_by: currentUser?.id,
        } as never)
        .eq('id', verifyUser.id)

      if (error) throw error

      setUsers(users.map(u =>
        u.id === verifyUser.id
          ? { ...u, is_verified: true, verification_type: selectedType }
          : u
      ))
      setVerifyUser(null)
      toast.success(`@${verifyUser.username} has been verified`)
    } catch {
      toast.error('Failed to verify user')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUnverify = async (user: UserRow) => {
    if (!confirm(`Remove verification from @${user.username}?`)) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_verified: false,
          verification_type: null,
          verified_at: null,
          verified_by: null,
        } as never)
        .eq('id', user.id)

      if (error) throw error

      setUsers(users.map(u =>
        u.id === user.id
          ? { ...u, is_verified: false, verification_type: null }
          : u
      ))
      toast.success(`Verification removed from @${user.username}`)
    } catch {
      toast.error('Failed to remove verification')
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    const s = searchTerm.toLowerCase()
    return (
      user.username.toLowerCase().includes(s) ||
      user.email.toLowerCase().includes(s) ||
      user.display_name?.toLowerCase().includes(s)
    )
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Verification Management</h1>

      {/* Badge Legend */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-2xl p-4 mb-6">
        <h2 className="font-semibold mb-3">Badge Types</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {verificationTypes.map((type) => (
            <div key={type.value} className="flex items-center gap-2">
              <VerificationBadge isVerified verificationType={type.value} size="sm" />
              <div>
                <p className="text-sm font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by username or email..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'verified', 'unverified'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium">User</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Role</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Followers</th>
                <th className="text-left px-4 py-3 text-sm font-medium">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-sm">{user.username}</span>
                            {user.is_verified && (
                              <VerificationBadge isVerified verificationType={user.verification_type} size="sm" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="text-xs">
                        {user.role.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {user.follower_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-sm text-green-600">
                          <Check className="h-3.5 w-3.5" />
                          {user.verification_type}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not verified</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.is_verified ? (
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleUnverify(user)}>
                          Remove
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-purple-600"
                          onClick={() => {
                            setVerifyUser(user)
                            setSelectedType(
                              ['moderator', 'admin', 'super_admin'].includes(user.role) ? 'staff' : 'creator'
                            )
                          }}
                        >
                          Verify
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verify Dialog */}
      <Dialog open={!!verifyUser} onOpenChange={(open) => !open && setVerifyUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify @{verifyUser?.username}</DialogTitle>
            <DialogDescription>
              Choose a verification type for this user.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {verificationTypes.map((type) => {
              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                    selectedType === type.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <VerificationBadge isVerified verificationType={type.value} size="md" />
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                  {selectedType === type.value && <Check className="h-4 w-4 text-purple-500" />}
                </button>
              )
            })}
          </div>

          {/* Preview */}
          <div className="bg-muted rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-1.5">Preview:</p>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold">
                {verifyUser?.display_name || verifyUser?.username}
              </span>
              <VerificationBadge isVerified verificationType={selectedType} size="md" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyUser(null)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={isProcessing}>
              {isProcessing ? 'Verifying...' : 'Verify User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
