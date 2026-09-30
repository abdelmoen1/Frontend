const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
  دالة تسجيل الدخول وإرسال البيانات للـ API
  @param {Object} credentials 
  @returns {Promise<Object>} 
 */
export const login = async (credentials) => {
  try {
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to sign in. Please try again.');
    }

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * دالة تسجيل حساب جديد (طالب أو مؤسسة) وإرسال البيانات للـ API
  @param {Object} formData 
  @returns {Promise<Object>}
 */
export const register = async (formData) => {
  try {
    const payload = {
      name: formData.role === 'student' ? formData.name : formData.orgName,
      email: formData.email,
      password: formData.password,
      password_confirmation: formData.password_confirmation,
      role: formData.role,
    };

    const response = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create account. Please try again.');
    }

    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));

    return data;
  } catch (error) {
    throw error;
  }
};