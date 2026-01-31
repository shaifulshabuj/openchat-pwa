import nodemailer from 'nodemailer'

const getEmailTransporter = () => {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined
  const secure = process.env.SMTP_SECURE === 'true'
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  })
}

export const sendPasswordResetEmail = async ({
  to,
  resetUrl,
  displayName,
}: {
  to: string
  resetUrl: string
  displayName?: string | null
}) => {
  const transporter = getEmailTransporter()

  if (!transporter) {
    console.warn('SMTP not configured. Skipping password reset email.')
    console.info('Password reset link:', resetUrl)
    return
  }

  const from = process.env.SMTP_FROM || 'OpenChat <no-reply@openchat.local>'
  const subject = process.env.PASSWORD_RESET_EMAIL_SUBJECT || 'Reset your OpenChat password'
  const name = displayName || 'there'

  const text = `Hi ${name},\n\nWe received a request to reset your OpenChat password.\n\nUse the link below to set a new password:\n${resetUrl}\n\nIf you did not request this, you can safely ignore this email.\n\nThanks,\nOpenChat Team\n`
  const html = `
    <p>Hi ${name},</p>
    <p>We received a request to reset your OpenChat password.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
    <p>Thanks,<br/>OpenChat Team</p>
  `

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  })
}
