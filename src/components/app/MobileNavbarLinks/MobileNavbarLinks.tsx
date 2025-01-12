import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { links } from "../NavBar/NavBar";

export default function MobileNavbarLinks() {
  return (
    <div className="flex md:hidden">
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button>Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>stack</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                {links.map((link) => (
                    <Link key={link.href} href={link.href}>
                        <DropdownMenuItem>{link.name}</DropdownMenuItem>
                    </Link>
                ))}
            </DropdownMenuGroup>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
