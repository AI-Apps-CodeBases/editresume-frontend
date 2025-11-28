declare module 'react-simple-maps' {
  import { GeoPath, GeoProjection } from 'd3-geo'
  import { D3ZoomEvent } from 'd3-zoom'
  import { Feature } from 'geojson'
  import * as React from 'react'

  export type Point = [number, number]

  export interface ProjectionConfig {
    scale?: number
    center?: [number, number]
    parallels?: [number, number]
    rotate?: [number, number, number]
  }

  export type ProjectionFunction = (width: number, height: number, config: ProjectionConfig) => GeoProjection

  export interface ComposableMapProps extends React.SVGAttributes<SVGSVGElement> {
    children?: React.ReactNode
    width?: number
    height?: number
    projection?: string | ProjectionFunction
    projectionConfig?: ProjectionConfig
  }

  export interface Position {
    x: number
    y: number
    last: Point
    zoom: number
    dragging: boolean
    zooming: boolean
  }

  export interface ZoomableGroupProps extends React.SVGAttributes<SVGGElement> {
    children?: React.ReactNode
    center?: Point
    zoom?: number
    minZoom?: number
    maxZoom?: number
    zoomSensitivity?: number
    disablePanning?: boolean
    disableZooming?: boolean
    onMoveStart?: (position: { coordinates: [number, number]; zoom: number }, event: D3ZoomEvent<SVGElement, any>) => void
    onMove?: (position: { x: number; y: number; zoom: number; dragging: WheelEvent }, event: D3ZoomEvent<SVGElement, any>) => void
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }, event: D3ZoomEvent<SVGElement, any>) => void
    filterZoomEvent?: (element: SVGElement) => boolean
    translateExtent?: [[number, number], [number, number]]
  }

  interface GeographiesChildrenArgument {
    geographies: any[]
    path: GeoPath
    projection: GeoProjection
  }

  export interface GeographiesProps extends Omit<React.SVGAttributes<SVGGElement>, 'children'> {
    parseGeographies?: (features: Array<Feature<any, any>>) => Array<Feature<any, any>>
    geography?: string | Record<string, any> | string[]
    children?: (data: GeographiesChildrenArgument) => void
  }

  export interface GeographyProps extends Pick<React.SVGProps<SVGPathElement>, Exclude<keyof React.SVGProps<SVGPathElement>, 'style'>> {
    geography?: any
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseDown?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseUp?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onFocus?: (event: React.FocusEvent<SVGPathElement>) => void
    onBlur?: (event: React.FocusEvent<SVGPathElement>) => void
  }

  export interface MarkerProps extends Pick<React.SVGProps<SVGPathElement>, Exclude<keyof React.SVGProps<SVGPathElement>, 'style'>> {
    children?: React.ReactNode
    coordinates?: Point
    style?: {
      default?: React.CSSProperties
      hover?: React.CSSProperties
      pressed?: React.CSSProperties
    }
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseDown?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onMouseUp?: (event: React.MouseEvent<SVGPathElement, MouseEvent>) => void
    onFocus?: (event: React.FocusEvent<SVGPathElement>) => void
    onBlur?: (event: React.FocusEvent<SVGPathElement>) => void
  }

  export const ComposableMap: React.FunctionComponent<ComposableMapProps>
  export const ZoomableGroup: React.FunctionComponent<ZoomableGroupProps>
  export const Geographies: React.FunctionComponent<GeographiesProps>
  export const Geography: React.FunctionComponent<GeographyProps>
  export const Marker: React.FunctionComponent<MarkerProps>
}

