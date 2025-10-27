import React from 'react'

interface NetworkToggleProps {
  network: 'mainnet' | 'devnet'
  onNetworkChange: (network: 'mainnet' | 'devnet') => void
  disabled?: boolean
  className?: string
}

export const NetworkToggle: React.FC<NetworkToggleProps> = ({
  network,
  onNetworkChange,
  disabled = false,
  className = ''
}) => {
  return (
    <div className={`network-toggle ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Network Environment
      </label>

      <div className="relative inline-flex items-center bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => onNetworkChange('devnet')}
          disabled={disabled}
          className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            network === 'devnet'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Devnet
          {network === 'devnet' && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
              Testing
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onNetworkChange('mainnet')}
          disabled={disabled}
          className={`relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            network === 'mainnet'
              ? 'bg-white text-green-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          Mainnet
          {network === 'mainnet' && (
            <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
              Production
            </span>
          )}
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {network === 'devnet' ? (
          <div className="space-y-1">
            <div>• Test environment with free SOL</div>
            <div>• Only USDC token available</div>
            <div>• No real money transactions</div>
          </div>
        ) : (
          <div className="space-y-1">
            <div>• Production environment</div>
            <div>• All stablecoins available (USDC, USDT, DAI, PYUSD)</div>
            <div>• Real money transactions</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default NetworkToggle