import { useEffect, useState } from 'react'
import { StarIcon } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { isFavorite, toggleFavorite } from '@/features/favorites/favoritesService'
import { cn } from '@/shared/utils/cn'

export function FavoriteButton({ toolId }: { toolId: string }) {
  const [fav, setFav] = useState(false)

  useEffect(() => {
    void isFavorite(toolId).then(setFav)
  }, [toolId])

  const toggle = async () => {
    const next = await toggleFavorite(toolId)
    setFav(next)
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={toggle}
          aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={fav}
        >
          <StarIcon className={cn(fav && 'fill-amber-400 text-amber-400')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{fav ? 'Unfavorite' : 'Favorite'}</TooltipContent>
    </Tooltip>
  )
}
