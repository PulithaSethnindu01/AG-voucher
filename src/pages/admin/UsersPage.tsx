import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { fetchAllProfiles, updateUserRole, toggleUserStatus } from '../../services/adminService'
import { registerUser } from '../../services/authService'
import type { ProfileWithRoles, RoleName } from '../../types/database'
import { User, Shield, UserMinus, UserPlus, Search, X, Loader2, Key } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const ALL_ROLES: RoleName[] = ['FINAL_PAYMENT_OFFICER', 'ADMIN']

export default function UsersPage() {
  const { hasRole } = useAuth()
  const isSupervisor = hasRole('SUPERVISOR')

  const [users, setUsers] = useState<ProfileWithRoles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isProcessing, setIsActionLoading] = useState<string | null>(null)

  // Create User Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUserNumber, setNewUserNumber] = useState('')
  const [newMobile, setNewMobile] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const data = await fetchAllProfiles()
      setUsers(data)
    } catch (err) {
      setError('පරිශීලක පැතිකඩ පූරණය කිරීමට අසමත් විය.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleRole = async (userId: string, role: RoleName, hasRoleNow: boolean) => {
    setIsActionLoading(userId + role)
    try {
      await updateUserRole(userId, role, hasRoleNow ? 'REMOVE' : 'ADD')
      await loadUsers()
    } catch (err: any) {
      alert(err.message || 'භූමිකාව යාවත්කාලීන කිරීමට අසමත් විය.')
    } finally {
      setIsActionLoading(null)
    }
  }

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    setIsActionLoading(userId + 'status')
    try {
      await toggleUserStatus(userId, !currentStatus)
      await loadUsers()
    } catch (err: any) {
      alert(err.message || 'තත්ත්වය යාවත්කාලීන කිරීමට අසමත් විය.')
    } finally {
      setIsActionLoading(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      const result = await registerUser({
        name: newName,
        userNumber: newUserNumber,
        mobileNumber: newMobile,
        password: newPassword
      })
      if (!result.success) throw new Error(result.error || 'නිර්මාණය කිරීමට අසමත් විය')

      setShowCreateModal(false)
      setNewName('')
      setNewUserNumber('')
      setNewMobile('')
      setNewPassword('')
      await loadUsers()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">පරිශීලක කළමනාකරණය</h1>
            <p className="mt-1 text-sm font-medium text-slate-500 text-balance">
              පද්ධති ප්‍රවේශය, භූමිකාවන් සහ පරිපාලන අවසරයන් කළමනාකරණය කරන්න.
            </p>
          </div>
          {isSupervisor && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <UserPlus className="h-4 w-4" />
              නව ගිණුමක් සාදන්න
            </button>
          )}
        </div>

        <div className="relative group max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-500" />
          <input
            type="text"
            placeholder="නම හෝ සේවා අංකය අනුව සොයන්න..."
            className="form-input pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        {isLoading ? (
          <div className="flex h-64 items-center justify-center card bg-white/50 backdrop-blur-sm border-dashed">
            <Spinner label="පූරණය වෙමින්..." />
          </div>
        ) : (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="table-header px-6 py-4">පරිශීලකයා</th>
                    <th className="table-header px-6 py-4 text-center">භූමිකාවන් (Roles)</th>
                    <th className="table-header px-6 py-4 text-right">ක්‍රියාමාර්ග</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="table-row group">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${user.is_active ? 'bg-slate-100 text-slate-500' : 'bg-red-50 text-red-400'}`}>
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className={`font-bold ${user.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>{user.name}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{user.user_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap justify-center gap-2">
                          {ALL_ROLES.map(role => {
                            const hasThisRole = user.roles.includes(role)
                            const isProcessingThis = isProcessing === user.id + role
                            const canEdit = isSupervisor || (role !== 'ADMIN' && role !== 'SUPERVISOR')

                            return (
                              <button
                                key={role}
                                disabled={!!isProcessing || !canEdit}
                                onClick={() => handleToggleRole(user.id, role, hasThisRole)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                  hasThisRole
                                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-200 scale-105'
                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-200'
                                } disabled:opacity-30 disabled:scale-100 disabled:cursor-not-allowed`}
                              >
                                {isProcessingThis ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-3 w-3" />}
                                {role.replace(/_/g, ' ')}
                              </button>
                            )
                          })}
                          {user.roles.includes('SUPERVISOR') && (
                            <Badge tone="brand">SUPERVISOR</Badge>
                          )}
                        </div>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            disabled={!!isProcessing || (user.roles.includes('SUPERVISOR') && !isSupervisor)}
                            className={`btn-ghost h-9 w-9 p-0 flex items-center justify-center rounded-lg transition-colors ${
                              user.is_active
                                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            } disabled:opacity-30`}
                            title={user.is_active ? 'අබල කරන්න (Disable)' : 'සක්‍රිය කරන්න (Enable)'}
                          >
                            {isProcessing === user.id + 'status' ? <Loader2 className="h-4 w-4 animate-spin" /> : (user.is_active ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />)}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="card w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-brand-600" />
                  නව පරිශීලකයෙකු එක් කරන්න
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="form-label">සම්පූර්ණ නම</label>
                  <input
                    type="text"
                    required
                    className="form-input h-11"
                    placeholder="උදා: ජෝන් ඩෝ"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="form-label">සේවා අංකය</label>
                    <input
                      type="text"
                      required
                      className="form-input h-11"
                      placeholder="e.g. 1024"
                      value={newUserNumber}
                      onChange={e => setNewUserNumber(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="form-label">දුරකථන අංකය</label>
                    <input
                      type="tel"
                      required
                      className="form-input h-11"
                      placeholder="07x xxxxxxx"
                      value={newMobile}
                      onChange={e => setNewMobile(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="form-label flex items-center gap-2">
                    <Key className="h-3 w-3" />
                    මුරපදය
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    className="form-input h-11"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">අවම වශයෙන් අක්ෂර 8ක්</p>
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={isCreating} className="btn-primary w-full h-12 text-base font-black">
                    {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : 'ගිණුම සාදන්න'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}