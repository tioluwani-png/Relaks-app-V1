'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Search, Ban, CheckCircle, Eye, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserRole } from '@/types/database'

interface AdminUser {
  id: string
  email: string
  username: string
  display_name: string | null
  avatar_url: string | null
  role: UserRole
  is_banned: boolean
  banned_reason: string | null
  ai_credits: number
  created_at: string
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBanned, setFilterBanned] = useState(false)

  const [banModalUser, setBanModalUser] = useState<AdminUser | null>(null)
  const [banReason, setBanReason] = useState('')
  const [creditModalUser, setCreditModalUser] = useState<AdminUser | null>(null)
  const [creditAmount, setCreditAmount] = useState('')

  useEffect(() => {
    loadUsers()
  }, [filterBanned]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      let query = supabase
        .from('users')
        .select('id, email, username, display_name, avatar_url, role, is_banned, banned_reason, ai_credits, created_at')
        .order('created_at', { ascending: false })

      if (filterBanned) {
        query = query.eq('is_banned', true)
      }

      const { data, error } = await query

      if (error) throw error
      setUsers((data as AdminUser[]) || [])
    } catch (error) {
      console.error('Failed to load users:', error)
      toast.error('Failed to load users')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!banModalUser) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          banned_reason: banReason || 'Violation of community guidelines',
        } as never)
        .eq('id', banModalUser.id)

      if (error) throw error

      setUsers(users.map(u =>
        u.id === banModalUser.id
          ? { ...u, is_banned: true, banned_reason: banReason || 'Violation of community guidelines' }
          : u
      ))
      setBanModalUser(null)
      setBanReason('')
      toast.success(`${banModalUser.username} has been banned`)
    } catch (error) {
      console.error('Failed to ban user:', error)
      toast.error('Failed to ban user')
    }
  }

  const handleUnbanUser = async (userId: string) => {
    if (!confirm('Unban this user?')) return

    try {
      const { error } = await supabase
        .from('users')
        .update({
          is_banned: false,
          banned_at: null,
          banned_reason: null,
        } as never)
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u =>
        u.id === userId
          ? { ...u, is_banned: false, banned_reason: null }
          : u
      ))
      toast.success('User unbanned')
    } catch (error) {
      console.error('Failed to unban user:', error)
      toast.error('Failed to unban user')
    }
  }

  const handleCreditUser = async () => {
    if (!creditModalUser) return

    const amount = parseInt(creditAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid credit amount')
      return
    }

    try {
      const newCredits = (creditModalUser.ai_credits || 0) + amount
      const { error } = await supabase
        .from('users')
        .update({ ai_credits: newCredits } as never)
        .eq('id', creditModalUser.id)

      if (error) throw error

      setUsers(users.map(u =>
        u.id === creditModalUser.id
          ? { ...u, ai_credits: newCredits }
          : u
      ))
      setCreditModalUser(null)
      setCreditAmount('')
      toast.success(`Added ${amount} credits to ${creditModalUser.username} (total: ${newCredits})`)
    } catch (error) {
      console.error('Failed to credit user:', error)
      toast.error('Failed to add credits')
    }
  }

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      user.username.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.display_name?.toLowerCase().includes(search)
    )
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">User Management</h1>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by username or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-purple-400 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setFilterBanned(!filterBanned)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              filterBanned
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Ban size={18} />
            Banned Only
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">User</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Credits</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Joined</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className={user.is_banned ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                          {user.avatar_url ? (
                            <Image src={user.avatar_url} alt="" width={40} height={40} className="object-cover" />
                          ) : (
                            user.username.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{user.username}</p>
                          {user.display_name && (
                            <p className="text-xs text-gray-500">{user.display_name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.role === 'super_admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                        user.role === 'admin' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                        user.role === 'moderator' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Sparkles size={14} className="text-yellow-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.ai_credits || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.is_banned ? (
                        <span className="flex items-center gap-1 text-red-600 text-sm">
                          <Ban size={14} />
                          Banned
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle size={14} />
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/user/${user.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                          title="View Profile"
                        >
                          <Eye size={18} className="text-gray-500" />
                        </a>
                        <button
                          onClick={() => setCreditModalUser(user)}
                          className="p-2 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition"
                          title="Add Credits"
                        >
                          <Sparkles size={18} className="text-yellow-500" />
                        </button>
                        {user.role === 'user' && (
                          user.is_banned ? (
                            <button
                              onClick={() => handleUnbanUser(user.id)}
                              className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition"
                              title="Unban User"
                            >
                              <CheckCircle size={18} className="text-green-600" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setBanModalUser(user)}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                              title="Ban User"
                            >
                              <Ban size={18} className="text-red-500" />
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ban Modal */}
      {banModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Ban {banModalUser.username}?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This will prevent the user from logging in and hide their content.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason (optional)
              </label>
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="e.g., Violation of community guidelines"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-red-400 focus:outline-none resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setBanModalUser(null)
                  setBanReason('')
                }}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleBanUser}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Credit Modal */}
      {creditModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Add Credits
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Adding credits to <span className="font-semibold">{creditModalUser.username}</span>
            </p>
            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Sparkles size={16} className="text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Current balance:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{creditModalUser.ai_credits || 0} credits</span>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Credits to add
              </label>
              <input
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="e.g., 25"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-purple-400 focus:outline-none"
              />
              {creditAmount && parseInt(creditAmount) > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  New balance will be: {(creditModalUser.ai_credits || 0) + parseInt(creditAmount)} credits
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCreditModalUser(null)
                  setCreditAmount('')
                }}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditUser}
                className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition"
              >
                Add Credits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
