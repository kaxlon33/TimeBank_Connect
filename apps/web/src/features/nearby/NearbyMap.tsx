import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Avatar } from '@/components/Avatar'
import type { NearbyHelper } from '@/types'

interface Props {
  centre: { lat: number; lng: number }
  radiusKm: number
  helpers: NearbyHelper[]
  selectedId: number | string | null
  onSelect: (id: number | string) => void
}

/** A round avatar in a white ring with a small pointer, like a map pin. The chosen helper grows and turns brass. */
function helperIcon(h: NearbyHelper, selected: boolean) {
  const size = selected ? 60 : 48
  const avatar = renderToStaticMarkup(<Avatar name={h.user.name} src={h.user.avatar_url} size={size - 10} />)
  const first = h.user.name.split(' ')[0]
  return L.divIcon({
    className: '',
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 8],
    html: `<span class="relative block" style="width:${size}px;height:${size + 10}px">
      <span class="absolute top-0 left-0 grid place-items-center rounded-full shadow-raised ${
        selected ? 'bg-[#d9b77e]' : 'bg-white'
      }" style="width:${size}px;height:${size}px">${avatar}</span>
      <span class="absolute left-1/2 -translate-x-1/2 rotate-45 ${selected ? 'bg-[#d9b77e]' : 'bg-white'}" style="bottom:3px;width:12px;height:12px"></span>
      ${
        selected
          ? `<span class="absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#3a0f1c] px-2.5 py-1 text-[11px] font-bold text-white shadow-raised" style="top:${size + 12}px">${first}</span>`
          : ''
      }
    </span>`,
  })
}

const youIcon = L.divIcon({
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  html: `<span class="relative block size-7">
    <span class="absolute inset-0 animate-ping rounded-full bg-[#2f6bd9]/40 motion-reduce:animate-none"></span>
    <span class="relative block size-7 rounded-full border-4 border-white bg-[#2f6bd9] shadow-raised"></span>
  </span>`,
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
      dashArray: '7 7',
      fillColor: '#6a1f35',
      fillOpacity: 0.09,
      interactive: false,
    }).addTo(group)
    L.marker([centre.lat, centre.lng], { icon: youIcon, keyboard: false, interactive: false }).addTo(group)

    helpers.forEach((h) => {
      L.marker([h.lat, h.lng], {
        icon: helperIcon(h, h.user.id === selectedId),
        title: h.user.name,
        zIndexOffset: h.user.id === selectedId ? 1000 : 0,
      })
        .on('click', () => onSelectRef.current(h.user.id))
        .addTo(group)
    })

    const selected = helpers.find((h) => h.user.id === selectedId)
    if (selected) m.flyTo([selected.lat, selected.lng], Math.max(m.getZoom(), 15), { duration: 0.5 })
    else m.fitBounds(circle.getBounds(), { padding: [56, 56], animate: false })
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
