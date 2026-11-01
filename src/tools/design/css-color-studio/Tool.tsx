import { useEffect } from 'react'

import { useNavigate } from '@/app/navigation'

export default function CssColorStudioTool() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/tools/design/css-generator')
  }, [navigate])

  return null
}
