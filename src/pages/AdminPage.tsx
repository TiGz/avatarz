import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAdmin } from '@/hooks/useAdmin'
import { AllowlistManager } from '@/components/admin/AllowlistManager'
import { InviteUser } from '@/components/admin/InviteUser'
import { RecentGenerations } from '@/components/admin/RecentGenerations'
import { UserStats } from '@/components/admin/UserStats'
import { Shield, UserPlus, History, BarChart3, Users } from 'lucide-react'
import { Header } from '@/components/ui/Header'

type Tab = 'allowlist' | 'invite' | 'generations' | 'stats'

export function AdminPage() {
  const { isAdmin, loading } = useAdmin()
  const [activeTab, setActiveTab] = useState<Tab>('generations')

  console.log('[AdminPage] Render - loading:', loading, 'isAdmin:', isAdmin)

  if (loading) {
    console.log('[AdminPage] Still loading, showing spinner')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!isAdmin) {
    console.log('[AdminPage] Not admin, redirecting to home')
    return <Navigate to="/" replace />
  }

  console.log('[AdminPage] Rendering admin content')

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'generations', label: 'Generations', icon: <History className="h-4 w-4" /> },
    { id: 'stats', label: 'Users', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'invite', label: 'Invite', icon: <UserPlus className="h-4 w-4" /> },
    { id: 'allowlist', label: 'Allowlist', icon: <Users className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
      <Header showBack />

      {/* Main Content */}
      <main className="px-4 py-8 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-400">Manage users, invites, and view stats</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
            {activeTab === 'allowlist' && <AllowlistManager />}
            {activeTab === 'invite' && <InviteUser />}
            {activeTab === 'generations' && <RecentGenerations />}
            {activeTab === 'stats' && <UserStats />}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
