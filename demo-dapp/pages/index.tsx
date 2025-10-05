import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import {
  Clock,
  Shield,
  Zap,
  Wallet,
  Server,
  ArrowRight,
  CheckCircle,
  Star,
  Globe,
  RefreshCw,
  Bell,
  CreditCard
} from 'lucide-react'
import FeatureCard from '../components/FeatureCard'

const features = [
  {
    icon: Clock,
    title: 'Automated Scheduling',
    description: 'ICP timer canister handles subscription scheduling with precision and reliability.',
    gradient: 'from-purple-500 to-pink-600'
  },
  {
    icon: Wallet,
    title: 'Solana Native',
    description: 'Built specifically for Solana with native USDC support and wallet integration.',
    gradient: 'from-blue-500 to-cyan-600'
  },
  {
    icon: Shield,
    title: 'Secure Authentication',
    description: 'Multi-layer security with Solana signature authentication and permission control.',
    gradient: 'from-green-500 to-emerald-600'
  },
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'Multi-channel reminders via email, Discord, Slack, and custom webhooks.',
    gradient: 'from-yellow-500 to-orange-600'
  },
  {
    icon: RefreshCw,
    title: 'Automatic Failover',
    description: 'Health monitoring with manual payment collection when canister is offline.',
    gradient: 'from-indigo-500 to-purple-600'
  },
  {
    icon: Server,
    title: 'Decentralized Infrastructure',
    description: 'Fully on-chain with ICP canisters and Solana smart contracts working together.',
    gradient: 'from-red-500 to-pink-600'
  }
]

const stats = [
  {
    value: '100%',
    label: 'On-Chain',
    description: 'Fully decentralized subscription management'
  },
  {
    value: '⚡',
    label: 'ICP Timers',
    description: 'Reliable scheduling infrastructure'
  },
  {
    value: '🔒',
    label: 'Secure',
    description: 'Multi-layer security architecture'
  },
  {
    value: '💰',
    label: 'USDC Ready',
    description: 'Stable coin payments by default'
  }
]

export default function Home() {
  const { connected } = useWallet()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-background to-green-900/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(147,51,234,0.1),transparent_50%)]"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-purple-primary/20 border border-purple-primary/30 text-purple-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm font-medium">Decentralized Subscription Protocol</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-bold gradient-text">
                Ouro-C
              </h1>
              <h2 className="text-2xl md:text-4xl font-semibold text-white">
                Solana Subscription Protocol
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Fully on-chain subscription management combining ICP timer reliability
                with Solana's speed. Automated payments, smart notifications, and enterprise security.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Link
                href="/pricing"
                className="group inline-flex items-center space-x-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-primary to-purple-dark hover:from-purple-dark hover:to-purple-primary transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-primary/25"
              >
                <span className="text-lg font-semibold">Try Ouro-C Demo</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>

              <button className="inline-flex items-center space-x-2 px-8 py-4 rounded-xl border border-white/20 hover:bg-white/5 transition-all duration-300 text-white">
                <Globe className="h-5 w-5" />
                <span className="text-lg font-medium">Documentation</span>
              </button>
            </div>

            {/* Connection Status */}
            {mounted && connected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-green-primary/20 border border-green-primary/30"
              >
                <div className="w-2 h-2 bg-green-primary rounded-full animate-pulse"></div>
                <span className="text-sm text-green-300 font-medium">Wallet Connected - Ready for Demo</span>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2"></div>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold gradient-text mb-2">
                  {stat.value}
                </div>
                <div className="text-white font-medium mb-1">{stat.label}</div>
                <div className="text-sm text-gray-400">{stat.description}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Built for the Decentralized Future
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Ouro-C combines the best of Internet Computer Protocol and Solana to deliver
              enterprise-grade subscription management that's completely decentralized.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-20 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              How Ouro-C Works
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              A seamless integration between ICP's reliable timing infrastructure and Solana's fast payment rails.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'ICP Timer Management',
                description: 'Internet Computer canisters handle subscription scheduling with millisecond precision and 99.9% uptime',
                icon: Server,
                color: 'from-purple-500 to-pink-600'
              },
              {
                step: '2',
                title: 'Solana Execution',
                description: 'Fast, low-cost USDC payments executed on Solana with threshold Ed25519 signatures',
                icon: Zap,
                color: 'from-blue-500 to-cyan-600'
              },
              {
                step: '3',
                title: 'Smart Notifications',
                description: 'Multi-channel alerts and health monitoring ensure payments never fail silently',
                icon: Bell,
                color: 'from-green-500 to-emerald-600'
              }
            ].map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="glass p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r ${step.color} mb-6`}>
                    <step.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-sm`}>
                      {step.step}
                    </div>
                    <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Ready to Build with Ouro-C?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Experience the future of decentralized subscriptions. Try our interactive demo
              and see how easy it is to integrate Ouro-C into your dApp.
            </p>
            <Link
              href="/pricing"
              className="group inline-flex items-center space-x-2 px-10 py-5 rounded-xl bg-gradient-to-r from-purple-primary to-green-primary hover:from-green-primary hover:to-purple-primary transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-primary/25"
            >
              <span className="text-xl font-semibold">Launch Demo</span>
              <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  )
}