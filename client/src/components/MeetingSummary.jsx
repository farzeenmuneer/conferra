import { useState } from 'react'

function MeetingSummary({ messages, onClose }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)

  const generateLocalSummary = () => {
    if (messages.length === 0) {
      setSummary('No chat messages to summarize. Send some messages first!')
      return
    }

    setLoading(true)

    // Simulate AI processing
    setTimeout(() => {
      // Extract key information from messages
      const participants = [...new Set(messages.map(m => m.user))]
      const allText = messages.map(m => m.text).join(' ')
      const messageCount = messages.length
      
      // Find action items (messages with keywords)
      const actionItems = messages.filter(m => 
        m.text.toLowerCase().includes('will') ||
        m.text.toLowerCase().includes('need to') ||
        m.text.toLowerCase().includes('take') ||
        m.text.toLowerCase().includes('going to')
      )
      
      // Find decisions (messages with agreement keywords)
      const decisions = messages.filter(m =>
        m.text.toLowerCase().includes('agreed') ||
        m.text.toLowerCase().includes('perfect') ||
        m.text.toLowerCase().includes('sounds good') ||
        m.text.toLowerCase().includes('okay')
      )

      // Build summary
      let summaryText = `📊 **Meeting Summary**\n\n`
      summaryText += `**Participants:** ${participants.join(', ')}\n`
      summaryText += `**Total Messages:** ${messageCount}\n\n`
      
      if (actionItems.length > 0) {
        summaryText += `**Action Items:**\n`
        actionItems.slice(0, 5).forEach(msg => {
          summaryText += `• ${msg.user}: "${msg.text}"\n`
        })
        summaryText += `\n`
      }
      
      if (decisions.length > 0) {
        summaryText += `**Key Decisions:**\n`
        decisions.slice(0, 3).forEach(msg => {
          summaryText += `• ${msg.text}\n`
        })
        summaryText += `\n`
      }
      
      // Add topic summary
      const topics = extractTopics(allText)
      if (topics) {
        summaryText += `**Topics Discussed:** ${topics}\n\n`
      }
      
      summaryText += `_Summary generated from ${messageCount} chat messages._`
      
      setSummary(summaryText)
      setLoading(false)
    }, 1500) // Simulate AI processing time
  }

  const extractTopics = (text) => {
    const keywords = {
      'mobile': 'Mobile App',
      'redesign': 'UI/UX Redesign',
      'bug': 'Bug Fixes',
      'login': 'Authentication',
      'payment': 'Payment Gateway',
      'design': 'Design',
      'timeline': 'Project Timeline',
      'testing': 'Testing/QA',
      'deploy': 'Deployment',
      'feature': 'New Features',
      'database': 'Database',
      'api': 'API Development',
      'security': 'Security',
      'performance': 'Performance'
    }
    
    const found = []
    for (const [key, value] of Object.entries(keywords)) {
      if (text.toLowerCase().includes(key)) {
        found.push(value)
      }
    }
    
    return found.length > 0 ? [...new Set(found)].join(', ') : 'General Discussion'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-semibold text-lg">🤖 AI Meeting Summary</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
        </div>
        
        {!summary && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-2">
              {messages.length > 0 
                ? `${messages.length} chat messages found from ${[...new Set(messages.map(m => m.user))].length} participants` 
                : 'No messages yet'}
            </p>
            <p className="text-gray-500 text-sm mb-4">
              Generate an AI-powered summary of this meeting
            </p>
            <button
              onClick={generateLocalSummary}
              disabled={messages.length === 0}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors"
            >
              Generate Summary
            </button>
          </div>
        )}
        
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">AI is analyzing your meeting...</p>
          </div>
        )}
        
        {summary && (
          <div>
            <div className="bg-gray-700 rounded-lg p-4 mb-4">
              <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
                {summary}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summary)
                  alert('Summary copied!')
                }}
                className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition-colors"
              >
                📋 Copy
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default MeetingSummary