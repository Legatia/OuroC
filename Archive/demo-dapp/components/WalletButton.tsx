'use client'

import { useEffect, useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function WalletButton() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="wallet-adapter-button wallet-adapter-button-trigger">
        <span>Select Wallet</span>
      </button>
    )
  }

  return <WalletMultiButton />
}
