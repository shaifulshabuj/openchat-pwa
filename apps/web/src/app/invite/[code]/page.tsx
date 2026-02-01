import { InvitationPageClient } from './InvitationPageClient'

// For static export, we need to provide at least one param
// Since invite codes are truly dynamic, we'll generate a placeholder
// The actual functionality will work at runtime for any code
export async function generateStaticParams() {
  return [
    { code: 'placeholder' }
  ]
}

interface Props {
  params: { code: string }
}

export default function InvitationPage({ params }: Props) {
  return <InvitationPageClient code={params.code} />
}
