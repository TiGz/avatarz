import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { RecentGeneration } from '@/types'

export function RecentGenerations() {
  const [generations, setGenerations] = useState<RecentGeneration[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 20

  useEffect(() => {
    fetchGenerations()
  }, [page])

  const fetchGenerations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .rpc('admin_get_recent_generations', {
        p_limit: pageSize + 1,
        p_offset: page * pageSize,
      })

    if (error) {
      toast.error('Failed to load generations')
      console.error(error)
    } else {
      const results = data || []
      setHasMore(results.length > pageSize)
      setGenerations(results.slice(0, pageSize))
    }
    setLoading(false)
  }

  const formatCost = (cost: number | null) => {
    if (cost === null || cost === undefined) return '-'
    return `$${cost.toFixed(4)}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const formatTokens = (tokens: number | null) => {
    if (tokens === null || tokens === undefined) return '-'
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`
    return tokens.toString()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white">Recent Generations</h3>
          <p className="text-gray-400 text-sm">View all avatar generations with costs</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => { setPage(0); fetchGenerations() }}
          disabled={loading}
          className="text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && generations.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : generations.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">
          No generations yet
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">User</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Style</th>
                  <th className="text-left py-2 px-3 text-gray-400 font-medium">Name</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Tokens</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Cost</th>
                  <th className="text-right py-2 px-3 text-gray-400 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((gen) => (
                  <tr
                    key={gen.gen_id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-2 px-3 text-gray-300 truncate max-w-[150px]">
                      {gen.user_email}
                    </td>
                    <td className="py-2 px-3 text-gray-300 capitalize">
                      {gen.gen_style.replace('-', ' ')}
                    </td>
                    <td className="py-2 px-3 text-gray-300">
                      {gen.gen_name_text || '-'}
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-right">
                      {formatTokens(gen.gen_total_tokens)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={gen.gen_cost_usd ? 'text-green-400' : 'text-gray-500'}>
                        {formatCost(gen.gen_cost_usd)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-gray-400 text-right whitespace-nowrap">
                      {formatDate(gen.gen_created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-gray-500 text-sm">
              Page {page + 1}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={!hasMore || loading}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
