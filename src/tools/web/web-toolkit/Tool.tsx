import { useEffect } from 'react'

import { useNavigate } from '@/app/navigation'

export default function WebToolkitTool() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/tools/web/url-toolkit')
  }, [navigate])

  return null
}
