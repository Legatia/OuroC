import React, { useState } from 'react'
import { SupportedToken, TOKEN_METADATA, isTokenAvailableOnDevnet } from '../core/types'

interface TokenSelectorProps {
  selectedToken: SupportedToken
  onTokenChange: (token: SupportedToken) => void
  network: 'mainnet' | 'devnet'
  disabled?: boolean
  className?: string
}

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onTokenChange,
  network,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const tokens: SupportedToken[] = ['USDC', 'USDT', 'PYUSD', 'DAI']

  const handleTokenSelect = (token: SupportedToken) => {
    if (!disabled && (network === 'mainnet' || isTokenAvailableOnDevnet(token))) {
      onTokenChange(token)
      setIsOpen(false)
    }
  }

  const selectedTokenMetadata = TOKEN_METADATA[selectedToken]

  return (
    <div className={`token-selector ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Payment Token
      </label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="w-full flex items-center justify-between px-4 py-3 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{selectedTokenMetadata.icon}</span>
            <div>
              <div className="font-medium text-gray-900">
                {selectedTokenMetadata.name}
              </div>
              <div className="text-sm text-gray-500">
                {selectedTokenMetadata.symbol}
              </div>
            </div>
          </div>

          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="py-2">
              {tokens.map((token) => {
                const metadata = TOKEN_METADATA[token]
                const isAvailable = network === 'mainnet' || isTokenAvailableOnDevnet(token)
                const isSelected = token === selectedToken

                return (
                  <button
                    key={token}
                    type="button"
                    onClick={() => handleTokenSelect(token)}
                    disabled={!isAvailable}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    } ${
                      !isAvailable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{metadata.icon}</span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {metadata.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {metadata.symbol}
                          </div>
                          <div className="text-xs text-gray-400">
                            {metadata.description}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {!isAvailable && (
                      <div className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        Not available on devnet - Switch to mainnet to use this token
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {network === 'devnet' && (
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  <strong>Devnet Notice:</strong> Only USDC is available on devnet.
                  Switch to mainnet to use USDT, PYUSD, and DAI tokens.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-2 text-xs text-gray-500">
        <span className="font-medium">Network:</span> {network === 'mainnet' ? 'Mainnet' : 'Devnet'}
        {network === 'devnet' && (
          <span className="ml-2 text-orange-600">
            (Limited token support)
          </span>
        )}
      </div>
    </div>
  )
}

export default TokenSelector