import { useEffect, useState } from 'react';
import { OverlayDialog } from '../../components/OverlayDialog';
import { asset } from '../../lib/assets';

type Step = 'email' | 'code' | 'code-ready' | 'expired' | 'success';
const CODE_LIFETIME_MS = 30_000;

function EmailReminderField({
  id,
  label,
  placeholder,
  value,
  helperText,
  disabled = false,
  onChange,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  helperText?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const filled = Boolean(value);

  return <div className="email-reminder-field-group">
    <label htmlFor={id}>{label}</label>
    <div className={`email-reminder-input${filled ? ' is-filled' : ''}${disabled ? ' is-disabled' : ''}`}>
      <input
        id={id}
        type={id === 'reminder-email' ? 'email' : 'text'}
        autoComplete={id === 'reminder-email' ? 'email' : 'one-time-code'}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={event => onChange(event.target.value)}
      />
      {focused && filled && !disabled && <button
        type="button"
        className="email-reminder-clear"
        aria-label={`${label} 지우기`}
        onMouseDown={event => event.preventDefault()}
        onClick={() => onChange('')}
      ><img src={asset('search-clear.svg')} alt="" /></button>}
    </div>
    {helperText && <p className="email-reminder-field-helper">{helperText}</p>}
  </div>;
}

export function EmailReminderModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [deadline, setDeadline] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (deadline === null || !['code', 'code-ready'].includes(step)) return;
    const update = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setStep('expired');
    };
    update();
    const timer = window.setInterval(update, 200);
    return () => window.clearInterval(timer);
  }, [deadline, step]);

  const requestCode = () => {
    if (!email.trim()) return;
    setCode('');
    setSecondsLeft(30);
    setDeadline(null);
    setStep('code');
  };
  const resendCode = () => {
    setCode('');
    setSecondsLeft(30);
    setDeadline(null);
    setStep('code');
  };
  const verifyCode = () => {
    if (deadline !== null && Date.now() >= deadline) {
      setSecondsLeft(0);
      setStep('expired');
    } else if (code.trim()) {
      setStep('success');
    }
  };

  const title = step === 'email'
    ? '알림 이메일 신청'
    : step === 'expired' ? '인증시간이 지났어요'
    : step === 'success' ? '이메일 인증이 완료됐어요'
    : '이메일을 확인해 주세요';
  const description = step === 'email'
    ? <>소비 권장일 알림을 받을<br />이메일 주소를 알려주세요.</>
    : step === 'expired'
      ? <>새 인증번호를 받아<br />이메일 인증을 이어가 주세요.</>
      : step === 'success'
        ? <>이제 소비 권장일 알림을<br />이메일로 받을 수 있어요.</>
        : <>테스트용 인증번호 입력 화면이에요.<br />아무 값이나 입력해 주세요.</>;

  return <OverlayDialog label="알림 이메일 신청" onClose={onClose} className="email-reminder-dialog">
    <div className="email-reminder-content">
      <div className="email-reminder-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button type="button" className="email-reminder-close" aria-label="닫기" onClick={onClose}><img src={asset('modal-close.svg')} alt="" /></button>
      </div>

      {step === 'success' ? <div className="email-reminder-success">
        <span className="email-reminder-success-icon" aria-hidden="true"><i /></span>
        <strong>{email}</strong>
        <p>소비 권장일 3일 전, 1일 전, 당일에 알림을 보내드릴게요.</p>
        <small>알림 받을 이메일은 설정에서 변경할 수 있어요.</small>
      </div> : <div className="email-reminder-fields">
        {step === 'email' ? <>
          <EmailReminderField id="reminder-email" label="알림 받을 이메일" placeholder="이메일 주소를 입력해 주세요" value={email} helperText="테스트 흐름에서는 이메일 발송 없이 다음 단계로 진행돼요." onChange={setEmail} />
          <p>인증 후 알림 수신에 동의하면 신청이 완료돼요.<br />알림은 설정에서 언제든 끌 수 있어요.</p>
        </> : <>
          <EmailReminderField
            id="reminder-code"
            label="인증번호"
            placeholder="인증번호를 입력해 주세요"
            value={code}
            disabled={step === 'expired'}
            onChange={next => {
              setCode(next);
              if (next.trim() && deadline === null) {
                setSecondsLeft(30);
                setDeadline(Date.now() + CODE_LIFETIME_MS);
              }
              setStep(next.trim() ? 'code-ready' : 'code');
            }}
          />
          {step === 'expired'
            ? <p className="email-reminder-error" role="alert">인증번호가 만료됐어요. 새 번호를 받아주세요.</p>
            : deadline !== null && <p className="email-reminder-timer">인증번호 유효시간 {`00:${String(secondsLeft).padStart(2, '0')}`}</p>}
          <div className="email-reminder-links">
            <button type="button" onClick={() => { setCode(''); setStep('email'); setDeadline(null); }}>이메일 주소 수정</button>
            {step === 'expired' && <button type="button" onClick={resendCode}>인증번호 다시 받기</button>}
          </div>
          <p className="email-reminder-test-note">테스트 흐름에서는 입력값과 관계없이 인증돼요.</p>
        </>}
      </div>}

      <footer className="email-reminder-footer">
        {step === 'email'
          ? <button type="button" disabled={!email.trim()} onClick={requestCode}>인증번호 받기</button>
          : step === 'expired'
            ? <button type="button" onClick={resendCode}>인증번호 다시 받기</button>
            : step === 'success'
              ? <button type="button" onClick={() => {
                  window.dispatchEvent(new CustomEvent('kokjipseo:email-reminder-completed', { detail: { email } }));
                  onClose();
                }}>확인</button>
              : <button type="button" disabled={!code.trim()} onClick={verifyCode}>인증하고 알림 받기</button>}
      </footer>
    </div>
  </OverlayDialog>;
}
