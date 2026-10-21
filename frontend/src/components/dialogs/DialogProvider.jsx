import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./dialogs.css";
import { DialogContext } from "./useDialogs";

const TOAST_DURATION_MS = 6000;
let nextToastId = 1;

/**
 * Provides `useConfirm()` (an accessible replacement for window.confirm that
 * returns a Promise<boolean>) and `useToast()` (non-blocking notifications that
 * replace window.alert).
 */
export const DialogProvider = ({ children }) => {
  const [confirmation, setConfirmation] = useState(null);
  const [toasts, setToasts] = useState([]);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setConfirmation({ ...options, resolve })),
    []
  );

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (message, { type = "error" } = {}) => {
      const id = nextToastId++;
      setToasts((current) => [...current.slice(-2), { id, message, type }]);
      setTimeout(() => dismissToast(id), TOAST_DURATION_MS);
    },
    [dismissToast]
  );

  const closeConfirmation = (result) => {
    confirmation?.resolve(result);
    setConfirmation(null);
  };

  const value = useMemo(() => ({ confirm, toast }), [confirm, toast]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      <ConfirmDialog options={confirmation} onClose={closeConfirmation} />
      <div className="toasts" aria-live="polite">
        {toasts.map(({ id, message, type }) => (
          <div key={id} className={`toast ${type}`} role={type === "error" ? "alert" : "status"}>
            <span>{message}</span>
            <button onClick={() => dismissToast(id)} aria-label="Dismiss notification">
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </DialogContext.Provider>
  );
};

// Built on <dialog>.showModal(): the browser traps focus, makes the rest of the
// page inert, closes on Escape and restores focus afterwards.
const ConfirmDialog = ({ options, onClose }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (options && !dialog.open) dialog.showModal();
    if (!options && dialog.open) dialog.close();
  }, [options]);

  return (
    <dialog
      ref={dialogRef}
      className="confirmDialog"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      onCancel={(e) => {
        e.preventDefault();
        onClose(false);
      }}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) cancels.
        if (e.target === dialogRef.current) onClose(false);
      }}
    >
      {options && (
        <div className="dialogBody">
          <h2 id="confirm-title">{options.title}</h2>
          <p id="confirm-message">{options.message}</p>
          <div className="dialogActions">
            <button className="secondary" onClick={() => onClose(false)} autoFocus>
              {options.cancelLabel ?? "Cancel"}
            </button>
            <button
              className={options.danger ? "danger" : "primary"}
              onClick={() => onClose(true)}
            >
              {options.confirmLabel ?? "Confirm"}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
};
