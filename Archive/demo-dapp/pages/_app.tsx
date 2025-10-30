import type { AppProps } from 'next/app'
import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import Navbar from '../components/Navbar'

// Import styles
import '../styles/globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'

function MyApp({ Component, pageProps }: AppProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet

  // You can provide a custom RPC endpoint
  const endpoint = useMemo(() => {
    // For demo purposes, using Devnet
    return clusterApiUrl(network)
  }, [network])

  // Use empty wallets array - wallet-standard will auto-detect Phantom
  const wallets = useMemo(() => [], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <Navbar />
          <Component {...pageProps} />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default MyApp