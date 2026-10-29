import { TechStackView } from './TechStackView'

export default function TechStackPopoverBody({ onNavigate }: { onNavigate: () => void }) {
  return <TechStackView scrollable showAccessPrompt onNavigate={onNavigate} />
}
