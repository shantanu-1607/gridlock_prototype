import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeProvider'
import { routes } from './routes/router'

const router = createBrowserRouter(routes)

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-center" richColors offset="80px" />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
