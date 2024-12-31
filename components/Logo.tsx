import React from 'react'

interface LogoProps {
  collapsed?: boolean;
}

const Logo: React.FC<LogoProps> = ({ collapsed = false }) => {
  return (
    <h1 className={`text-2xl font-serif text-primary ${collapsed ? 'w-8 h-8 flex items-center justify-center' : ''}`}>
      {collapsed ? 'G' : 'Grammario'}
    </h1>
  )
}

export default Logo

