import Link from 'next/link'
import { Github, Twitter, Globe, Heart } from 'lucide-react'

const navigation = {
  product: [
    { name: 'Features', href: '#' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'API Docs', href: '#' },
    { name: 'Changelog', href: '#' },
  ],
  support: [
    { name: 'Documentation', href: '#' },
    { name: 'Help Center', href: '#' },
    { name: 'Contact', href: '#' },
    { name: 'Status', href: '#' },
  ],
  company: [
    { name: 'About', href: '#' },
    { name: 'Blog', href: '#' },
    { name: 'Jobs', href: '#' },
    { name: 'Press', href: '#' },
  ],
  legal: [
    { name: 'Privacy', href: '#' },
    { name: 'Terms', href: '#' },
    { name: 'License', href: '#' },
  ],
  social: [
    {
      name: 'Twitter',
      href: '#',
      icon: Twitter,
    },
    {
      name: 'GitHub',
      href: '#',
      icon: Github,
    },
    {
      name: 'Website',
      href: '#',
      icon: Globe,
    },
  ],
}

export default function Footer() {
  return (
    <footer className="glass border-t border-white/10 mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-primary to-green-primary">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold gradient-text">
                  Ouro-C Demo
                </div>
                <div className="text-sm text-gray-400">
                  Powered by Ouro-C
                </div>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-md">
              Decentralized subscription management with seamless USDC payments.
              Built to showcase the power of Ouro-C's recurring payment infrastructure.
            </p>
            <div className="flex space-x-4 mt-6">
              {navigation.social.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-400 hover:text-purple-primary transition-colors"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="text-sm font-semibold text-white">Product</h3>
            <ul className="mt-4 space-y-2">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Support</h3>
            <ul className="mt-4 space-y-2">
              {navigation.support.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Company</h3>
            <ul className="mt-4 space-y-2">
              {navigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col md:flex-row md:items-center md:space-x-6">
            <p className="text-xs text-gray-400">
              &copy; 2024 Ouro-C Demo. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-2 md:mt-0">
              {navigation.legal.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-4 md:mt-0">
            <p className="text-xs text-gray-400 flex items-center">
              Made with{' '}
              <Heart className="h-3 w-3 mx-1 text-red-500 fill-current" />{' '}
              using{' '}
              <span className="ml-1 gradient-text font-medium">Ouro-C SDK</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}