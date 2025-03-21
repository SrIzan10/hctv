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
import MobileNavbarLinks from '../MobileNavbarLinks/MobileNavbarLinks';
import { ThemeSwitcher } from '../ThemeSwitcher/ThemeSwitcher';
import { Slack } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';

export const links = [{ href: '/', name: 'home (placeholder link)' }];

function NavbarLinks() {
  return (
    <>
      {links.map((link) => (
        <Link key={link.href} href={link.href}>
          <Button variant={'link'}>{link.name}</Button>
        </Link>
      ))}
    </>
  );
}

export default function Navbar(props: Props) {
  const { user } = useSession();
  return (
    <>
      <nav className="flex items-center justify-between h-14 md:h-16 px-2 md:px-4 border-b gap-1 md:gap-3 w-full z-40 fixed top-0 left-0 shadow-md bg-mantle">
        <div className="flex items-center space-x-2 md:space-x-5 shrink-0">
          <Link href="/" className="flex items-center">
            <Button variant={'ghost'} className="px-2 md:px-3 text-sm md:text-base">
              hackclub.tv
            </Button>
          </Link>
          <SidebarTrigger />
        </div>

        <div className="hidden md:flex">
          <NavbarLinks />
        </div>

        {/* Right Side Items */}
        <div className="flex items-center gap-1 md:gap-3 shrink-0">
          {props.editLivestream && <div className="hidden sm:block">{props.editLivestream}</div>}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="cursor-pointer">
                <Avatar className="h-8 w-8 md:h-10 md:w-10">
                  <AvatarImage src={user.pfpUrl} alt={`@${user.id}`} />
                  <AvatarFallback>{user.pfpUrl}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => {
                      logout();
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <ThemeSwitcher />
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth/slack">
              <Button variant="outline" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm">
                <Slack className="w-3 h-3 md:w-4 md:h-4" />
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
