"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      onClick={toggleTheme}
      className="border border-border/60 bg-card/55 text-muted-foreground shadow-sm backdrop-blur-xl transition-colors hover:bg-card/80 hover:text-foreground"
      aria-label={isDark ? "切换到白天模式" : "切换到黑夜模式"}
      title={isDark ? "切换到白天模式" : "切换到黑夜模式"}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
