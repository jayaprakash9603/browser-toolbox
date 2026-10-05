import { ArrowLeftIcon } from 'lucide-react'

import { Link } from '@/app/router'
import { Button } from '@/shared/components/ui/button'

export function BackButton({ to = '/' }: { to?: string }) {
  return (
    <Button asChild size="xs" variant="ghost" className="shrink-0 text-muted-foreground">
      <Link to={to} aria-label="Back">
        <ArrowLeftIcon />
        Back
      </Link>
    </Button>
  )
}