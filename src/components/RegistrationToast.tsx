import { Snackbar } from './Snackbar';

export function RegistrationToast({ onDismiss, message = '식재료 8개를 등록했어요' }: { onDismiss: () => void; message?: string }) {
  return <Snackbar message={message} onDismiss={onDismiss} figmaNode="5693:5029" />;
}
