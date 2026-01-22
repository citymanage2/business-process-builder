import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useProcessBuilderStore } from '@/stores/processBuilderStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  MessageSquare,
  Send,
  MoreVertical,
  Trash2,
  CheckCircle,
  Circle,
  Reply,
  X,
} from 'lucide-react';

interface CommentsPanelProps {
  processId: number | null;
  language?: 'en' | 'ru';
}

export default function CommentsPanel({ processId, language = 'ru' }: CommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  
  const selectedBlockForProperties = useProcessBuilderStore(
    (state) => state.selectedBlockForProperties
  );
  const nodes = useProcessBuilderStore((state) => state.nodes);
  
  // Get selected node name
  const selectedNode = nodes.find((n) => n.id === selectedBlockForProperties);
  const selectedNodeName = selectedNode?.data.name;
  
  // Queries and mutations
  const commentsQuery = trpc.builder.comments.list.useQuery(
    {
      processId: processId!,
      nodeId: selectedBlockForProperties || undefined,
    },
    { enabled: !!processId }
  );
  
  const createComment = trpc.builder.comments.create.useMutation({
    onSuccess: () => {
      setNewComment('');
      setReplyTo(null);
      commentsQuery.refetch();
      toast.success(language === 'ru' ? 'Комментарий добавлен' : 'Comment added');
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка добавления' : 'Failed to add comment');
    },
  });
  
  const deleteComment = trpc.builder.comments.delete.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
      toast.success(language === 'ru' ? 'Комментарий удален' : 'Comment deleted');
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Failed to delete');
    },
  });
  
  const resolveComment = trpc.builder.comments.resolve.useMutation({
    onSuccess: () => {
      commentsQuery.refetch();
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка' : 'Failed');
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processId || !newComment.trim()) return;
    
    createComment.mutate({
      processId,
      nodeId: selectedBlockForProperties || undefined,
      parentId: replyTo || undefined,
      content: newComment.trim(),
    });
  };
  
  const handleResolve = (id: number, resolved: boolean) => {
    resolveComment.mutate({ id, resolved: !resolved });
  };
  
  const handleDelete = (id: number) => {
    deleteComment.mutate({ id });
  };
  
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  
  const texts = {
    en: {
      placeholder: 'Write a comment...',
      send: 'Send',
      noComments: 'No comments yet',
      startDiscussion: 'Start a discussion',
      resolved: 'Resolved',
      reply: 'Reply',
      delete: 'Delete',
      markResolved: 'Mark as resolved',
      markUnresolved: 'Mark as unresolved',
      allComments: 'All comments',
      commentsFor: 'Comments for',
      replyingTo: 'Replying to',
      cancel: 'Cancel',
    },
    ru: {
      placeholder: 'Написать комментарий...',
      send: 'Отправить',
      noComments: 'Комментариев пока нет',
      startDiscussion: 'Начните обсуждение',
      resolved: 'Решено',
      reply: 'Ответить',
      delete: 'Удалить',
      markResolved: 'Отметить как решено',
      markUnresolved: 'Отметить как нерешено',
      allComments: 'Все комментарии',
      commentsFor: 'Комментарии к',
      replyingTo: 'Ответ на',
      cancel: 'Отмена',
    },
  };
  
  const t = texts[language];
  
  if (!processId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">
          {language === 'ru'
            ? 'Сохраните процесс, чтобы добавлять комментарии'
            : 'Save the process to add comments'}
        </p>
      </div>
    );
  }
  
  // Group comments by parent
  const parentComments = (commentsQuery.data || []).filter((c) => !c.parentId);
  const childComments = (commentsQuery.data || []).filter((c) => c.parentId);
  
  const getChildren = (parentId: number) => {
    return childComments.filter((c) => c.parentId === parentId);
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4" />
          {selectedNodeName ? (
            <span className="truncate">
              {t.commentsFor} <strong>{selectedNodeName}</strong>
            </span>
          ) : (
            <span>{t.allComments}</span>
          )}
          {commentsQuery.data && commentsQuery.data.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {commentsQuery.data.length}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Comments list */}
      <ScrollArea className="flex-1">
        {commentsQuery.isLoading ? (
          <div className="p-4 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : parentComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm font-medium">{t.noComments}</p>
            <p className="text-xs mt-1">{t.startDiscussion}</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {parentComments.map((comment) => {
              const children = getChildren(comment.id);
              const isResolved = comment.isResolved === 1;
              
              return (
                <div
                  key={comment.id}
                  className={cn(
                    'rounded-lg border p-3',
                    isResolved && 'opacity-60'
                  )}
                >
                  {/* Comment header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {comment.user?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), 'd MMM, HH:mm', {
                            locale: language === 'ru' ? ru : undefined,
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {isResolved && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <CheckCircle className="w-3 h-3" />
                          {t.resolved}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setReplyTo(comment.id)}>
                            <Reply className="w-4 h-4 mr-2" />
                            {t.reply}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleResolve(comment.id, isResolved)}
                          >
                            {isResolved ? (
                              <>
                                <Circle className="w-4 h-4 mr-2" />
                                {t.markUnresolved}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {t.markResolved}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(comment.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t.delete}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {/* Comment content */}
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  
                  {/* Replies */}
                  {children.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 space-y-3">
                      {children.map((reply) => (
                        <div key={reply.id} className="flex gap-2">
                          <Avatar className="w-6 h-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(reply.user?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">
                                {reply.user?.name || 'Unknown'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(reply.createdAt), 'd MMM, HH:mm', {
                                  locale: language === 'ru' ? ru : undefined,
                                })}
                              </span>
                            </div>
                            <p className="text-sm">{reply.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      
      {/* New comment form */}
      <div className="p-3 border-t">
        {replyTo && (
          <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground bg-muted rounded px-2 py-1">
            <span>{t.replyingTo}...</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setReplyTo(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t.placeholder}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!newComment.trim() || createComment.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
