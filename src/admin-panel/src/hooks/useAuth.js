import { useState, useEffect } from 'react'
import { isAuthenticated, loginWithII, loginWithNFID, logout as icpLogout, initAuthClient } from '../utils/icp'

export function useAuth() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      await initAuthClient()
      const auth = await isAuthenticated()
      setAuthenticated(auth)
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  async function loginII() {
    try {
      setLoading(true)
      await loginWithII()
      setAuthenticated(true)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function loginNFID() {
    try {
      setLoading(true)
      await loginWithNFID()
      setAuthenticated(true)
      return true
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try {
      setLoading(true)
      await icpLogout()
      setAuthenticated(false)
    } catch (error) {
      console.error('Logout failed:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    authenticated,
    loading,
    loginII,
    loginNFID,
    logout
  }
}
