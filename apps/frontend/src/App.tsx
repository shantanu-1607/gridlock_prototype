import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import ErrorBoundary from './components/ui/error-boundary'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeProvider'
import { routes } from './routes/router'

const router = createBrowserRouter(routes)

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors offset="80px" />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
