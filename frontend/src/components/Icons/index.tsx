import React from 'react'

interface IconProps {
  className?: string
  size?: number
  color?: string
}

export const BriefcaseIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const FolderIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22 19C22 19.5304 21.7893 20.0391 21.4142 20.4142C21.0391 20.7893 20.5304 21 20 21H4C3.46957 21 2.96086 20.7893 2.58579 20.4142C2.21071 20.0391 2 19.5304 2 19V5C2 4.46957 2.21071 3.96086 2.58579 3.58579C2.96086 3.21071 3.46957 3 4 3H9L11 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const LockIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const DocumentIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const BookmarkIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M19 21L12 16L5 21V5C5 4.46957 5.21071 3.96086 5.58579 3.58579C5.96086 3.21071 6.46957 3 7 3H17C17.5304 3 18.0391 3.21071 18.4142 3.58579C18.7893 3.96086 19 4.46957 19 5V21Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const CheckIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20 6L9 17L4 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const XIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const CalendarIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 2V6M8 2V6M3 10H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const HandshakeIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M11 12H9C8.46957 12 7.96086 12.2107 7.58579 12.5858C7.21071 12.9609 7 13.4696 7 14V16C7 16.5304 7.21071 17.0391 7.58579 17.4142C7.96086 17.7893 8.46957 18 9 18H11M11 12L13 10M11 12V18M13 10H15C15.5304 10 16.0391 10.2107 16.4142 10.5858C16.7893 10.9609 17 11.4696 17 12V14C17 14.5304 16.7893 15.0391 16.4142 15.4142C16.0391 15.7893 15.5304 16 15 16H13M13 10V16" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const MailIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 6L12 13L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const SparklesIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19 19L19.5 21L21 21.5L19.5 22L19 24L18.5 22L17 21.5L18.5 21L19 19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const UploadIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 8L12 3L7 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 3V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const PaletteIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 12C8 13.1046 8.89543 14 10 14C11.1046 14 12 13.1046 12 12C12 10.8954 11.1046 10 10 10C8.89543 10 8 10.8954 8 12Z" fill={color}/>
    <path d="M12 8C12 9.10457 12.8954 10 14 10C15.1046 10 16 9.10457 16 8C16 6.89543 15.1046 6 14 6C12.8954 6 12 6.89543 12 8Z" fill={color}/>
    <path d="M16 12C16 13.1046 16.8954 14 18 14C19.1046 14 20 13.1046 20 12C20 10.8954 19.1046 10 18 10C16.8954 10 16 10.8954 16 12Z" fill={color}/>
  </svg>
)

export const RefreshIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M1 4V10H7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 20V14H17" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.49 9C19.81 6.37 17.79 4.24 15.12 3.51M3.51 15C4.19 17.63 6.21 19.76 8.88 20.49M8.88 20.49L1 10L7 4M15.12 3.51L23 14L17 20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const EyeIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const DownloadIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 10L12 15L17 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const ZapIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const StarIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const FireIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12C11 10 10 9 10 9C10 9 9 10 9 12C9 10 8 9 8 9C8 9 7 10 7 12C7 10 6 9 6 9C6 9 5 10 5 12C5 14.5 6.5 16.5 8.5 14.5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2C12 2 10 4 10 6C10 8 12 10 12 10C12 10 14 8 14 6C14 4 12 2 12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const GemIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3L12 9L18 3M6 3H18M6 3L3 7L12 21L21 7L18 3M18 3L21 7M21 7H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const RocketIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M4.5 16.5C4.5 16.5 6 18 8 18C8 18 9.5 19.5 12 19.5C14.5 19.5 16 18 16 18C18 18 19.5 16.5 19.5 16.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2L15 7L12 9L9 7L12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 9L15 14L12 16L9 14L12 9Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const TargetIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="12" r="2" fill={color} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const TrophyIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9H4C3.46957 9 2.96086 9.21071 2.58579 9.58579C2.21071 9.96086 2 10.4696 2 11V13C2 13.5304 2.21071 14.0391 2.58579 14.4142C2.96086 14.7893 3.46957 15 4 15H6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V13C22 13.5304 21.7893 14.0391 21.4142 14.4142C21.0391 14.7893 20.5304 15 20 15H18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 15V19C6 19.5304 6.21071 20.0391 6.58579 20.4142C6.96086 20.7893 7.46957 21 8 21H16C16.5304 21 17.0391 20.7893 17.4142 20.4142C17.7893 20.0391 18 19.5304 18 19V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 15V9M12 9L9 6H15L12 9Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const BrainIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8 2 6 4 6 8C6 6 4 6 4 8C4 10 6 12 6 12C4 12 2 14 2 16C2 18 4 20 6 20C6 20 6 22 8 22C10 22 10 20 10 20C12 20 14 22 16 22C18 22 18 20 18 20C20 20 22 18 22 16C22 14 20 12 18 12C18 12 20 10 20 8C20 6 18 6 18 8C18 4 16 2 12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const FileTextIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const ChartIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M3 3V21H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 16L12 11L16 15L21 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 10H16V15" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const UsersIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="7" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const SearchIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 21L16.65 16.65" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const AlertIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const EditIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const ClockIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6V12L16 14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const DiamondIcon = ({ className = '', size = 24, color = 'currentColor' }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 3L12 9L18 3M6 3H18M6 3L3 7L12 21L21 7L18 3M18 3L21 7M21 7H3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

