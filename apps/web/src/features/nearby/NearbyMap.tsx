import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { initials } from '@/lib/format'
import type { NearbyHelper } from '@/types'

interface Props {
  centre: { lat: number; lng: number }
  radiusKm: number
  helpers: NearbyHelper[]
  selectedId: number | string | null
  onSelect: (id: number | string) => void
}

function helperIcon(name: string, selected: boolean) {
  const size = selected ? 52 : 44
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span class="grid place-items-center rounded-full border-[3px] font-bold shadow-raised transition-all ${
      selected ? 'border-white bg-brass text-wine-900' : 'border-white bg-wine-700 text-white'
    }" style="width:${size}px;height:${size}px;font-size:${selected ? 16 : 14}px">${initials(name)}</span>`,
  })
}

const youIcon = L.divIcon({
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  html: '<span class="block size-6 rounded-full border-4 border-white bg-[#2f6bd9] shadow-raised"></span>',
})

/** OpenStreetMap with the member's position, the search radius and one pin per helper. */
export function NearbyMap({ centre, radiusKm, helpers, selectedId, onSelect }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m)
    L.control.zoom({ position: 'bottomright' }).addTo(m)
    m.setView([centre.lat, centre.lng], 14)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
      layer.current = null
    }
    // The map is created once; later changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()

    const circle = L.circle([centre.lat, centre.lng], {
      radius: radiusKm * 1000,
      color: '#6a1f35',
      weight: 2,
      dashArray: '6 6',
      fillColor: '#6a1f35',
      fillOpacity: 0.07,
    }).addTo(group)
    L.marker([centre.lat, centre.lng], { icon: youIcon, keyboard: false, interactive: false }).addTo(group)

    helpers.forEach((h) => {
      L.marker([h.lat, h.lng], {
        icon: helperIcon(h.user.name, h.user.id === selectedId),
        title: h.user.name,
        zIndexOffset: h.user.id === selectedId ? 1000 : 0,
      })
        .on('click', () => onSelectRef.current(h.user.id))
        .addTo(group)
    })

    const selected = helpers.find((h) => h.user.id === selectedId)
    if (selected) m.flyTo([selected.lat, selected.lng], Math.max(m.getZoom(), 15), { duration: 0.5 })
    else m.fitBounds(circle.getBounds(), { padding: [24, 24], animate: false })
  }, [centre.lat, centre.lng, radiusKm, helpers, selectedId])

  // Leaflet needs a nudge when its box changes size (phone rotation, layout shifts).
  useEffect(() => {
    const el = box.current
    if (!el || !('ResizeObserver' in window)) return
    const ro = new ResizeObserver(() => map.current?.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return <div ref={box} role="region" aria-label="Map of helpers near you" className="size-full" />
}
