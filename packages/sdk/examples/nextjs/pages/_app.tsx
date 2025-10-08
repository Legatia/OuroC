import { AppProps } from 'next/app'
import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import { OuroCProvider } from '@OuroC/react-sdk'

// Default styles that can be overridden by your dApp
require('@solana/wallet-adapter-react-ui/styles.css')

function MyApp({ Component, pageProps }: AppProps) {
  // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'
  const network = WalletAdapterNetwork.Devnet

  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <OuroCProvider
            canisterId="your-canister-id-here"
            network="devnet"
            theme={{
              colors: {
                primary: '#9945FF', // Your brand color
                secondary: '#00D18C',
                // ... other custom colors
              }
            }}
            onSubscriptionCreate={(subscription) => {
              console.log('New subscription created:', subscription)
              // Track analytics, show toast, etc.
            }}
            onPaymentSuccess={(hash) => {
              console.log('Payment successful:', hash)
              // Track conversion, show success message
            }}
            onError={(error, context) => {
              console.error(`OuroC error in ${context}:`, error)
              // Send to error tracking service
            }}
          >
            <Component {...pageProps} />
          </OuroCProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default MyApp