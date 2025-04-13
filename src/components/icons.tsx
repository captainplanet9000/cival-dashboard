import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  CreditCard,
  File,
  FileText,
  HelpCircle,
  Image,
  Laptop,
  Loader2,
  LucideProps,
  Moon,
  MoreVertical,
  Plus,
  Settings,
  SunMedium,
  Trash,
  Twitter,
  User,
  X,
} from "lucide-react"

export type Icon = typeof AlertTriangle

export const Icons = {
  logo: Command,
  close: X,
  spinner: Loader2,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  trash: Trash,
  post: FileText,
  page: File,
  media: Image,
  settings: Settings,
  billing: CreditCard,
  ellipsis: MoreVertical,
  add: Plus,
  warning: AlertTriangle,
  user: User,
  arrowRight: ArrowRight,
  help: HelpCircle,
  sun: SunMedium,
  moon: Moon,
  laptop: Laptop,
  twitter: Twitter,
  check: Check,
  
  // Wallet provider icons
  metamask: ({ ...props }: LucideProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19.32 7.95l-7.23-5.32a1.94 1.94 0 0 0-2.18 0L2.68 7.95a2.01 2.01 0 0 0-.97 1.72v8.65a2 2 0 0 0 .97 1.72l7.23 5.32a1.94 1.94 0 0 0 2.18 0l7.23-5.32a2 2 0 0 0 .97-1.72V9.67a2.01 2.01 0 0 0-.97-1.72z" />
      <path d="m7.96 11.69 4.04 4.04 4.04-4.04M12 15.73v4.04" />
      <path d="M12 4.04v7.92" />
    </svg>
  ),
  
  walletConnect: ({ ...props }: LucideProps) => (
    <svg
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path 
        d="M6.89245 8.02254C9.84388 5.07112 14.5636 5.07112 17.515 8.02254L17.9022 8.4098C18.0736 8.58114 18.0736 8.86418 17.9022 9.03551L16.7306 10.2071C16.6449 10.2928 16.5034 10.2928 16.4178 10.2071L15.8854 9.67467C13.7897 7.57901 10.6177 7.57901 8.52208 9.67467L7.94878 10.248C7.86312 10.3336 7.72163 10.3336 7.63598 10.248L6.46438 9.0764C6.29305 8.90507 6.29305 8.62203 6.46438 8.4507L6.89245 8.02254ZM20.2128 10.7203L21.254 11.7616C21.4254 11.9329 21.4254 12.2159 21.254 12.3873L16.1776 17.4637C16.0063 17.635 15.7232 17.635 15.5519 17.4638C15.5519 17.4638 15.5519 17.4637 15.5519 17.4637L12.0321 13.9439C11.9893 13.9011 11.9186 13.9011 11.8758 13.9439C11.8758 13.9439 11.8758 13.9439 11.8758 13.9439L8.35603 17.4637C8.1847 17.635 7.90166 17.635 7.73033 17.4638C7.73032 17.4638 7.73032 17.4637 7.73032 17.4637L2.65354 12.387C2.48221 12.2157 2.48221 11.9326 2.65354 11.7613L3.69482 10.72C3.86615 10.5487 4.14919 10.5487 4.32052 10.72L7.84045 14.2399C7.88323 14.2827 7.95397 14.2827 7.99675 14.2399C7.99676 14.2399 7.99676 14.2399 7.99676 14.2399L11.5163 10.7203C11.6876 10.549 11.9707 10.5489 12.142 10.7203L15.6621 14.2399C15.7049 14.2827 15.7756 14.2827 15.8184 14.2399L19.3383 10.7203C19.5096 10.549 19.7927 10.549 19.964 10.7203L20.2128 10.7203Z" 
        fill="currentColor"
      />
    </svg>
  ),
  
  coinbase: ({ ...props }: LucideProps) => (
    <svg
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path 
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 18.5C8.42 18.5 5.5 15.58 5.5 12C5.5 8.42 8.42 5.5 12 5.5C15.58 5.5 18.5 8.42 18.5 12C18.5 15.58 15.58 18.5 12 18.5Z" 
        fill="currentColor"
      />
      <path 
        d="M15 12C15 10.34 13.66 9 12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12Z" 
        fill="currentColor"
      />
    </svg>
  ),
} 