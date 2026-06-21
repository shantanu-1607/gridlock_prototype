import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'

import { AuthProvider } from './context/AuthContext'
import { routes } from './routes/router'

const router = createBrowserRouter(routes)

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors offset="80px" />
    </AuthProvider>
  )
}

export default App
