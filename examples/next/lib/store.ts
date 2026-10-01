import { cache } from 'react'
import { dakio } from './dakio'

// One store + categories read per request, shared by layout and pages.
export const getStore = cache(() => dakio.store.get())
export const getCategories = cache(() => dakio.categories.list())
