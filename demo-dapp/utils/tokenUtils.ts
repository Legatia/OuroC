export type SupportedToken = 'USDC' | 'USDT' | 'PYUSD' | 'DAI'

export const TOKEN_MINTS = {
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  DAI: 'EjmyN6qEC1Tf1JxiG1ae7UTJhUxSwk1TCWNWqxWV4J6o',
} as const

export const TOKEN_MINTS_DEVNET = {
  USDC: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  USDT: null, // Not available on devnet
  PYUSD: null, // Not available on devnet
  DAI: null, // Not available on devnet
} as const

export function getTokenMint(token: SupportedToken, network: 'mainnet' | 'devnet'): string | null {
  if (network === 'mainnet') {
    return TOKEN_MINTS[token]
  } else {
    return TOKEN_MINTS_DEVNET[token]
  }
}

export function isTokenAvailableOnDevnet(token: SupportedToken): boolean {
  return TOKEN_MINTS_DEVNET[token] !== null
}