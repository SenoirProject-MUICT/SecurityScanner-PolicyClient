import { useEffect } from 'react'
import './App.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/libs/api/query-client'
import { Toaster } from '@/components/ui/sonner'
import { AppRouter } from './app/router'
import { ThemeProvider } from 'next-themes'
import { BRAND } from '@/constants/brand'

export default function App() {
  useEffect(() => {
    document.title = BRAND.documentTitle
    document.querySelector<HTMLLinkElement>('link[rel="icon"]')?.setAttribute('href', BRAND.favicon)
  }, [])

  return <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} storageKey={BRAND.themeStorageKey}><QueryClientProvider client={queryClient}><AppRouter /><Toaster position="top-right" /></QueryClientProvider></ThemeProvider>
}
