'use client'

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

export const links = [{ href: '/srizan', name: 'test stream' }];

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
      <nav className="flex items-center h-16 px-4 border-b gap-3 w-full z-20 fixed top-0 left-0 shadow-md bg-mantle">
        <div className="flex items-center">
          <SidebarTrigger />
          <Link href="/" className="flex items-center">
            <Button>hackclub.tv</Button>
          </Link>
        </div>
        <MobileNavbarLinks />
        <div className="flex-1" />
        <div className="hidden md:flex">
          <NavbarLinks />
        </div>
        <div className="flex-1" />
        {props.editLivestream}
        <ThemeSwitcher />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="cursor-pointer">
              <Avatar>
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
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/auth/slack">
            <Button variant="outline" className="gap-2">
              <Slack className="w-4 h-4" />
              Sign in
            </Button>
          </Link>
        )}
      </nav>
    </>
  );
}

interface Props {
  editLivestream: Promise<JSX.Element>;
}