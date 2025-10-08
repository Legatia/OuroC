import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { Menu, X, User, Store, Zap, ChevronDown } from 'lucide-react'
import WalletButton from './WalletButton'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showMerchantMenu, setShowMerchantMenu] = useState(false)
  const router = useRouter()

  const isActive = (path: string) => {
    return router.pathname === path
  }

  const subscriberLinks = [
    { href: '/', label: 'Subscribe' },
  ]

  const merchantLinks = [
    { href: '/grid-merchant', label: 'Merchant Setup' },
    { href: '/merchant-dashboard', label: 'Dashboard' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-primary to-green-primary flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Ouro-C</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Subscriber Links */}
            <div className="flex items-center space-x-1 mr-4">
              <div className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-purple-primary/10 border border-purple-primary/20">
                <User className="h-4 w-4 text-purple-primary" />
                <span className="text-xs font-medium text-purple-primary">Subscriber</span>
              </div>
              {subscriberLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Merchant Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMerchantMenu(!showMerchantMenu)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Store className="h-4 w-4" />
                <span>Merchant</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showMerchantMenu ? 'rotate-180' : ''}`} />
              </button>

              {showMerchantMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-full right-0 mt-2 w-48 glass rounded-lg border border-white/10 overflow-hidden"
                  onMouseLeave={() => setShowMerchantMenu(false)}
                >
                  {merchantLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setShowMerchantMenu(false)}
                      className={`block px-4 py-3 text-sm transition-colors ${
                        isActive(link.href)
                          ? 'bg-white/10 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Wallet Button */}
            <div className="ml-4">
              <WalletButton />
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden pb-4 space-y-2"
          >
            {/* Subscriber Section */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2 px-4 py-2 text-xs font-medium text-purple-primary">
                <User className="h-4 w-4" />
                <span>SUBSCRIBER</span>
              </div>
              {subscriberLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive(link.href)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 my-2" />

            {/* Merchant Section */}
            <div className="space-y-1">
              <div className="flex items-center space-x-2 px-4 py-2 text-xs font-medium text-green-primary">
                <Store className="h-4 w-4" />
                <span>MERCHANT</span>
              </div>
              {merchantLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                    isActive(link.href)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10 my-2" />

            {/* Wallet Button */}
            <div className="px-4">
              <WalletButton />
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  )
}
