export default function WebDeskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-full w-full m-0 p-0 overflow-hidden">
      {children}
    </div>
  )
}
