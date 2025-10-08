/**
 * NotificationPermissionPrompt Component
 * UI for requesting push notification permissions from users
 */

import React, { useState } from 'react'
import { usePushNotifications } from '../../hooks/usePushNotifications'

export interface NotificationPermissionPromptProps {
  vapidPublicKey: string
  onSubscribed?: (subscription: any) => void
  onDismiss?: () => void
  className?: string
  showOnlyIfNeeded?: boolean
}

export const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({
  vapidPublicKey,
  onSubscribed,
  onDismiss,
  className = '',
  showOnlyIfNeeded = true
}) => {
  const [isDismissed, setIsDismissed] = useState(false)
  const {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    requestPermission
  } = usePushNotifications({ vapidPublicKey })

  // Don't show if not supported
  if (!isSupported) {
    return null
  }

  // Don't show if already subscribed or permission denied
  if (showOnlyIfNeeded && (isSubscribed || permission.state === 'denied' || isDismissed)) {
    return null
  }

  const handleEnable = async () => {
    try {
      await subscribe()
      onSubscribed?.(permission.subscription)
    } catch (err) {
      console.error('Failed to enable notifications:', err)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    onDismiss?.()
  }

  return (
    <div className={`ouroctime-notification-prompt ${className}`}>
      <div className="ouroctime-notification-prompt__content">
        <div className="ouroctime-notification-prompt__icon">
          🔔
        </div>

        <div className="ouroctime-notification-prompt__text">
          <h3>Stay Updated on Your Subscriptions</h3>
          <p>
            Get notified about upcoming payments, low balance alerts, and payment confirmations.
          </p>

          {error && (
            <div className="ouroctime-notification-prompt__error">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="ouroctime-notification-prompt__actions">
          <button
            onClick={handleEnable}
            disabled={isLoading}
            className="ouroctime-notification-prompt__button ouroctime-notification-prompt__button--primary"
          >
            {isLoading ? 'Enabling...' : 'Enable Notifications'}
          </button>

          <button
            onClick={handleDismiss}
            disabled={isLoading}
            className="ouroctime-notification-prompt__button ouroctime-notification-prompt__button--secondary"
          >
            Not Now
          </button>
        </div>
      </div>

      <style jsx>{`
        .ouroctime-notification-prompt {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          color: white;
          max-width: 500px;
          margin: 0 auto;
        }

        .ouroctime-notification-prompt__content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
        }

        .ouroctime-notification-prompt__icon {
          font-size: 48px;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        .ouroctime-notification-prompt__text h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
        }

        .ouroctime-notification-prompt__text p {
          margin: 0;
          font-size: 14px;
          opacity: 0.9;
          line-height: 1.5;
        }

        .ouroctime-notification-prompt__error {
          margin-top: 12px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          font-size: 13px;
        }

        .ouroctime-notification-prompt__actions {
          display: flex;
          gap: 12px;
          width: 100%;
          flex-wrap: wrap;
        }

        .ouroctime-notification-prompt__button {
          flex: 1;
          min-width: 120px;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ouroctime-notification-prompt__button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ouroctime-notification-prompt__button--primary {
          background: white;
          color: #667eea;
        }

        .ouroctime-notification-prompt__button--primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .ouroctime-notification-prompt__button--secondary {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.5);
        }

        .ouroctime-notification-prompt__button--secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 480px) {
          .ouroctime-notification-prompt {
            padding: 20px;
          }

          .ouroctime-notification-prompt__actions {
            flex-direction: column;
          }

          .ouroctime-notification-prompt__button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default NotificationPermissionPrompt
