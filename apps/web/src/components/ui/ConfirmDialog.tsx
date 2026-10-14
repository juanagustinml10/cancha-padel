import { useState } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
import { Textarea } from './Textarea';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  requireReason?: boolean;
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger,
  loading,
  requireReason,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const reasonInvalid = requireReason && reason.trim().length < 3;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={loading}
            onClick={() => {
              setTouched(true);
              if (reasonInvalid) return;
              onConfirm(requireReason ? reason.trim() : undefined);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
      {requireReason ? (
        <div className="mt-4">
          <label className="text-sm font-medium text-content" htmlFor="confirm-reason">
            Motivo
          </label>
          <Textarea
            id="confirm-reason"
            className="mt-1.5"
            rows={3}
            value={reason}
            invalid={touched && reasonInvalid}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Indicá el motivo (obligatorio)"
          />
          {touched && reasonInvalid ? (
            <p className="mt-1 text-xs font-medium text-danger" role="alert">
              El motivo debe tener al menos 3 caracteres.
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
