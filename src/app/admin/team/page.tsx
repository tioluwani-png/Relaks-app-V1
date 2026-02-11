'use client'

import { useEffect, useState } from 'react'
import { UserPlus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { UserRole } from '@/types/database'

interface TeamMember {
  id: string
  email: string
  username: string
  role: UserRole
  created_at: string
}

const roleOptions: { value: UserRole; label: string; description: string }[] = [
  { value: 'moderator', label: 'Moderator', description: 'Can review reports and delete posts' },
  { value: 'admin', label: 'Admin', description: 'Can ban users and upload references' },
  { value: 'super_admin', label: 'Super Admin', description: 'Full access including role management' },
]

export default function AdminTeamPage() {
  const supabase = createClient()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [showAddForm, setShowAddForm] = useState(false)
  const [addEmail, setAddEmail] = useState('')
  const [addRole, setAddRole] = useState<UserRole>('moderator')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    loadTeam()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, username, role, created_at')
        .in('role', ['moderator', 'admin', 'super_admin'])
        .order('role')

      if (error) throw error
      setTeamMembers((data as TeamMember[]) || [])
    } catch (error) {
      console.error('Failed to load team:', error)
      toast.error('Failed to load team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddMember = async () => {
    if (!addEmail.trim()) {
      setAddError('Please enter an email')
      return
    }

    setIsAdding(true)
    setAddError(null)

    try {
      const { data: foundUser, error: findError } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('email', addEmail.toLowerCase().trim())
        .single()

      if (findError || !foundUser) {
        setAddError('User not found. They must sign up first.')
        setIsAdding(false)
        return
      }

      const typedUser = foundUser as { id: string; email: string; username: string }

      const { error: updateError } = await supabase
        .from('users')
        .update({ role: addRole } as never)
        .eq('id', typedUser.id)

      if (updateError) throw updateError

      loadTeam()
      setShowAddForm(false)
      setAddEmail('')
      setAddRole('moderator')
      toast.success(`${typedUser.username} added as ${addRole.replace('_', ' ')}`)
    } catch (error) {
      console.error('Failed to add member:', error)
      setAddError('Failed to add team member')
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveMember = async (userId: string, username: string) => {
    if (!confirm(`Remove ${username} from the team? They will become a regular user.`)) return

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: 'user' } as never)
        .eq('id', userId)

      if (error) throw error

      setTeamMembers(teamMembers.filter(m => m.id !== userId))
      toast.success(`${username} removed from team`)
    } catch (error) {
      console.error('Failed to remove member:', error)
      toast.error('Failed to remove team member')
    }
  }

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole } as never)
        .eq('id', userId)

      if (error) throw error

      setTeamMembers(teamMembers.map(m =>
        m.id === userId ? { ...m, role: newRole } : m
      ))
      toast.success('Role updated')
    } catch (error) {
      console.error('Failed to change role:', error)
      toast.error('Failed to change role')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team & Roles</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-xl hover:opacity-90 transition"
        >
          <UserPlus size={18} />
          Add Member
        </button>
      </div>

      {/* Add Member Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Add Team Member</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User Email
              </label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="team@example.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-purple-400 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">User must already have an account</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <div className="space-y-2">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      addRole === option.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={addRole === option.value}
                      onChange={() => setAddRole(option.value)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{option.label}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{option.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {addError && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {addError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setAddEmail('')
                  setAddError(null)
                }}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={isAdding}
                className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Member</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Joined</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">Loading...</td>
                </tr>
              ) : teamMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">No team members yet</td>
                </tr>
              ) : (
                teamMembers.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{member.username}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.id, e.target.value as UserRole)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm"
                      >
                        {roleOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveMember(member.id, member.username)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                        title="Remove from team"
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
