import { Modal } from './Modal';

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel, busy, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5 text-sm leading-relaxed text-slate-300">{message}</p>
      <div className="flex justify-end gap-2">
        <button className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
        <button className="btn btn-danger" disabled={busy} onClick={onConfirm} data-testid="confirm-yes">{confirmLabel}</button>
      </div>
    </Modal>
  );
}
