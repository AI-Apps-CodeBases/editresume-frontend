'use client'

import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps'
import { CountryData } from '@/types/dashboard'

interface TopCountriesMapProps {
    data: CountryData[]
}

// Ülke isimlerini ISO kodlarına çeviren mapping
const countryNameToISO: Record<string, string> = {
    'United States': 'USA',
    'USA': 'USA',
    'United Kingdom': 'GBR',
    'UK': 'GBR',
    'China': 'CHN',
    'Australia': 'AUS',
    'Canada': 'CAN',
    'Germany': 'DEU',
    'France': 'FRA',
    'India': 'IND',
    'Japan': 'JPN',
    'Brazil': 'BRA',
    'Russia': 'RUS',
    'Saudi Arabia': 'SAU',
    'Philippines': 'PHL',
    'Indonesia': 'IDN',
    'Spain': 'ESP',
    'Italy': 'ITA',
    'Mexico': 'MEX',
    'South Korea': 'KOR',
}

// Marker konumları (koordinatlar)
const markerLocations: Record<string, [number, number]> = {
    'USA': [-122.4, 37.8], // San Francisco
    'GBR': [-0.1, 51.5], // London
    'SAU': [46.7, 24.6], // Riyadh
    'PHL': [120.9, 14.6], // Manila
    'IDN': [106.8, -6.2], // Jakarta
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

export function TopCountriesMap({ data }: TopCountriesMapProps) {
    // Boş durum kontrolü
    if (!data || data.length === 0) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Top Countries</h3>
                    <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                        <option>Today</option>
                        <option>Weekly</option>
                        <option>Monthly</option>
                    </select>
                </div>
                <div className="flex items-center justify-center h-64 text-gray-500">
                    <div className="text-center">
                        <p className="text-sm">No visitor data available yet</p>
                        <p className="text-xs mt-2">Visitor tracking will start automatically</p>
                    </div>
                </div>
            </div>
        )
    }

    // Verilerden ülke ISO kodlarını çıkar
    const highlightedCountries = data.map(country => {
        const iso = countryNameToISO[country.country] || country.country.substring(0, 3).toUpperCase()
        return iso
    })

    // Marker'lar için veri hazırla
    const markers = data
        .filter(country => {
            const iso = countryNameToISO[country.country] || country.country.substring(0, 3).toUpperCase()
            return markerLocations[iso]
        })
        .map(country => {
            const iso = countryNameToISO[country.country] || country.country.substring(0, 3).toUpperCase()
            const coords = markerLocations[iso]
            return {
                name: country.country,
                coordinates: coords,
                percentage: country.percentage
            }
        })

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Top Countries</h3>
                <select className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2">
                    <option>Today</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                </select>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* World Map */}
                <div className="flex-1 bg-gray-50 rounded-lg min-h-[200px] flex items-center justify-center relative overflow-hidden">
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                        <button className="w-6 h-6 bg-white rounded shadow flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-bold">+</button>
                        <button className="w-6 h-6 bg-white rounded shadow flex items-center justify-center text-gray-600 hover:bg-gray-50 text-sm font-bold">−</button>
                    </div>

                    {/* World Map using react-simple-maps */}
                    <div className="w-full h-full" style={{ maxHeight: '250px' }}>
                        <ComposableMap
                            projectionConfig={{
                                scale: 147,
                                center: [0, 20]
                            }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <ZoomableGroup>
                                <Geographies geography={geoUrl}>
                                    {({ geographies }: { geographies: any[] }) =>
                                        geographies.map((geo: any) => {
                                            const iso = geo.properties.ISO_A3 || geo.properties.ISO_A2
                                            const isHighlighted = highlightedCountries.includes(iso)
                                            
                                            return (
                                                <Geography
                                                    key={geo.rsmKey}
                                                    geography={geo}
                                                    fill={isHighlighted ? '#3B82F6' : '#E5E7EB'}
                                                    stroke={isHighlighted ? '#2563EB' : '#D1D5DB'}
                                                    strokeWidth={isHighlighted ? 1.5 : 1}
                                                    style={{
                                                        default: {
                                                            outline: 'none',
                                                        },
                                                        hover: {
                                                            fill: isHighlighted ? '#2563EB' : '#D1D5DB',
                                                            outline: 'none',
                                                        },
                                                        pressed: {
                                                            outline: 'none',
                                                        },
                                                    }}
                                                />
                                            )
                                        })
                                    }
                                </Geographies>
                                
                                {/* Location markers */}
                                {markers.map((marker, index) => (
                                    <Marker key={index} coordinates={marker.coordinates}>
                                        <circle r={6} fill="white" stroke="#000000" strokeWidth={2} />
                                    </Marker>
                                ))}
                            </ZoomableGroup>
                        </ComposableMap>
                    </div>
                </div>

                {/* Countries List */}
                <div className="flex-1 space-y-5">
                    {data.map((country) => (
                        <div key={country.country} className="flex items-center justify-between">
                            <div className="flex items-center w-32">
                                <span className="text-2xl mr-3">{country.flag}</span>
                                <div>
                                    <div className="font-medium text-gray-900 text-sm">{country.country}</div>
                                    <div className="text-gray-500 text-xs">{country.users.toLocaleString()} Users</div>
                                </div>
                            </div>
                            <div className="flex-1 mx-4">
                                <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div
                                        className="h-1.5 rounded-full"
                                        style={{ width: `${country.percentage}%`, backgroundColor: getProgressColor(country.percentage) }}
                                    ></div>
                                </div>
                            </div>
                            <div className="text-sm font-medium text-gray-600 w-10 text-right">{country.percentage}%</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function getProgressColor(percentage: number) {
    if (percentage >= 80) return '#3B82F6' // blue
    if (percentage >= 60) return '#F97316' // orange
    if (percentage >= 40) return '#F59E0B' // amber
    if (percentage >= 30) return '#10B981' // green
    return '#3B82F6'
}
