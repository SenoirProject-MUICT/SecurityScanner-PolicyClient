import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/libs/api/query-client'
import { Toaster } from '@/components/ui/sonner'
import { AppRouter } from './app/router'

export default function App() {
  return <QueryClientProvider client={queryClient}><AppRouter /><Toaster position="top-right" /></QueryClientProvider>
}
