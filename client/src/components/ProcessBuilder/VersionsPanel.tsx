import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { useProcessBuilderStore } from '@/stores/processBuilderStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { History, RotateCcw, Eye, Clock, User } from 'lucide-react';

interface VersionsPanelProps {
  processId: number | null;
  language?: 'en' | 'ru';
  onPreviewVersion?: (version: number) => void;
}

export default function VersionsPanel({
  processId,
  language = 'ru',
  onPreviewVersion,
}: VersionsPanelProps) {
  const loadProcess = useProcessBuilderStore((state) => state.loadProcess);
  const processName = useProcessBuilderStore((state) => state.processName);
  
  const versionsQuery = trpc.builder.versions.list.useQuery(
    { processId: processId! },
    { enabled: !!processId }
  );
  
  const restoreVersion = trpc.builder.versions.restore.useMutation({
    onSuccess: (data) => {
      toast.success(
        language === 'ru'
          ? `Восстановлена версия ${data.newVersion}`
          : `Restored to version ${data.newVersion}`
      );
      versionsQuery.refetch();
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка восстановления' : 'Restore failed');
    },
  });
  
  const getVersionQuery = trpc.builder.versions.get.useQuery;
  
  const handleRestore = (version: number) => {
    if (!processId) return;
    restoreVersion.mutate({ processId, version });
  };
  
  const handlePreview = async (version: number) => {
    if (!processId) return;
    onPreviewVersion?.(version);
  };
  
  if (!processId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <History className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">
          {language === 'ru'
            ? 'Сохраните процесс, чтобы увидеть историю версий'
            : 'Save the process to see version history'}
        </p>
      </div>
    );
  }
  
  if (versionsQuery.isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  if (!versionsQuery.data || versionsQuery.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-muted-foreground">
        <History className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">
          {language === 'ru' ? 'История версий пуста' : 'No version history'}
        </p>
      </div>
    );
  }
  
  const texts = {
    en: {
      version: 'Version',
      current: 'Current',
      restore: 'Restore',
      preview: 'Preview',
      restoreConfirmTitle: 'Restore this version?',
      restoreConfirmDescription:
        'This will create a new version with the contents from version {version}. Your current changes will not be lost.',
      cancel: 'Cancel',
    },
    ru: {
      version: 'Версия',
      current: 'Текущая',
      restore: 'Восстановить',
      preview: 'Просмотр',
      restoreConfirmTitle: 'Восстановить эту версию?',
      restoreConfirmDescription:
        'Будет создана новая версия с содержимым версии {version}. Ваши текущие изменения не будут потеряны.',
      cancel: 'Отмена',
    },
  };
  
  const t = texts[language];
  
  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        {versionsQuery.data.map((version, index) => {
          const isCurrent = index === 0;
          
          return (
            <div
              key={version.id}
              className={cn(
                'p-3 rounded-lg border transition-colors',
                isCurrent ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
              )}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      isCurrent ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {version.version}
                  </div>
                  <div>
                    <div className="font-medium text-sm flex items-center gap-2">
                      {t.version} {version.version}
                      {isCurrent && (
                        <Badge variant="secondary" className="text-xs">
                          {t.current}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {format(new Date(version.createdAt), 'd MMM yyyy, HH:mm', {
                        locale: language === 'ru' ? ru : undefined,
                      })}
                    </div>
                  </div>
                </div>
                
                {!isCurrent && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handlePreview(version.version)}
                      title={t.preview}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title={t.restore}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t.restoreConfirmTitle}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t.restoreConfirmDescription.replace(
                              '{version}',
                              String(version.version)
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRestore(version.version)}
                            disabled={restoreVersion.isPending}
                          >
                            {restoreVersion.isPending
                              ? language === 'ru'
                                ? 'Восстановление...'
                                : 'Restoring...'
                              : t.restore}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
              
              {version.comment && (
                <p className="text-xs text-muted-foreground ml-10 mt-1">
                  {version.comment}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
