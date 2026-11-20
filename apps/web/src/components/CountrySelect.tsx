import { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import type { Country } from '@/types'

interface Props {
  id: string
  value: string
  onChange: (code: string) => void
  invalid?: boolean
  describedBy?: string
}

export function CountrySelect({ id, value, onChange, invalid, describedBy }: Props) {
  const [countries, setCountries] = useState<Country[]>([])

  useEffect(() => {
    let active = true
    api.getCountries().then((list) => active && setCountries(list), () => active && setCountries([]))
    return () => {
      active = false
    }
  }, [])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid || undefined} aria-describedby={describedBy}>
        <SelectValue placeholder={countries.length ? 'Choose your country' : 'Loading countries…'} />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {countries.map((c) => (
          <SelectItem key={c.code} value={c.code} className="min-h-10">
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
