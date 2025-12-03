import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { AllowlistEntry } from '@/types'

export function AllowlistManager() {
  const [entries, setEntries] = useState<AllowlistEntry[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('allowlist')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load allowlist')
      console.error(error)
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }

  const addEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    setAdding(true)
    const { error } = await supabase
      .from('allowlist')
      .insert({ email: newEmail.toLowerCase().trim() })

    if (error) {
      if (error.code === '23505') {
        toast.error('Email already in allowlist')
      } else {
        toast.error('Failed to add email')
        console.error(error)
      }
    } else {
      toast.success('Email added to allowlist')
      setNewEmail('')
      fetchEntries()
    }
    setAdding(false)
  }

  const deleteEmail = async (id: string) => {
    setDeleting(id)
    const { error } = await supabase
      .from('allowlist')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove email')
      console.error(error)
    } else {
      toast.success('Email removed from allowlist')
      setEntries(entries.filter(e => e.id !== id))
    }
    setDeleting(null)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addEmail} className="flex gap-2">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="email"
            placeholder="Enter email to add"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={adding}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
          />
        </div>
        <Button
          type="submit"
          disabled={adding || !newEmail.trim()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          {adding ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </form>

      <div className="space-y-2">
        <h3 className="font-semibold text-white text-sm uppercase tracking-wide">
          Guest List ({entries.length})
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No emails in the allowlist yet
          </p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
              >
                <span className="text-gray-300 text-sm truncate">
                  {entry.email}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteEmail(entry.id)}
                  disabled={deleting === entry.id}
                  className="h-8 w-8 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                >
                  {deleting === entry.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
