// src/contexts/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "../firebase"; // Ensure db is imported
import { doc, getDoc } from "firebase/firestore"; // Import Firestore methods

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, loading, error] = useAuthState(auth);
  const [role, setRole] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setRole(userData.userRole); // Assuming 'userRole' field exists
          } else {
            setRole(null);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          setRoleError(err);
        } finally {
          setRoleLoading(false);
        }
      } else {
        setRole(null);
        setRoleLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, error, role, roleLoading, roleError }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for accessing auth context
export const useAuth = () => {
  return useContext(AuthContext);
};
