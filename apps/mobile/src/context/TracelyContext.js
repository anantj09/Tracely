import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '../services/asyncStorage';
import apiClient, { registerLogoutHandler } from '../services/apiClient';

const TracelyContext = createContext(null);

export const TracelyProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeJourney, setActiveJourney] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setActiveJourney(null);
  };

  // Register response interceptor logout trigger
  useEffect(() => {
    registerLogoutHandler(logout);
  }, []);

  const refreshUser = async () => {
    setLoading(true);
    setConnectionError(false);
    try {
      const response = await apiClient.get('/users/me');
      const { data } = response.data;
      if (data) {
        const { active_journey, ...userProfile } = data;
        setCurrentUser(userProfile);
        setActiveJourney(active_journey || null);
      }
    } catch (err) {
      console.warn('Failed to refresh user profile:', err.message);
      const isNetErr = err.code === 'ECONNABORTED' || !err.response;
      if (isNetErr) {
        setConnectionError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshJourney = async () => {
    try {
      const response = await apiClient.get('/users/me');
      const { data } = response.data;
      if (data && data.active_journey) {
        setActiveJourney(data.active_journey);
      } else {
        setActiveJourney(null);
      }
    } catch (err) {
      console.warn('Failed to refresh active journey:', err.message);
    }
  };

  const login = async (newToken, userProfile) => {
    await AsyncStorage.setItem('token', newToken);
    setToken(newToken);
    if (userProfile) {
      const { active_journey, ...profile } = userProfile;
      setCurrentUser(profile);
      setActiveJourney(active_journey || null);
    }
    await refreshUser();
  };

  // Bootstrap credentials on launch
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('token');
        if (storedToken) {
          setToken(storedToken);
          setConnectionError(false);
          const response = await apiClient.get('/users/me');
          const { data } = response.data;
          if (data) {
            const { active_journey, ...userProfile } = data;
            setCurrentUser(userProfile);
            setActiveJourney(active_journey || null);
          }
        }
      } catch (err) {
        console.warn('Session bootstrapping failed:', err.message);
        const isNetErr = err.code === 'ECONNABORTED' || !err.response;
        if (isNetErr) {
          setConnectionError(true);
        }
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  return (
    <TracelyContext.Provider
      value={{
        currentUser,
        activeJourney,
        loading,
        connectionError,
        setConnectionError,
        token,
        login,
        logout,
        refreshUser,
        refreshJourney,
      }}
    >
      {children}
    </TracelyContext.Provider>
  );
};

export const useTracely = () => {
  const context = useContext(TracelyContext);
  if (!context) {
    throw new Error('useTracely must be used within a TracelyProvider');
  }
  return context;
};
