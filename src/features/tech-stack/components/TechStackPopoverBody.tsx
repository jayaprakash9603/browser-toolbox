import { TechStackView } from './TechStackView'

export default function TechStackPopoverBody({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <TechStackView scrollable showAccessPrompt onNavigate={onNavigate} />
    </div>
  )
}
