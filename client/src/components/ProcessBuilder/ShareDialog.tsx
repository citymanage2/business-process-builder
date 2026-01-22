import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
  Users,
  Mail,
  Link as LinkIcon,
  Copy,
  Check,
  X,
  Crown,
  Globe,
  Lock,
  UserPlus,
} from 'lucide-react';

interface ShareDialogProps {
  processId: number;
  processName: string;
  isOpen: boolean;
  onClose: () => void;
  language?: 'en' | 'ru';
}

export default function ShareDialog({
  processId,
  processName,
  isOpen,
  onClose,
  language = 'ru',
}: ShareDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer' | 'commenter'>('viewer');
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Queries
  const collaboratorsQuery = trpc.builder.collaborators.list.useQuery(
    { processId },
    { enabled: isOpen }
  );
  
  const processQuery = trpc.builder.get.useQuery(
    { id: processId },
    { enabled: isOpen }
  );
  
  // Mutations
  const addCollaborator = trpc.builder.collaborators.add.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Приглашение отправлено' : 'Invitation sent');
      setEmail('');
      collaboratorsQuery.refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  
  const updateCollaborator = trpc.builder.collaborators.update.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Права обновлены' : 'Access updated');
      collaboratorsQuery.refetch();
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка' : 'Error');
    },
  });
  
  const removeCollaborator = trpc.builder.collaborators.remove.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Доступ отозван' : 'Access revoked');
      collaboratorsQuery.refetch();
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка' : 'Error');
    },
  });
  
  const updateProcess = trpc.builder.update.useMutation({
    onSuccess: () => {
      toast.success(language === 'ru' ? 'Настройки обновлены' : 'Settings updated');
      processQuery.refetch();
    },
  });
  
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    addCollaborator.mutate({
      processId,
      email: email.trim(),
      accessRole: role,
    });
  };
  
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/builder/${processId}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };
  
  const handleVisibilityChange = (isPublic: boolean) => {
    updateProcess.mutate({
      id: processId,
      visibility: isPublic ? 'public' : 'private',
    });
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
  
  const getRoleBadge = (accessRole: string) => {
    switch (accessRole) {
      case 'owner':
        return (
          <Badge variant="default" className="gap-1">
            <Crown className="w-3 h-3" />
            {language === 'ru' ? 'Владелец' : 'Owner'}
          </Badge>
        );
      case 'editor':
        return (
          <Badge variant="secondary">
            {language === 'ru' ? 'Редактор' : 'Editor'}
          </Badge>
        );
      case 'commenter':
        return (
          <Badge variant="secondary">
            {language === 'ru' ? 'Комментатор' : 'Commenter'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {language === 'ru' ? 'Читатель' : 'Viewer'}
          </Badge>
        );
    }
  };
  
  const texts = {
    en: {
      title: 'Share process',
      description: 'Invite people to collaborate on',
      inviteTitle: 'Invite by email',
      emailPlaceholder: 'Enter email address',
      invite: 'Invite',
      collaborators: 'Collaborators',
      noCollaborators: 'No collaborators yet',
      link: 'Share link',
      copyLink: 'Copy link',
      copied: 'Copied!',
      publicAccess: 'Public access',
      publicDescription: 'Anyone with the link can view this process',
      remove: 'Remove',
      editor: 'Can edit',
      viewer: 'Can view',
      commenter: 'Can comment',
    },
    ru: {
      title: 'Поделиться процессом',
      description: 'Пригласите людей для совместной работы над',
      inviteTitle: 'Пригласить по email',
      emailPlaceholder: 'Введите email адрес',
      invite: 'Пригласить',
      collaborators: 'Участники',
      noCollaborators: 'Пока нет участников',
      link: 'Ссылка для доступа',
      copyLink: 'Скопировать ссылку',
      copied: 'Скопировано!',
      publicAccess: 'Публичный доступ',
      publicDescription: 'Любой может просматривать процесс по ссылке',
      remove: 'Удалить',
      editor: 'Редактирование',
      viewer: 'Просмотр',
      commenter: 'Комментарии',
    },
  };
  
  const t = texts[language];
  const isPublic = processQuery.data?.visibility === 'public';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>
            {t.description} "{processName}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Invite form */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              {t.inviteTitle}
            </Label>
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                />
              </div>
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">{t.editor}</SelectItem>
                  <SelectItem value="viewer">{t.viewer}</SelectItem>
                  <SelectItem value="commenter">{t.commenter}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="submit"
                disabled={!email.trim() || addCollaborator.isPending}
              >
                {t.invite}
              </Button>
            </form>
          </div>
          
          <Separator />
          
          {/* Collaborators list */}
          <div className="space-y-3">
            <Label>{t.collaborators}</Label>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {collaboratorsQuery.data?.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(collab.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {collab.user?.name || collab.user?.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {collab.user?.email}
                      </div>
                    </div>
                    
                    {collab.accessRole === 'owner' ? (
                      getRoleBadge('owner')
                    ) : (
                      <div className="flex items-center gap-2">
                        <Select
                          value={collab.accessRole}
                          onValueChange={(v) =>
                            updateCollaborator.mutate({
                              processId,
                              userId: collab.userId,
                              accessRole: v as any,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-28 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="editor">{t.editor}</SelectItem>
                            <SelectItem value="viewer">{t.viewer}</SelectItem>
                            <SelectItem value="commenter">{t.commenter}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            removeCollaborator.mutate({
                              processId,
                              userId: collab.userId,
                            })
                          }
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                
                {(!collaboratorsQuery.data || collaboratorsQuery.data.length === 0) && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    {t.noCollaborators}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          <Separator />
          
          {/* Share link */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              {t.link}
            </Label>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/builder/${processId}`}
                readOnly
                className="text-sm"
              />
              <Button variant="outline" onClick={handleCopyLink}>
                {linkCopied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    {t.copied}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    {t.copyLink}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <Separator />
          
          {/* Public access toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                {isPublic ? (
                  <Globe className="w-4 h-4 text-green-500" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                {t.publicAccess}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t.publicDescription}
              </p>
            </div>
            <Switch
              checked={isPublic}
              onCheckedChange={handleVisibilityChange}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
