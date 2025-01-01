import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-10 p-4">
      <p className="text-sm text-gray-600 text-center">
        This is still being developed and is filled with bugs. If you are seeing this, it is because I have sent it to you and want feedback. Thank you!
        <br />
        Grammario by <a href="https://www.mattserdukoff.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Matt Serdukoff</a>
      </p>
    </footer>
  )
}

export default Footer

