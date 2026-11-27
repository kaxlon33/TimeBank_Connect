import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Avatar } from '@/components/Avatar'
import { formatDistance } from '@/lib/format'
import { skillKind, type SkillKind } from '@/features/nearby/filters'
import type { NearbyHelper } from '@/types'

export interface NearbyMapHandle {
  zoomIn: () => void
  zoomOut: () => void
  recenter: () => void
}

interface Props {
  centre: { lat: number; lng: number }
  radiusKm: number
  helpers: NearbyHelper[]
  selectedId: number | string | null
  onSelect: (id: number | string) => void
  /** Where the selected helper's pin is inside the map box, so a card can sit above it. */
  onPoint: (point: { x: number; y: number } | null) => void
}

// Tiny badge icons drawn inline, because the pins are plain HTML inside the map.
const badgePaths: Record<SkillKind, string> = {
  quick: '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" fill="currentColor"/>',
  care: '<path d="M12 21s-7-4.4-9.3-9A5.4 5.4 0 0 1 12 6a5.4 5.4 0 0 1 9.3 6c-2.3 4.6-9.3 9-9.3 9Z" fill="currentColor"/>',
  talk: '<path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Z" fill="currentColor"/>',
}

function helperIcon(h: NearbyHelper, selected: boolean) {
  const size = selected ? 68 : 54
  const avatar = renderToStaticMarkup(<Avatar name={h.user.name} src={h.user.avatar_url} size={size - 12} />)
  const badge = badgePaths[skillKind(h.skills[0]?.title ?? '')]
  const ring = selected ? 'ring-4 ring-[#d9b77e]' : ''
  const halo = selected ? '<span class="absolute -inset-3 rounded-full bg-[#6a1f35]/18"></span>' : ''
  return L.divIcon({
    className: '',
    iconSize: [80, size + 34],
    iconAnchor: [40, size / 2],
    html: `<span class="relative flex flex-col items-center" style="width:80px">
      <span class="relative" style="width:${size}px;height:${size}px">
        ${halo}
        <span class="relative grid place-items-center rounded-full bg-white shadow-raised ${ring}" style="width:${size}px;height:${size}px">${avatar}</span>
        <span class="absolute -top-0.5 -right-1 grid size-6 place-items-center rounded-full bg-[#3a0f1c] text-[#d9b77e] ring-2 ring-white">
          <svg viewBox="0 0 24 24" class="size-3">${badge}</svg>
        </span>
      </span>
      <span class="mt-2 whitespace-nowrap rounded-full bg-[#3a0f1c] px-2.5 py-1 text-[11px] font-bold text-white shadow-card">${formatDistance(h.distance_km)}</span>
    </span>`,
  })
}

const youIcon = L.divIcon({
  className: '',
  iconSize: [88, 88],
  iconAnchor: [44, 44],
  html: `<span class="relative grid size-[88px] place-items-center">
    <span class="absolute inset-0 animate-ping rounded-full bg-[#6a1f35]/20 motion-reduce:animate-none"></span>
    <span class="absolute inset-2 rounded-full bg-[#6a1f35]/22"></span>
    <span class="relative block size-4 rounded-full border-[3px] border-white bg-[#3a0f1c] shadow-raised"></span>
  </span>`,
})

/** OpenStreetMap with the member's position, three distance rings and a pin for each helper. */
export const NearbyMap = forwardRef<NearbyMapHandle, Props>(function NearbyMap(
  { centre, radiusKm, helpers, selectedId, onSelect, onPoint },
  ref,
) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const ringBounds = useRef<L.LatLngBounds | null>(null)
  const onSelectRef = useRef(onSelect)
  const onPointRef = useRef(onPoint)
  onSelectRef.current = onSelect
  onPointRef.current = onPoint

  useImperativeHandle(ref, () => ({
    zoomIn: () => map.current?.zoomIn(),
    zoomOut: () => map.current?.zoomOut(),
    recenter: () => {
      if (ringBounds.current) map.current?.fitBounds(ringBounds.current, { padding: [48, 48] })
    },
  }))

  const markers = useRef(new Map<number | string, { marker: L.Marker; helper: NearbyHelper }>())
  const selectedRef = useRef<NearbyHelper | null>(null)
  const lastView = useRef('')

  // Tells the page where the chosen pin is, so its card can sit above it.
  const emit = useRef(() => {})
  emit.current = () => {
    const m = map.current
    const h = selectedRef.current
    if (!m || !h) return onPointRef.current(null)
    const p = m.latLngToContainerPoint([h.lat, h.lng])
    onPointRef.current({ x: p.x, y: p.y })
  }

  useEffect(() => {
    if (!box.current) return
    // A fresh element for each mount, so Leaflet never finds a map left over from an earlier one.
    const el = document.createElement('div')
    el.style.height = '100%'
    el.style.width = '100%'
    box.current.appendChild(el)
    const m = L.map(el, { zoomControl: false, scrollWheelZoom: false, attributionControl: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(m)
    m.setView([centre.lat, centre.lng], 14)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    const follow = () => emit.current()
    m.on('move zoom resize', follow)
    return () => {
      m.off('move zoom resize', follow)
      m.remove()
      el.remove()
      map.current = null
      layer.current = null
    }
    // The map is created once; later changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Rings, your dot and the pins. Rebuilt only when the place, distance or helpers change, never on a click.
  useEffect(() => {
    const m = map.current
    const group = layer.current
    if (!m || !group) return
    group.clearLayers()
    markers.current.clear()

    // Three dashed rings, like the design: a third, two thirds and the full distance.
    const rings = [1 / 3, 2 / 3, 1].map((f) =>
      L.circle([centre.lat, centre.lng], {
        radius: radiusKm * 1000 * f,
        color: '#6a1f35',
        weight: f === 1 ? 2 : 1.5,
        opacity: f === 1 ? 0.7 : 0.4,
        dashArray: '6 8',
        fill: f === 1,
        fillColor: '#6a1f35',
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(group),
    )
    ringBounds.current = rings[2].getBounds()
    L.marker([centre.lat, centre.lng], { icon: youIcon, keyboard: false, interactive: false }).addTo(group)

    helpers.forEach((h) => {
      const marker = L.marker([h.lat, h.lng], { icon: helperIcon(h, false), title: h.user.name })
        .on('click', () => onSelectRef.current(h.user.id))
        .addTo(group)
      markers.current.set(h.user.id, { marker, helper: h })
    })

    // Frame the rings only when the place or distance changed, so filtering does not make the map jump.
    const key = `${centre.lat}|${centre.lng}|${radiusKm}`
    if (lastView.current !== key) {
      lastView.current = key
      m.fitBounds(rings[2].getBounds(), { padding: [48, 48], animate: false })
    }
    // Restyle for the current choice (the rebuild above resets every pin).
    markers.current.forEach(({ marker, helper }) => {
      const on = helper.user.id === selectedRef.current?.user.id
      if (on) {
        marker.setIcon(helperIcon(helper, true))
        marker.setZIndexOffset(1000)
      }
    })
    emit.current()
  }, [centre.lat, centre.lng, radiusKm, helpers])

  // Choosing a helper: restyle two pins and glide the map a little. No rebuild, no zoom animation.
  useEffect(() => {
    const m = map.current
    selectedRef.current = helpers.find((h) => h.user.id === selectedId) ?? null
    markers.current.forEach(({ marker, helper }) => {
      const on = helper.user.id === selectedId
      marker.setIcon(helperIcon(helper, on))
      marker.setZIndexOffset(on ? 1000 : 0)
    })
    const chosen = selectedRef.current
    if (m && chosen) {
      // Put the pin a little below the middle so the card above it stays in view.
      const size = m.getSize()
      const at = m.latLngToContainerPoint([chosen.lat, chosen.lng])
      const want = L.point(size.x / 2, size.y * (size.x < 640 ? 0.42 : 0.64))
      const delta = at.subtract(want)
      if (Math.abs(delta.x) > 6 || Math.abs(delta.y) > 6) m.panBy(delta, { animate: true, duration: 0.45, easeLinearity: 0.35 })
    }
    emit.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Leaflet needs a nudge when its box changes size (phone rotation, layout shifts).
  useEffect(() => {
    const el = box.current
    if (!el || !('ResizeObserver' in window)) return
    const ro = new ResizeObserver(() => map.current?.invalidateSize())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return <div ref={box} role="region" aria-label="Map of helpers near you" className="size-full" />
})
