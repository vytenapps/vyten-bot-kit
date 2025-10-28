import { useTheme } from "@/components/theme-provider";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Wrap toast to automatically add dismiss action
const toast = (message: string | React.ReactNode, data?: any) => {
  const toastId = sonnerToast(message, {
    ...data,
    action: data?.action || {
      label: "Dismiss",
      onClick: () => sonnerToast.dismiss(toastId),
    },
  });
  return toastId;
};

// Preserve other toast methods
toast.success = (message: string | React.ReactNode, data?: any) => {
  const toastId = sonnerToast.success(message, {
    ...data,
    action: data?.action || {
      label: "Dismiss",
      onClick: () => sonnerToast.dismiss(toastId),
    },
  });
  return toastId;
};

toast.error = (message: string | React.ReactNode, data?: any) => {
  const toastId = sonnerToast.error(message, {
    ...data,
    action: data?.action || {
      label: "Dismiss",
      onClick: () => sonnerToast.dismiss(toastId),
    },
  });
  return toastId;
};

toast.info = (message: string | React.ReactNode, data?: any) => {
  const toastId = sonnerToast.info(message, {
    ...data,
    action: data?.action || {
      label: "Dismiss",
      onClick: () => sonnerToast.dismiss(toastId),
    },
  });
  return toastId;
};

toast.warning = (message: string | React.ReactNode, data?: any) => {
  const toastId = sonnerToast.warning(message, {
    ...data,
    action: data?.action || {
      label: "Dismiss",
      onClick: () => sonnerToast.dismiss(toastId),
    },
  });
  return toastId;
};

toast.dismiss = sonnerToast.dismiss;
toast.custom = sonnerToast.custom;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
