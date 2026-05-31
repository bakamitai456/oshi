import { Link } from 'react-router-dom'

type Props = {
  title: string
  right?: React.ReactNode
}

export function PageHeader({ title, right }: Props) {
  return (
    <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center">
      <div className="w-1/4">
        <Link to="/" className="text-xl font-bold text-orange-600">oshi</Link>
      </div>
      <div className="flex-1 flex justify-center">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
      </div>
      <div className="w-1/4 flex justify-end">
        {right}
      </div>
    </header>
  )
}
