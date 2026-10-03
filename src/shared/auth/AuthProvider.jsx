import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "../services/authService";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem("auth_token");
    return { token, user: null, isLoading: Boolean(token) };
  });

  useEffect(() => {
    if (!auth.token) return undefined;

    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setAuth((current) => ({
            ...current,
            user: currentUser,
            isLoading: false,
          }));
        }
      })
      .catch(() => {
        if (active) setAuth({ token: null, user: null, isLoading: false });
      });

    return () => {
      active = false;
    };
  }, [auth.token]);

  const setAuthenticatedUser = (nextUser) => {
    setAuth({
      token: localStorage.getItem("auth_token"),
      user: nextUser,
      isLoading: false,
    });
  };

  const refreshUser = async () => {
    const currentUser = await getCurrentUser();
    setAuth((current) => ({ ...current, user: currentUser }));
    return currentUser;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Failed to revoke the server token:", error);
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setAuth({ token: null, user: null, isLoading: false });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: auth.user,
        isLoading: auth.isLoading,
        isAuthenticated: Boolean(auth.token && auth.user),
        setAuthenticatedUser,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}