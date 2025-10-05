import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { Menu, X, BarChart3, Clock, CreditCard } from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Home', href: '/', icon: BarChart3 },
  { name: 'Ouro-C Demo', href: '/pricing', icon: Clock },
]

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const { connected } = useWallet()

  return (
    <header className="relative z-50">
      <nav className="glass border-b border-white/10 px-6 lg:px-8" aria-label="Global">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 group">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-primary to-green-primary group-hover:shadow-lg group-hover:shadow-purple-primary/25 transition-all duration-200">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-bold gradient-text">
                  Ouro-C
                </div>
                <div className="text-xs text-gray-400 -mt-1">
                  Solana Subscription Protocol
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = router.pathname === item.href

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-purple-primary/20 text-purple-300 border border-purple-primary/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* Wallet Connection & Mobile Menu */}
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            {connected && (
              <div className="hidden sm:flex items-center space-x-2 px-3 py-2 rounded-lg bg-green-primary/20 border border-green-primary/30">
                <div className="w-2 h-2 bg-green-primary rounded-full animate-pulse"></div>
                <span className="text-sm text-green-300 font-medium">Connected</span>
              </div>
            )}

            {/* Wallet Button */}
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-primary !to-purple-dark hover:!from-purple-dark hover:!to-purple-primary !rounded-xl !font-semibold !px-6 !py-2.5 !text-sm" />

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = router.pathname === item.href

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'flex items-center space-x-3 px-3 py-3 rounded-lg text-base font-medium transition-all duration-200',
                      isActive
                        ? 'bg-purple-primary/20 text-purple-300 border border-purple-primary/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}