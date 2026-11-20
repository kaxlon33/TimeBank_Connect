import type { Skill, SkillCategory, SkillStatus } from '@/types'
import { summary, users } from './users'
import { daysAgo } from './time'

const categoryNames = [
  'Home and Garden',
  'Repairs and DIY',
  'Tech Help',
  'Tutoring and Languages',
  'Cooking and Baking',
  'Care and Companionship',
  'Transport and Errands',
  'Arts, Crafts and Music',
  'Health and Fitness',
]

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

export const categories: SkillCategory[] = categoryNames.map((name, i) => ({
  id: i + 1,
  name,
  slug: slugify(name),
  is_active: true,
  skills_count: 0,
}))

const cat = (slug: string) => {
  const c = categories.find((x) => x.slug === slug)
  if (!c) throw new Error(`Unknown category ${slug}`)
  return { id: c.id, name: c.name, slug: c.slug }
}

type Row = [owner: number, category: string, title: string, description: string, status?: SkillStatus]

// Same order and content as DemoDataSeeder::seedSkills, so ids line up with the database.
const rows: Row[] = [
  [3, 'repairs-and-diy', 'Bicycle repair and tune-ups', 'Gears, brakes, punctures. I can also show you how to do basic maintenance yourself.'],
  [3, 'repairs-and-diy', 'Flat-pack furniture assembly', 'I bring my own tools. Wardrobes, desks, bed frames.'],
  [5, 'tutoring-and-languages', 'Python and spreadsheet tutoring', 'Beginner-friendly lessons in Python, Excel formulas and Google Sheets.'],
  [5, 'tech-help', 'Laptop clean-up and setup', 'Remove junk software, set up backups and updates.', 'hidden'],
  [8, 'home-and-garden', 'Garden weeding and planting', 'Help with weeding, planting bulbs and planning a small vegetable patch.'],
  [8, 'tutoring-and-languages', 'Conversational French practice', 'Relaxed conversation practice for all levels.'],
  [9, 'transport-and-errands', 'Help moving boxes (I have a van)', 'Small moves and tip runs within the borough.'],
  [9, 'transport-and-errands', 'Grocery runs for neighbours', 'Weekly shopping for anyone who cannot get out easily.'],
  [4, 'tutoring-and-languages', 'Secondary school maths tutoring', 'O-level and IGCSE maths, exam practice and homework help.'],
  [4, 'health-and-fitness', 'Beginner yoga sessions', 'Gentle yoga in the park or at your home. Mats provided.'],
  [6, 'tech-help', 'Smartphone setup and video calls', 'Help setting up phones, WhatsApp and video calls, especially for seniors.'],
  [6, 'cooking-and-baking', 'Kueh and cake baking lessons', 'Learn to make kueh lapis, pandan chiffon and simple cakes.'],
  [2, 'cooking-and-baking', 'Burmese home cooking', 'Mohinga, tea leaf salad and curries, cooked together in your kitchen or mine.'],
  [2, 'tutoring-and-languages', 'English conversation practice', 'Friendly conversation practice for beginners and intermediate learners.'],
  [7, 'arts-crafts-and-music', 'Beginner guitar lessons', 'Chords, strumming and your first songs. I can lend a guitar.'],
  [7, 'care-and-companionship', 'Companionship visits', 'A chat, a walk or a game of chess with older neighbours.'],
  [10, 'tech-help', 'Cheap followers fast!!!', 'Message me for social media followers.', 'removed'],
]

export const skills: Skill[] = rows.map(([owner, slug, title, description, status], i) => {
  const ownerCreated = users.find((u) => u.id === owner)?.created_at ?? daysAgo(30)
  const created = new Date(new Date(ownerCreated).getTime() + (24 + i) * 3600_000).toISOString()
  return {
    id: i + 1,
    title,
    description,
    category: cat(slug),
    status: status ?? 'active',
    user: summary(owner),
    created_at: created,
    report_count: status === 'removed' ? 4 : 0,
  }
})

for (const c of categories) {
  c.skills_count = skills.filter((s) => s.category.id === c.id && s.status !== 'removed').length
}
