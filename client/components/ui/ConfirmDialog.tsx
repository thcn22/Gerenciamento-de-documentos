import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "@/components/ui/button";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  defaultValue?: string;
  showInput?: boolean;
};

type ConfirmState = {
  open: boolean;
  resolve?: (value: any) => void;
  options?: ConfirmOptions;
};

const ConfirmContext = React.createContext<{
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean | string | null>;
} | null>(null);

export const ConfirmProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = React.useState<ConfirmState>({ open: false });
  const [inputValue, setInputValue] = React.useState("");

  const confirm = (message: string, options?: ConfirmOptions) => {
    return new Promise<boolean | string | null>((resolve) => {
      setInputValue(options?.defaultValue || "");
      setState({ open: true, resolve, options: { description: message, ...options } });
    });
  };

  const handleClose = (result: boolean | string | null) => {
    if (state.resolve) state.resolve(result);
    setState({ open: false });
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={state.open} onOpenChange={(v) => { if (!v) handleClose(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{state.options?.title || "Confirmação"}</DialogTitle>
            <DialogDescription>{state.options?.description}</DialogDescription>
          </DialogHeader>
          {state.options?.showInput && (
            <div className="mt-4">
              <input
                className="w-full rounded border p-2"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>{state.options?.cancelText || 'Cancelar'}</Button>
            <Button onClick={() => handleClose(state.options?.showInput ? inputValue : true)} className="ml-2">{state.options?.confirmText || 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx.confirm;
};

export default ConfirmProvider;
