import { useChat } from '@/hooks/useChat';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ChatPage() {
  const { messages, loading } = useChat(2000);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse text-kick">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4">
      <ScrollArea className="h-full">
        <div className="space-y-2">
          {messages.map((message) => (
            <div
              key={message.id}
              className="flex items-start gap-3 bg-card/50 backdrop-blur rounded-lg p-3 border border-border/50"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={message.sender?.profile_picture} />
                <AvatarFallback className="bg-kick text-primary-foreground text-xs">
                  {message.sender?.username?.[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-kick text-sm">
                  {message.sender?.username || 'Unknown'}
                </span>
                <p className="text-foreground text-sm break-words">{message.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
