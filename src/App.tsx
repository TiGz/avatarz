import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { useAuth } from '@/hooks/useAuth'
import { LoginPage } from '@/pages/LoginPage'
import { HomePage } from '@/pages/HomePage'
import { AdminPage } from '@/pages/AdminPage'
import { WizardPage } from '@/pages/WizardPage'
import { PhotoLibraryPage } from '@/pages/PhotoLibraryPage'
import { GalleryPage } from '@/pages/GalleryPage'
import { WallpaperPage } from '@/pages/WallpaperPage'
import { InviteRedemptionPage } from '@/pages/InviteRedemptionPage'
import { Loader2 } from 'lucide-react'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <HomePage /> : <LoginPage />}
      />
      <Route
        path="/wizard"
        element={user ? <WizardPage /> : <Navigate to="/" />}
      />
      <Route
        path="/admin"
        element={user ? <AdminPage /> : <Navigate to="/" />}
      />
      <Route
        path="/photos"
        element={user ? <PhotoLibraryPage /> : <Navigate to="/" />}
      />
      <Route
        path="/gallery"
        element={user ? <GalleryPage /> : <Navigate to="/" />}
      />
      <Route
        path="/wallpaper/:generationId"
        element={user ? <WallpaperPage /> : <Navigate to="/" />}
      />
      <Route
        path="/invite/:code"
        element={<InviteRedemptionPage />}
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

function App() {
  return (
    <HashRouter>
      <AppRoutes />
      <Toaster position="top-center" richColors />
    </HashRouter>
  )
}

export default App
