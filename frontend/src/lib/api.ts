import axios from 'axios'

const BASE = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_BASE ?? '/api'
export const api = axios.create({ baseURL: BASE })

export interface CompareResponse {
  id: string
  status: string
  summary: { additions: number; deletions: number; modifications: number; moves: number; total: number }
  url: string
}

export interface Span {
  type: 'equal' | 'insert' | 'delete' | 'replace' | 'move_from' | 'move_to'
  text: string
  offset: number
  length: number
  context?: string
  move_id?: number
}

export interface NoteEntry { note: string; tag: string }
export type Notes = Record<string, NoteEntry>

export interface ResultResponse {
  id: string
  status: string
  file_a_name: string
  file_b_name: string
  original_spans: Span[]
  revised_spans: Span[]
  summary: CompareResponse['summary']
  url: string
  notes?: Notes
}

export async function compareDocuments(fileA: File, fileB: File): Promise<CompareResponse> {
  const form = new FormData()
  form.append('file_a', fileA)
  form.append('file_b', fileB)
  const { data } = await api.post<CompareResponse>('/compare', form)
  return data
}

export async function getResult(id: string): Promise<ResultResponse> {
  const { data } = await api.get<ResultResponse>(`/result/${id}`)
  return data
}

export async function saveNotes(id: string, notes: Notes): Promise<void> {
  await api.put(`/result/${id}/notes`, { notes })
}
