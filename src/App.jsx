import './App.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import Pages from "./pages/index.jsx"
import { Toaster } from "./components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Pages />
        <Toaster />
        <SonnerToaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App 