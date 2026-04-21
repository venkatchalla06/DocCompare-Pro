import React from 'react'

export default function Skeleton() {
  return (
    <div className="flex flex-col gap-3 p-6">
      {[80, 65, 90, 50, 75, 60, 85].map((w, i) => (
        <div key={i} className="skeleton h-4 rounded" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}
