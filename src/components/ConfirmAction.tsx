export default function ConfirmAction({ text, confirmLabel, onConfirm, onCancel, disabled = false }: {
  text: string; confirmLabel: string; onConfirm: () => void; onCancel: () => void; disabled?: boolean;
}) {
  return <div className="confirm-action" role="alert"><p>{text}</p><div className="editor-actions">
    <button className="button button-quiet" type="button" disabled={disabled} onClick={onCancel}>유지하기</button>
    <button className="button button-danger" type="button" disabled={disabled} onClick={onConfirm}>{confirmLabel}</button>
  </div></div>;
}
