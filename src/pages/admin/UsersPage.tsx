import { useEffect, useState } from 'react'
import { AppShell } from '../../components/layout/AppShell'
import { Alert } from '../../components/ui/Alert'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { fetchAllProfiles, updateUserRole, toggleUserStatus } from '../../services/adminService'
import type { ProfileWithRoles, RoleName } from '../../types/database'
import { User, Shield, UserMinus, UserPlus, Search } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<ProfileWithRoles[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isProcessing, setIsActionLoading] = useState<string | null>(null)

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const data = await fetchAllProfiles()
      setUsers(data)
    } catch (err) {
      setError('Failed to load user profiles.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleToggleRole = async (userId: string, role: RoleName, hasRole: boolean) => {
    setIsActionLoading(userId + role)
    try {
      await updateUserRole(userId, role, hasRole ? 'REMOVE' : 'ADD')
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

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.user_number.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">පරිශීලක කළමනාකරණය</h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Manage system access, roles, and administrative permissions.
          </p>
        </div>

        <div className="relative group max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
          <div className="flex h-64 items-center justify-center">
            <Spinner label="පූරණය වෙමින්..." />
          </div>
        ) : (
          <div className="table-container">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead>
                  <tr>
                    <th className="table-header px-6 py-4">User</th>
                    <th className="table-header px-6 py-4">Roles</th>
                    <th className="table-header px-6 py-4">Status</th>
                    <th className="table-header px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="table-row">
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900">{user.name}</span>
                            <span className="text-xs text-slate-500 font-medium">{user.user_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div className="flex flex-wrap gap-1.5">
                          {user.roles.map(role => (
                            <Badge key={role} tone={role === 'ADMIN' ? 'red' : role === 'SUPERVISOR' ? 'brand' : 'slate'}>
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="table-cell">
                        <Badge tone={user.is_active ? 'green' : 'slate'}>
                          {user.is_active ? 'Active' : 'Disabled'}
                        </Badge>
                      </td>
                      <td className="table-cell text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleRole(user.id, 'ADMIN', user.roles.includes('ADMIN'))}
                            disabled={!!isProcessing}
                            className={`btn-ghost btn-sm ${user.roles.includes('ADMIN') ? 'text-red-600' : 'text-slate-600'}`}
                            title={user.roles.includes('ADMIN') ? 'Remove Admin' : 'Make Admin'}
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user.id, user.is_active)}
                            disabled={!!isProcessing}
                            className="btn-ghost btn-sm text-slate-600"
                            title={user.is_active ? 'Disable User' : 'Enable User'}
                          >
                            {user.is_active ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
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
      </div>
    </AppShell>
  )
}
