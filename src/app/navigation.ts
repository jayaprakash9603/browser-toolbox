import { useRouter } from './router'

export function useNavigate() {
  return useRouter().navigate
}
