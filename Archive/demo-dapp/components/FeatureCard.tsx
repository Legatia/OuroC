import { LucideIcon } from 'lucide-react'

interface FeatureCardProps {
  icon: LucideIcon
  title: string
  description: string
  gradient: string
}

export default function FeatureCard({ icon: Icon, title, description, gradient }: FeatureCardProps) {
  return (
    <div className="glass p-8 hover-lift group">
      <div className={`inline-flex p-4 rounded-xl bg-gradient-to-r ${gradient} mb-6 group-hover:shadow-lg transition-all duration-200`}>
        <Icon className="h-8 w-8 text-white" />
      </div>

      <h3 className="text-xl font-semibold text-white mb-4 group-hover:text-purple-300 transition-colors">
        {title}
      </h3>

      <p className="text-gray-300 leading-relaxed">
        {description}
      </p>
    </div>
  )
}