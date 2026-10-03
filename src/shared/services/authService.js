const BASE_URL = import.meta.env.PROD ? "/api" : import.meta.env.VITE_API_BASE_URL;

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

export const getCurrentUser = async () => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${BASE_URL}/me`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
    throw new Error(data.message || 'Failed to fetch current user.');
  }

  localStorage.setItem('auth_user', JSON.stringify(data.user));
  return data.user;
};

export const logoutUser = async () => {
  const token = localStorage.getItem('auth_token');
  const response = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to log out on the server.');
  }
};