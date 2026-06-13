import React, { useState } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLogin }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const adminDevToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiYWZhNWI3NTAtNzZjZS00OWI0LTkxNTItMjY4MjA2ZTgwZjBjIiwicGhvbmUiOiI5OTk5OTk5OTk5IiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.JRm7oCU_rnG7qcvqYL7NdlwizhpRFZ41nPgWQdju4XQ';
  const userDevToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidXNlci1kZW1vLWlkLTEyMzQ1IiwicGhvbmUiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNzgxMDIxNzk3LCJleHAiOjE3ODM2MTM3OTd9.mockSignature';

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (phone.length !== 10 || isNaN(phone)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (phone !== '9999999999' && phone !== '1234567890') {
      setError('Only demo login numbers are supported for MVP testing.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 600);
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6 || isNaN(otp)) {
      setError('Please enter a 6-digit OTP code.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (phone === '9999999999' && otp === '123456') {
        onLogin(adminDevToken, 'admin');
      } else if (phone === '1234567890' && otp === '999999') {
        onLogin(userDevToken, 'user');
      } else {
        setError('Incorrect OTP. Try 123456 for Admin or 999999 for User.');
      }
    }, 600);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={{ fontSize: '32px' }}>🚆</span>
            <h1 style={styles.brandTitle}>
              <span style={styles.trace}>Trace</span>
              <span style={styles.ly}>ly</span>
            </h1>
          </div>
          <p style={styles.subtitle}>Ministry of Railways Portal</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handlePhoneSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Mobile Number</label>
              <div style={styles.inputWrapper}>
                <span style={styles.prefix}>+91</span>
                <input
                  type="text"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); }}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Enter 6-Digit OTP</label>
              <p style={styles.otpHint}>Sent to +91 {phone}</p>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value); setError(''); }}
                style={styles.inputCenter}
                disabled={loading}
              />
            </div>

            <button type="submit" style={styles.btnPrimary} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={() => { setStep(1); setOtp(''); setError(''); }}
              style={styles.btnLink}
              disabled={loading}
            >
              Back to Mobile Number
            </button>
          </form>
        )}

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>or</span>
          <span style={styles.dividerLine}></span>
        </div>

        {/* Supabase login placeholder */}
        <button style={styles.btnPlaceholder} disabled>
          <ShieldCheck size={18} />
          Login with Supabase Auth (Production Only)
        </button>

        <div style={styles.helperSection}>
          <p style={styles.helperTitle}>Demo Credentials:</p>
          <p style={styles.helperText}>🧑‍✈️ <strong>Admin</strong>: 9999999999 (OTP: 123456)</p>
          <p style={styles.helperText}>👤 <strong>User</strong>: 1234567890 (OTP: 999999)</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0F1E36', // Sleek dark navy bg
    fontFamily: 'var(--font-family)',
    padding: '20px',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: 'var(--color-white)',
    borderRadius: '16px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)',
    padding: '40px 32px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  brandTitle: {
    fontSize: '24px',
    fontWeight: '800',
    letterSpacing: '-0.5px',
  },
  trace: {
    color: 'var(--color-navy)',
  },
  ly: {
    color: 'var(--color-orange)',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--color-text-secondary)',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--color-navy)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1.5px solid var(--color-divider)',
    borderRadius: '8px',
    padding: '0 12px',
    height: '46px',
    transition: 'border-color 150ms ease',
  },
  prefix: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    marginRight: '8px',
  },
  input: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '15px',
    color: 'var(--color-text-primary)',
    fontWeight: '500',
  },
  inputCenter: {
    border: '1.5px solid var(--color-divider)',
    borderRadius: '8px',
    height: '46px',
    textAlign: 'center',
    fontSize: '18px',
    letterSpacing: '6px',
    fontWeight: '700',
    color: 'var(--color-navy)',
    outline: 'none',
    width: '100%',
  },
  otpHint: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    marginTop: '-4px',
    marginBottom: '4px',
  },
  btnPrimary: {
    backgroundColor: 'var(--color-orange)',
    border: 'none',
    color: 'white',
    fontSize: '15px',
    fontWeight: '700',
    borderRadius: '8px',
    height: '46px',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
    width: '100%',
  },
  btnLink: {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--color-text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'underline',
    marginTop: '4px',
    width: '100%',
  },
  errorAlert: {
    backgroundColor: '#FDEDEC',
    border: '1px solid #FADBD8',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#C0392B',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '20px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '24px 0',
    gap: '12px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: 'var(--color-divider)',
  },
  dividerText: {
    fontSize: '12px',
    color: 'var(--color-placeholder)',
    textTransform: 'uppercase',
  },
  btnPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    height: '46px',
    backgroundColor: '#F0F3F4',
    border: '1.5px dashed var(--color-placeholder)',
    borderRadius: '8px',
    color: 'var(--color-text-secondary)',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'not-allowed',
  },
  helperSection: {
    marginTop: '32px',
    backgroundColor: 'var(--color-surface)',
    borderRadius: '8px',
    padding: '16px',
    borderLeft: '4px solid var(--color-navy)',
  },
  helperTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--color-navy)',
    textTransform: 'uppercase',
    marginBottom: '8px',
    letterSpacing: '0.5px',
  },
  helperText: {
    fontSize: '12px',
    color: 'var(--color-text-secondary)',
    lineHeight: '1.6',
  },
};
