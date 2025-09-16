import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: string) => {
    // Adiciona uma classe de transição temporariamente
    document.documentElement.classList.add('theme-transition');
    
    setTheme(newTheme);
    
    // Remove a classe após a transição
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 350);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative overflow-hidden group">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all duration-500 ease-in-out dark:-rotate-90 dark:scale-0 group-hover:rotate-12" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all duration-500 ease-in-out dark:rotate-0 dark:scale-100 dark:group-hover:rotate-12" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => handleThemeChange("light")}
          className="cursor-pointer transition-all duration-200 hover:bg-accent/50"
        >
          <Sun className="mr-2 h-4 w-4 transition-transform duration-200 hover:rotate-12" />
          <span>Claro</span>
          {theme === "light" && <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("dark")}
          className="cursor-pointer transition-all duration-200 hover:bg-accent/50"
        >
          <Moon className="mr-2 h-4 w-4 transition-transform duration-200 hover:rotate-12" />
          <span>Escuro</span>
          {theme === "dark" && <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleThemeChange("system")}
          className="cursor-pointer transition-all duration-200 hover:bg-accent/50"
        >
          <Monitor className="mr-2 h-4 w-4 transition-transform duration-200 hover:scale-110" />
          <span>Sistema</span>
          {theme === "system" && <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
