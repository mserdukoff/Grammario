import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import Logo from './Logo'
import { Button } from '@/components/ui/button'
import { Trash2, History, TrendingUp, MoreHorizontal } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { User as FirebaseUser } from 'firebase/auth'
import { Sentence } from '@/types'
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface AppSidebarProps {
  sentences: Sentence[];
  onDeleteSentence: (sentenceId: string) => Promise<void>;
  onSelectSentence: (sentence: Sentence) => void;
  onNewSentence: () => void;
  onShowProgress: () => void;
  user: FirebaseUser | null;
}

export function AppSidebar({ sentences, onDeleteSentence, onSelectSentence, onNewSentence, onShowProgress, user }: AppSidebarProps) {
  const [deletingSentenceId, setDeletingSentenceId] = useState<string | null>(null)
  
  const handleDelete = async (sentenceId: string) => {
    try {
      await onDeleteSentence(sentenceId)
      setDeletingSentenceId(null)
    } catch (error) {
      console.error('Error deleting sentence:', error)
      alert('Failed to delete sentence. Please try again.')
    }
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
           <div className="flex items-center gap-2 px-2 py-2">
            <Logo collapsed={false} /> {/* Logo might need adjustment for collapsed state via CSS or sidebar state */}
           </div>
        </SidebarHeader>
        <SidebarContent>
            <SidebarGroup>
                <SidebarGroupLabel>Application</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton onClick={onShowProgress}>
                                <TrendingUp />
                                <span>Progress Dashboard</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel>History</SidebarGroupLabel>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {!user ? (
                             <div className="px-4 py-2 text-xs text-muted-foreground">
                                Sign in to save history.
                             </div>
                        ) : sentences.length === 0 ? (
                             <div className="px-4 py-2 text-xs text-muted-foreground">
                                No sentences yet.
                             </div>
                        ) : (
                            sentences.map((sentence) => (
                                <SidebarMenuItem key={sentence.id}>
                                    <SidebarMenuButton onClick={() => onSelectSentence(sentence)}>
                                        <History className="text-muted-foreground" />
                                        <span className="truncate">
                                            {sentence.sentence}
                                        </span>
                                    </SidebarMenuButton>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <SidebarMenuAction showOnHover>
                                                <MoreHorizontal />
                                                <span className="sr-only">More</span>
                                            </SidebarMenuAction>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-48" side="right" align="start">
                                            <DropdownMenuItem onClick={() => setDeletingSentenceId(sentence.id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                <span>Delete Sentence</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </SidebarMenuItem>
                            ))
                        )}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
        <SidebarRail />
      </Sidebar>

      <AlertDialog open={!!deletingSentenceId} onOpenChange={() => setDeletingSentenceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sentence from your history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingSentenceId && handleDelete(deletingSentenceId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
