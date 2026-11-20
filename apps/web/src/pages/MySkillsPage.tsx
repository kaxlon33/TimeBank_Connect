import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { MySkillCard } from '@/features/my-skills/MySkillCard'
import { SkillFormDialog } from '@/features/my-skills/SkillFormDialog'
import { api, ApiError } from '@/lib/api'
import { useAsync } from '@/lib/hooks'
import type { ID, Skill, SkillInput } from '@/types'

export function MySkillsPage() {
  const skills = useAsync(() => api.getMySkills(), 'my-skills')
  const categories = useAsync(() => api.getCategories(), 'categories')
  const [editing, setEditing] = useState<Skill | null>(null)
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<ID | null>(null)

  const list = skills.status === 'success' ? skills.data : []
  const visible = list.filter((s) => s.status === 'active').length

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }
  const openEdit = (skill: Skill) => {
    setEditing(skill)
    setOpen(true)
  }

  async function save(input: SkillInput) {
    if (editing) {
      const updated = await api.updateSkill(editing.id, input)
      skills.setData((prev) => prev.map((s) => (s.id === updated.id ? { ...updated } : s)))
      toast.success('Skill updated')
    } else {
      const created = await api.createSkill(input)
      skills.setData((prev) => [created, ...prev])
      toast.success('Your skill is posted')
    }
  }

  async function toggleVisible(skill: Skill) {
    setBusyId(skill.id)
    try {
      const status = skill.status === 'hidden' ? 'active' : 'hidden'
      const updated = await api.updateSkill(skill.id, {
        title: skill.title,
        description: skill.description,
        category_id: skill.category.id,
        status,
      })
      skills.setData((prev) => prev.map((s) => (s.id === updated.id ? { ...updated } : s)))
      toast.success(status === 'hidden' ? 'Skill hidden from browse' : 'Skill is visible again')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not change that. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(skill: Skill) {
    setBusyId(skill.id)
    try {
      await api.deleteSkill(skill.id)
      skills.setData((prev) => prev.filter((s) => s.id !== skill.id))
      toast.success('Skill deleted')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not delete that. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pt-2 pb-32 sm:px-8 lg:pb-16">
      <header className="tile-in flex flex-col gap-5 pt-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            {skills.status === 'success' ? `${visible} of ${list.length} shown on browse` : 'What you offer your neighbours'}
          </p>
          <h1 className="font-heading mt-2 text-[clamp(2rem,4.2vw,3rem)] leading-[0.98] font-bold tracking-[-0.045em]">
            My <span className="text-wine-700">skills</span>
          </h1>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
        >
          <Plus className="size-5" aria-hidden="true" />
          Add a skill
        </button>
      </header>

      <div className="mt-7">
        {skills.status === 'loading' ? (
          <div className="grid gap-4 lg:grid-cols-2" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="skeleton-shimmer h-36 rounded-[24px]" />
            ))}
          </div>
        ) : skills.status === 'error' ? (
          <div role="alert" className="rounded-[28px] border bg-card p-10 text-center">
            <p className="font-heading text-2xl font-bold tracking-[-0.03em]">We couldn’t load your skills</p>
            <p className="mx-auto mt-2 max-w-sm text-muted-foreground">{skills.error.message}</p>
            <button
              type="button"
              onClick={skills.reload}
              className="press mt-6 h-12 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
            >
              Try again
            </button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-[28px] border bg-card p-10 text-center shadow-card sm:p-16">
            <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-wine-700">
              <Sparkles className="size-7" aria-hidden="true" />
            </span>
            <p className="font-heading mt-5 text-3xl font-bold tracking-[-0.03em]">Share something you’re good at</p>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Fixing a bike, helping with homework, cooking a recipe. Every hour you give earns you a credit.
            </p>
            <button
              type="button"
              onClick={openNew}
              className="press mt-6 h-12 rounded-2xl bg-wine-700 px-6 text-sm font-bold text-wine-on hover:bg-wine-600"
            >
              Add your first skill
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {list.map((skill, i) => (
              <MySkillCard
                key={skill.id}
                skill={skill}
                index={i}
                busy={busyId === skill.id}
                onEdit={() => openEdit(skill)}
                onToggleVisible={() => void toggleVisible(skill)}
                onDelete={() => void remove(skill)}
              />
            ))}
            <li>
              <button
                type="button"
                onClick={openNew}
                className="press group grid h-full min-h-[96px] w-full place-items-center rounded-[24px] border-2 border-dashed border-stone-200 p-5 text-muted-foreground transition-colors hover:border-wine-700/40 hover:bg-primary-soft/50 hover:text-wine-700"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl bg-muted transition-colors group-hover:bg-card">
                    <Plus className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-[15px] font-bold">Add another skill</span>
                </span>
              </button>
            </li>
          </ul>
        )}
      </div>

      <SkillFormDialog
        open={open}
        onOpenChange={setOpen}
        skill={editing}
        categories={categories.status === 'success' ? categories.data : []}
        onSubmit={save}
      />
    </div>
  )
}
