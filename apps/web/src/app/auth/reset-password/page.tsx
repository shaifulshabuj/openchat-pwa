'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { MessageSquare, Eye, EyeOff } from 'lucide-react'
import { authAPI } from '@/lib/api'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const router = useRouter()
  const { toast } = useToast()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const validateForm = () => {
    if (!token) {
      return 'Reset token is missing or invalid.'
    }

    if (!password || !confirmPassword) {
      return 'Please fill in all fields'
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match'
    }

    if (password.length < 8) {
      return 'Password must be at least 8 characters long'
    }

    if (!passwordRegex.test(password)) {
      return 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const validationError = validateForm()
    if (validationError) {
      setFormError(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await authAPI.confirmPasswordReset({
        token,
        password
      })

      if (response.success) {
        setIsSuccess(true)
        toast({
          title: 'Password updated',
          description: response.message || 'You can now sign in with your new password.',
          variant: 'success',
        })
        setTimeout(() => {
          router.push('/auth/login')
        }, 1200)
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || 'Unable to reset password'
      setFormError(errorMessage)
      toast({
        title: 'Reset failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl px-8 py-10">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-green-600 dark:text-green-300" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Set a new password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Create a strong password to secure your account.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                Your password has been updated. Redirecting to login...
              </p>
            </div>
            <Link
              href="/auth/login"
              className="block text-center text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
                <p className="text-sm text-red-600 dark:text-red-300">{formError}</p>
              </div>
            )}

            {!token && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  The reset link is missing or invalid. Please request a new one.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="password">New password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={isSubmitting || !token}
            >
              {isSubmitting ? 'Updating password...' : 'Reset password'}
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Need a new link?{' '}
                <Link
                  href={"/auth/forgot-password" as any}
                  className="font-medium text-green-600 hover:text-green-500 dark:text-green-400"
                >
                  Request reset
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-green-600" />
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
