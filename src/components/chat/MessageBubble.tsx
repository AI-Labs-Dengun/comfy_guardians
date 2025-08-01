import { Message, Profile } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message & { sender?: Profile }
  isOwn: boolean
  showSender?: boolean
  anonymizePatientName?: (profile: Profile | undefined, userId: string) => string
}

export function MessageBubble({ message, isOwn, showSender = true, anonymizePatientName }: MessageBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  return (
    <div className={cn(
      "flex w-full mb-3",
      isOwn ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[70%] rounded-lg px-3 py-2 shadow-sm",
        isOwn 
          ? "bg-blue-500 text-white" 
          : "bg-gray-100 text-gray-900 border"
      )}>
        {/* Nome do remetente (apenas para mensagens de outros) */}
        {!isOwn && showSender && message.sender && (
          <div className="text-xs font-medium text-gray-600 mb-1">
            {anonymizePatientName ? anonymizePatientName(message.sender, message.sender_id) : message.sender.name}
          </div>
        )}
        
        {/* Conteúdo da mensagem */}
        <div className="break-words">
          {message.content}
        </div>
        
        {/* Horário e status */}
        <div className={cn(
          "flex items-center justify-end mt-1 text-xs",
          isOwn ? "text-blue-100" : "text-gray-500"
        )}>
          <span>{formatTime(message.created_at)}</span>
          {isOwn && (
            <div className="ml-1">
              {message.is_read ? (
                <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L4 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-blue-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 