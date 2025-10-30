/**
 * React Hook for Recurring Payment Timer
 *
 * Easy integration into React components
 */

import { useState, useEffect, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createRecurringPaymentTimer, type RecurringPaymentTimer, type PaymentExecution } from '../lib/recurringPaymentTimer';

export function useRecurringPaymentTimer() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const [executionHistory, setExecutionHistory] = useState<PaymentExecution[]>([]);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<RecurringPaymentTimer | null>(null);

  // Initialize timer when wallet connects
  useEffect(() => {
    if (wallet.connected && wallet.publicKey && connection) {
      if (!timerRef.current) {
        timerRef.current = createRecurringPaymentTimer(wallet, connection);
      }
    } else {
      // Stop timer if wallet disconnects
      if (timerRef.current && isRunning) {
        stop();
      }
    }
  }, [wallet.connected, wallet.publicKey, connection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current && isRunning) {
        timerRef.current.stop();
      }
    };
  }, []);

  const start = async () => {
    try {
      setError(null);
      if (!timerRef.current) {
        throw new Error('Timer not initialized. Connect wallet first.');
      }

      await timerRef.current.start();
      setIsRunning(true);
      console.log('✅ Timer started successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start timer';
      setError(errorMsg);
      console.error('❌ Failed to start timer:', err);
    }
  };

  const stop = () => {
    try {
      setError(null);
      if (!timerRef.current) {
        throw new Error('Timer not initialized');
      }

      timerRef.current.stop();
      setIsRunning(false);
      console.log('✅ Timer stopped successfully');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to stop timer';
      setError(errorMsg);
      console.error('❌ Failed to stop timer:', err);
    }
  };

  const refreshStatus = () => {
    if (timerRef.current) {
      const status = timerRef.current.getStatus();
      setIsRunning(status.isRunning);
      setLastCheckTime(status.lastCheckTime);
      setExecutionHistory(status.executionHistory);
    }
  };

  const clearHistory = () => {
    if (timerRef.current) {
      timerRef.current.clearHistory();
      setExecutionHistory([]);
    }
  };

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    isRunning,
    lastCheckTime,
    executionHistory,
    error,
    isConnected: wallet.connected && !!wallet.publicKey,
    start,
    stop,
    refreshStatus,
    clearHistory,
  };
}
