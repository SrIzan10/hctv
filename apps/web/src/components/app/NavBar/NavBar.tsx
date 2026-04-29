'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/lib/auth/actions';
import { useSession } from '@/lib/providers/SessionProvider';
import Link from 'next/link';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import {
  IdCard,
  Shield,
  Settings,
  Users,
  PenSquare,
  LogOut,
  Code,
  Github,
  Heart,
  Radio,
} from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Image from 'next/image';
import Logo from '@/lib/assets/logo.webp';
import { usePersonalChannels } from '@/lib/hooks/useUserList';

export default function Navbar(props: Props) {
  const { user } = useSession();
  const { channels: personalChannels } = usePersonalChannels();
  const personalChannel = personalChannels.find((channel) => channel.channelId === user?.personalChannelId);
  const username = personalChannel?.username || 'not-onboarded';
  
  const menuItemClass = "cursor-pointer rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/10 focus:bg-primary/10 hover:text-primary focus:text-primary";
  const iconClass = "w-4 h-4 mr-3 text-muted-foreground";

  return (
    <>
      <nav className="flex items-center justify-between h-14 md:h-16 px-2 md:px-4 border-b gap-1 md:gap-3 w-full z-40 fixed top-0 left-0 shadow-md bg-mantle">
        <div className="flex items-center space-x-2 md:space-x-5 shrink-0">
            <Link href="/" className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-sm hover:scale-105 transition-transform duration-200 "
            >
              <Image
              src={Logo}
              alt="HCTV Logo"
              className="h-6 w-6 md:h-8 md:w-8"
              />
            </Button>
            </Link>
          <SidebarTrigger />
        </div>

        {/* Right Side Items */}
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          {user && (
            <Link href="/stream">
              <Button variant="outline" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm">
                <Radio className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Go live</span>
                <span className="sm:hidden">Live</span>
              </Button>
            </Link>
          )}

          {props.editLivestream && <div className="hidden sm:block">{props.editLivestream}</div>}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage src={user.pfpUrl} alt={`@${username || '(not onboarded)'}`} />
                  <AvatarFallback>{user.pfpUrl}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 mt-2 p-2 rounded-xl border-border/50 shadow-xl backdrop-blur-xl bg-mantle/95" align="end" sideOffset={5}>
                <div className="flex items-center gap-3 p-2 mb-2">
                  <Avatar className="h-10 w-10 border border-border/50">
                    <AvatarImage src={user.pfpUrl} alt={`@${username}`} />
                    <AvatarFallback>{username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5">
                    <p className="text-sm font-semibold tracking-tight text-foreground">@{username}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[140px]">Manage your account</p>
                  </div>
                </div>
                <DropdownMenuSeparator className="bg-border/40 mb-2" />
                
                <DropdownMenuGroup className="space-y-1">
                  <Link href={`/settings/follows`}>
                    <DropdownMenuItem className={menuItemClass}>
                      <Users className={iconClass} />
                      Follows
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/settings/channel/create`}>
                    <DropdownMenuItem className={menuItemClass}>
                      <PenSquare className={iconClass} />
                      Create channel
                    </DropdownMenuItem>
                  </Link>
                  <Link href={`/settings/bot`}>
                    <DropdownMenuItem className={menuItemClass}>
                      <Settings className={iconClass} />
                      Bot accounts
                    </DropdownMenuItem>
                  </Link>
                  
                  {user.isAdmin && (
                    <div>
                      <DropdownMenuSeparator className="bg-border/40 my-2" />
                      <Link href={`/admin`}>
                        <DropdownMenuItem className={`${menuItemClass} text-primary hover:text-primary`}>
                          <Shield className={`w-4 h-4 mr-3 text-primary`} />
                          Admin Panel
                        </DropdownMenuItem>
                      </Link>
                    </div>
                  )}
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator className="bg-border/40 my-2" />
                
                <DropdownMenuGroup className="space-y-1">
                  <Link href={'https://docs.hackclub.tv'} target="_blank" rel="noreferrer">
                    <DropdownMenuItem className={menuItemClass}>
                      <Code className={iconClass} />
                      API Docs
                    </DropdownMenuItem>
                  </Link>
                  <div className="grid grid-cols-2 gap-1">
                    <Link href={'https://github.com/SrIzan10/hctv'} target="_blank" rel="noreferrer">
                      <DropdownMenuItem className={`${menuItemClass} justify-center text-xs`}>
                        <Github className="w-3.5 h-3.5 mr-1.5" />
                        Github
                      </DropdownMenuItem>
                    </Link>
                    <Link href={'https://github.com/sponsors/SrIzan10'} target="_blank" rel="noreferrer">
                      <DropdownMenuItem className={`${menuItemClass} justify-center text-xs text-pink-500 hover:text-pink-500 hover:bg-pink-500/10 focus:bg-pink-500/10`}>
                        <Heart className="w-3.5 h-3.5 mr-1.5" />
                        Sponsor
                      </DropdownMenuItem>
                    </Link>
                  </div>
                </DropdownMenuGroup>
                
                <DropdownMenuSeparator className="bg-border/40 my-2" />
                
                <div className="flex items-center justify-between px-1">
                  <ThemeSwitcher />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    onClick={() => logout()}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </Button>
                </div>
                
                <div className="mt-2 pt-3 border-t border-border/40 px-2">
                  <p className="text-[10px] text-muted-foreground/60 text-center font-mono">
                    v{process.env.version}-{process.env.NODE_ENV === 'development' ? 'dev' : 'prod'} • {' '}
                    <Link
                      href={`https://github.com/SrIzan10/hctv/commit/${process.env.commit}`}
                      target="_blank"
                      className="hover:text-primary underline decoration-border/50 underline-offset-2"
                    >
                      {process.env.commit?.substring(0, 7) || 'unknown'}
                    </Link>
                  </p>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/hackclub">
              <Button variant="outline" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm">
                <IdCard className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Sign in</span>
                <span className="sm:hidden">Login</span>
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

interface Props {
  editLivestream: Promise<JSX.Element>;
}
