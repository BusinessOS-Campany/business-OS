import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      window.location.href = '/sama/dashboard';
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: Record<string, unknown>; status?: number }; message?: string };
      const serverErr = axiosErr?.response?.data?.error;
      setError(typeof serverErr === 'string' ? serverErr : axiosErr?.message || String(err));
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      backgroundImage: 'url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80)',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundSize: 'cover',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      padding: 0,
      direction: dir,
    }}>
      <div style={{
        display: 'flex',
        maxWidth: 720,
        width: '90%',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        flexDirection: dir === 'rtl' ? 'row-reverse' : 'row',
      }}>
        {/* Left side — Form */}
        <div style={{
          padding: '60px 30px 20px',
          background: '#fff',
          flex: '1.5',
        }}>
          <h1 style={{
            fontSize: 26,
            margin: 0,
            fontWeight: 400,
            color: '#55311c',
          }}>
            {dir === 'rtl' ? '!مرحبا' : 'Welcome!'}
          </h1>
          <p style={{
            margin: '6px 0 30px 0',
            color: 'rgba(0,0,0,0.7)',
          }}>
            {dir === 'rtl' ? 'مرحبا بكم في مركز سما للعلاج الطبيعي' : 'Welcome to SAMA Center'}
          </p>

          {error && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 4,
              background: '#fdecea',
              color: '#b71c1c',
              fontSize: 13,
              marginBottom: 16,
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '10px 10px 8px',
              border: `1px solid ${error ? '#b71c1c' : '#ddd'}`,
              borderRadius: 4,
              marginBottom: 20,
              transition: 'border-color 0.3s',
            }}>
              <label style={{
                fontSize: 11,
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.7px',
                color: '#8c7569',
              }}>
                {t('auth.username')}
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t('auth.username')}
                required
                style={{
                  outline: 0,
                  border: 0,
                  padding: '4px 0 0',
                  fontSize: 14,
                  fontFamily: '"Nunito", sans-serif',
                  background: 'transparent',
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '10px 10px 8px',
              border: `1px solid ${error ? '#b71c1c' : '#ddd'}`,
              borderRadius: 4,
              marginBottom: 20,
              transition: 'border-color 0.3s',
            }}>
              <label style={{
                fontSize: 11,
                textTransform: 'uppercase',
                fontWeight: 600,
                letterSpacing: '0.7px',
                color: '#8c7569',
              }}>
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                required
                style={{
                  outline: 0,
                  border: 0,
                  padding: '4px 0 0',
                  fontSize: 14,
                  fontFamily: '"Nunito", sans-serif',
                  background: 'transparent',
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '8px 12px',
                  outline: 'none',
                  border: 0,
                  color: '#fff',
                  borderRadius: 4,
                  background: loading ? '#999' : '#3e5679',
                  fontFamily: '"Nunito", sans-serif',
                  fontSize: 14,
                  cursor: loading ? 'default' : 'pointer',
                  transition: 'background 0.3s',
                }}
              >
                {loading ? t('auth.login.loading') : (dir === 'rtl' ? 'تسجيل الدخول' : t('auth.login'))}
              </button>
            </div>
          </form>
        </div>

        {/* Right side — Image/Graphic */}
        <div style={{
          flex: 2,
          fontSize: 0,
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #3e5679 0%, #55311c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400,
        }}>
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 36,
              color: '#fff',
              fontWeight: 800,
            }}>
              S
            </div>
            <h2 style={{
              color: '#fff',
              fontSize: 22,
              fontWeight: 400,
              margin: '0 0 8px',
            }}>
              SAMA CENTER
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13,
              margin: 0,
            }}>
              {dir === 'rtl' ? 'العلاج الطبيعي' : 'Physical Therapy'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
