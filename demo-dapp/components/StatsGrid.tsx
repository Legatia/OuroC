import { motion } from 'framer-motion'
import { TrendingUp, Users, DollarSign, BarChart } from 'lucide-react'

const stats = [
  {
    name: 'Active Subscriptions',
    value: '12,847',
    change: '+12.5%',
    changeType: 'positive',
    icon: Users,
    description: 'Recurring subscriptions powered by OuroC'
  },
  {
    name: 'Total Volume',
    value: '₾ 2.4M',
    change: '+8.2%',
    changeType: 'positive',
    icon: DollarSign,
    description: 'SOL processed through our platform'
  },
  {
    name: 'Payment Success Rate',
    value: '99.8%',
    change: '+0.3%',
    changeType: 'positive',
    icon: TrendingUp,
    description: 'Reliable automated payments'
  },
  {
    name: 'dApps Integrated',
    value: '847',
    change: '+23.1%',
    changeType: 'positive',
    icon: BarChart,
    description: 'Applications using OuroC SDK'
  }
]

export default function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        return (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="glass p-6 hover-lift group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-r from-purple-primary to-green-primary group-hover:shadow-lg group-hover:shadow-purple-primary/25 transition-all duration-200">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <span
                className={`text-sm font-medium px-2 py-1 rounded-full ${
                  stat.changeType === 'positive'
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-red-400 bg-red-400/10'
                }`}
              >
                {stat.change}
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
              <p className="text-sm font-medium text-gray-300">{stat.name}</p>
              <p className="text-xs text-gray-400">{stat.description}</p>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}