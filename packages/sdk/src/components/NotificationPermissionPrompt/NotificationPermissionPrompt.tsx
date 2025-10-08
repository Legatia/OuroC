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

      {/* Note: Styled-jsx removed - use external CSS or styled-components in your app */}
    </div>
  )
}

export default NotificationPermissionPrompt
