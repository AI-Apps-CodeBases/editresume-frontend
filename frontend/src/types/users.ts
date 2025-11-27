export interface User {
    id: string
    joinDate: string
    name: string
    email: string
    department: string
    designation: string
    status: 'Active' | 'Inactive'
    avatar?: string
}

export interface UsersTableData {
    users: User[]
    totalUsers: number
    currentPage: number
    totalPages: number
}
