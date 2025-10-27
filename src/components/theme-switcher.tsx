import { Moon, Sun, Monitor } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

interface ThemeSwitcherProps {
  className?: string;
  iconSize?: number;
}

export function ThemeSwitcher({ className, iconSize = 18 }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();

  const themes = [
    { value: "system", icon: Monitor, label: "System" },
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
  ] as const;

  return (
    <div className={cn("inline-flex items-center gap-0.5 rounded-full bg-muted p-0.5", className)}>
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            "relative flex items-center justify-center rounded-full w-8 h-8 transition-colors",
            "hover:bg-background/60",
            theme === value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground"
          )}
          aria-label={`Switch to ${label} theme`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${value}-${theme === value}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Icon size={iconSize} />
            </motion.div>
          </AnimatePresence>
        </button>
      ))}
    </div>
  );
}
