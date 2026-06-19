import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { routes } from './routes/router'

const router = createBrowserRouter(routes)

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}

export default App
