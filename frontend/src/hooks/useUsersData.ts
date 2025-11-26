'use client'

import { useState, useEffect } from 'react'
import { User, UsersTableData } from '@/types/users'

// Mock data
const mockUsers: User[] = [
    {
        id: '01',
        joinDate: '25 Jan 2024',
        name: 'Kathryn Murphy',
        email: 'osgoodwy@gmail.com',
        department: 'HR',
        designation: 'Manager',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kathryn'
    },
    {
        id: '02',
        joinDate: '25 Jan 2024',
        name: 'Annette Black',
        email: 'redaniel@gmail.com',
        department: 'Design',
        designation: 'UI UX Designer',
        status: 'Inactive',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annette'
    },
    {
        id: '03',
        joinDate: '10 Feb 2024',
        name: 'Ronald Richards',
        email: 'seannand@mail.ru',
        department: 'Design',
        designation: 'UI UX Designer',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ronald'
    },
    {
        id: '04',
        joinDate: '10 Feb 2024',
        name: 'Eleanor Pena',
        email: 'miyokoto@mail.ru',
        department: 'Design',
        designation: 'UI UX Designer',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Eleanor'
    },
    {
        id: '05',
        joinDate: '15 March 2024',
        name: 'Leslie Alexander',
        email: 'icadahl@gmail.com',
        department: 'Design',
        designation: 'UI UX Designer',
        status: 'Inactive',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Leslie'
    },
    {
        id: '06',
        joinDate: '15 March 2024',
        name: 'Albert Flores',
        email: 'warn@mail.ru',
        department: 'Design',
        designation: 'UI UX Designer',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Albert'
    },
    {
        id: '07',
        joinDate: '27 April 2024',
        name: 'Jacob Jones',
        email: 'zitka@mail.ru',
        department: 'Development',
        designation: 'Frontend developer',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jacob'
    },
    {
        id: '08',
        joinDate: '25 Jan 2024',
        name: 'Jerome Bell',
        email: 'igerrin@gmail.com',
        department: 'Development',
        designation: 'Frontend developer',
        status: 'Inactive',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jerome'
    },
    {
        id: '09',
        joinDate: '30 April 2024',
        name: 'Marvin McKinney',
        email: 'maks@yandex.ru',
        department: 'Development',
        designation: 'Frontend developer',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marvin'
    },
    {
        id: '10',
        joinDate: '30 April 2024',
        name: 'Cameron Williamson',
        email: 'danton@mail.ru',
        department: 'Development',
        designation: 'Frontend developer',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Cameron'
    },
    {
        id: '11',
        joinDate: '05 May 2024',
        name: 'Devon Lane',
        email: 'devon@gmail.com',
        department: 'Marketing',
        designation: 'Marketing Manager',
        status: 'Active',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Devon'
    },
    {
        id: '12',
        joinDate: '10 May 2024',
        name: 'Robert Fox',
        email: 'robert@mail.ru',
        department: 'Sales',
        designation: 'Sales Executive',
        status: 'Inactive',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Robert'
    }
]

export function useUsersData() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<UsersTableData>({
        users: [],
        totalUsers: 0,
        currentPage: 1,
        totalPages: 1
    })

    useEffect(() => {
        // Simulate API call
        setTimeout(() => {
            setData({
                users: mockUsers,
                totalUsers: mockUsers.length,
                currentPage: 1,
                totalPages: Math.ceil(mockUsers.length / 10)
            })
            setLoading(false)
        }, 500)
    }, [])

    return { ...data, loading }
}
