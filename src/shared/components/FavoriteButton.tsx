import { useEffect, useState } from 'react'
import { StarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { isFavorite, toggleFavorite } from '@/features/favorites/favoritesService'
import { cn } from '@/shared/utils/cn'

export function FavoriteButton({ toolId }: { toolId: string }) {
  const [fav, setFav] = useState(false)
  const { t } = useTranslation()

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
          aria-label={fav ? t('common.removeFromFavorites') : t('common.addToFavorites')}
          aria-pressed={fav}
        >
          <StarIcon className={cn(fav && 'fill-amber-400 text-amber-400')} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{fav ? t('common.unfavorite') : t('common.favorite')}</TooltipContent>
    </Tooltip>
  )
}
