import { createContext, useContext } from "react";

export const DialogContext = createContext(null);

const useDialogs = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error("useConfirm/useToast must be used inside <DialogProvider>");
  return context;
};

/**
 * `confirm({ title, message, confirmLabel, cancelLabel, danger })` opens a
 * modal dialog and resolves to true or false.
 */
export const useConfirm = () => useDialogs().confirm;

/** `toast(message, { type: "error" | "success" })` shows a notification. */
export const useToast = () => useDialogs().toast;
