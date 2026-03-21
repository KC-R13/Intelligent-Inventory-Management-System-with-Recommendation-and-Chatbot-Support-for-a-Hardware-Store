import { useState } from 'react'
import './App.css'
import Sidepanel from './Sidepanel'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import Inventory from './pages/Inventory'
import Sales from './pages/Sales'
import Settings from './pages/Settings'
import Chatbot from './pages/Chatbot'

function App() {
  const [isOpen, setIsOpen] = useState(true)
  const [currentPage, setCurrentPage] = useState('Dashboard')

  const pages = {
    Dashboard: <Dashboard />,
    Invoices: <Invoices />,
    Inventory: <Inventory />,
    Sales: <Sales />,
    Chatbot: <Chatbot />,
    Settings: <Settings />,
  }

  return (
    <div className='app-layout'>
      <Sidepanel
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />
      <main className={`main-content ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {pages[currentPage] || <Dashboard />}
      </main>
    </div>
  )
}

export default App
