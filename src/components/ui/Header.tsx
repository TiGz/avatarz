import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

interface HeaderProps {
  /** Show back button linking to home */
  showBack?: boolean
  /** Right-side actions */
  children?: React.ReactNode
}

export function Header({ showBack = false, children }: HeaderProps) {
  return (
    <header className="p-4 flex justify-between items-center">
      <div className="flex items-center gap-2">
        {showBack && (
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        )}
        <Link to="/">
          <img
            src={`${import.meta.env.BASE_URL}avatarz-logo.png`}
            alt="Avatarz"
            className="h-10 rounded-lg"
          />
        </Link>
      </div>
      {children && (
        <div className="flex items-center gap-1 sm:gap-2">
          {children}
        </div>
      )}
    </header>
  )
}
