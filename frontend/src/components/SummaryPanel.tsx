import React, { useState } from 'react'
import { MessageSquare, Tag, ChevronDown, ChevronUp, Check } from 'lucide-react'
import type { NoteEntry, Notes } from '../lib/api'

type Filter = 'all' | 'insert' | 'delete' | 'replace' | 'move_from' | 'move_to'

const TAG_OPTIONS = [
  { value: '',          label: 'No tag',   color: 'bg-gray-100 text-gray-500' },
  { value: 'important', label: 'Important',color: 'bg-red-100 text-red-700' },
  { value: 'approved',  label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'rejected',  label: 'Rejected', color: 'bg-orange-100 text-orange-700' },
  { value: 'question',  label: 'Question', color: 'bg-blue-100 text-blue-700' },
]

const TAG_COLOR: Record<string, string> = {
  important: 'bg-red-100 text-red-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-orange-100 text-orange-700',
  question:  'bg-blue-100 text-blue-700',
}

export interface Change {
  index: number
  spanIdx: number
  type: 'insert' | 'delete' | 'replace' | 'move_from' | 'move_to'
  preview: string
}

interface Props {
  summary: { additions: number; deletions: number; modifications: number; moves: number; total: number }
  changes: Change[]
  currentChangeIndex: number
  notes: Notes
  onNavigate: (i: number) => void
  onNoteChange: (spanIdx: number, entry: NoteEntry) => void
}

export default function SummaryPanel({
  summary, changes, currentChangeIndex, notes, onNavigate, onNoteChange
}: Props) {
  const [filter, setFilter]       = useState<Filter>('all')
  const [expanded, setExpanded]   = useState<number | null>(null)

  const filtered = changes.filter(c => filter === 'all' || c.type === filter)

  const pill = (label: string, count: number, colorOn: string, colorOff: string, f: Filter) => (
    <button
      onClick={() => setFilter(filter === f ? 'all' : f)}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition
        ${filter === f ? colorOn + ' ring-2 ring-offset-1 ring-current' : colorOff}`}
    >
      {label} <span className="font-bold">{count}</span>
    </button>
  )

  const typeLabel = (t: string) => {
    if (t === 'insert')    return { short: 'ADD', color: 'bg-green-100 text-green-700' }
    if (t === 'delete')    return { short: 'DEL', color: 'bg-red-100 text-red-700' }
    if (t === 'replace')   return { short: 'MOD', color: 'bg-amber-100 text-amber-700' }
    if (t === 'move_from') return { short: 'MV↑', color: 'bg-purple-100 text-purple-700' }
    if (t === 'move_to')   return { short: 'MV↓', color: 'bg-blue-100 text-blue-700' }
    return { short: '?', color: 'bg-gray-100 text-gray-600' }
  }

  return (
    <div className="flex flex-col h-full text-sm">

      {/* Stats */}
      <div className="p-3 border-b bg-white">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Changes</h2>
        <div className="flex flex-wrap gap-1.5">
          {pill('+ Add', summary.additions,    'bg-green-100 text-green-700',  'bg-gray-100 text-gray-500', 'insert')}
          {pill('− Del', summary.deletions,    'bg-red-100 text-red-700',      'bg-gray-100 text-gray-500', 'delete')}
          {pill('~ Mod', summary.modifications,'bg-amber-100 text-amber-700',  'bg-gray-100 text-gray-500', 'replace')}
          {(summary.moves ?? 0) > 0 && pill('⇅ Mv', summary.moves, 'bg-purple-100 text-purple-700', 'bg-gray-100 text-gray-500', 'move_from')}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          <span className="font-semibold text-gray-600">{summary.total}</span> total ·{' '}
          <span className="font-semibold text-gray-600">
            {Object.keys(notes).length}
          </span> annotated
        </p>
      </div>

      {/* Change list */}
      <div className="flex-1 overflow-auto divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-xs">No changes to show</div>
        ) : filtered.map((change) => {
          const globalIdx = changes.indexOf(change)
          const isActive  = globalIdx === currentChangeIndex
          const noteKey   = String(change.spanIdx)
          const noteData  = notes[noteKey] ?? { note: '', tag: '' }
          const isOpen    = expanded === change.spanIdx
          const { short, color } = typeLabel(change.type)

          return (
            <div key={change.spanIdx}
              className={`${isActive ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50'} transition`}>

              {/* Row */}
              <button
                onClick={() => onNavigate(globalIdx)}
                className="w-full text-left px-3 py-2 flex items-start gap-2"
              >
                <span className={`mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded uppercase flex-shrink-0 ${color}`}>
                  {short}
                </span>
                <span className="flex-1 text-xs text-gray-600 truncate leading-relaxed">
                  {change.preview}
                </span>
                {noteData.tag && (
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${TAG_COLOR[noteData.tag] ?? ''}`}>
                    {noteData.tag}
                  </span>
                )}
                {noteData.note && <MessageSquare className="w-3 h-3 text-blue-400 flex-shrink-0 mt-0.5" />}
              </button>

              {/* Expand / collapse note editor */}
              <button
                onClick={() => setExpanded(isOpen ? null : change.spanIdx)}
                className="w-full flex items-center gap-1 px-3 pb-1.5 text-xs text-gray-400 hover:text-gray-600"
              >
                <Tag className="w-3 h-3" />
                {isOpen ? 'Hide note' : 'Add note / tag'}
                {isOpen ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
              </button>

              {isOpen && (
                <div className="px-3 pb-3 flex flex-col gap-2 bg-gray-50">
                  {/* Tag selector */}
                  <div className="flex flex-wrap gap-1">
                    {TAG_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => onNoteChange(change.spanIdx, { ...noteData, tag: opt.value })}
                        className={`text-xs px-2 py-0.5 rounded-full border transition
                          ${noteData.tag === opt.value
                            ? opt.color + ' border-current font-semibold'
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}
                      >
                        {noteData.tag === opt.value && <Check className="inline w-2.5 h-2.5 mr-0.5" />}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {/* Note textarea */}
                  <textarea
                    rows={2}
                    placeholder="Add a note…"
                    value={noteData.note}
                    onChange={e => onNoteChange(change.spanIdx, { ...noteData, note: e.target.value })}
                    className="w-full text-xs border border-gray-200 rounded p-1.5 resize-none focus:outline-none focus:border-blue-400"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
