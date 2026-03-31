'use client'

import dynamic from 'next/dynamic'

const MdEditorClient = dynamic(
  () => import('./components/MdEditorClient'),
  { ssr: false },
)

export default function MdPage() {
  return <MdEditorClient />
}
