import { useState } from "react";
import { useEffect } from "react";
import { createContext } from "react";
import { auth } from "../services/firebase";

export const AuthContext = createContext({});

export function AuthContextProvider(props) {
  const [user, setUser] = useState("Searching user...");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const { displayName, photoURL, uid, email, emailVerified } = user;

        setUser({
          id: uid,
          name: displayName,
          avatar: photoURL,
          email: email,
          emailVerified: emailVerified
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  async function signInWithEmailAndPassword(userEmail, password) {
    const result = await auth.signInWithEmailAndPassword(userEmail, password);

    if (!result.user) {
      throw new Error("Usuário não encontrado!");
    }

    const { displayName, photoURL, uid, email, emailVerified } = result.user;

    // if (!displayName || !photoURL) {
    //   throw new Error("Faltando informações da conta!");
    // }

    setUser({
      id: uid,
      name: displayName,
      avatar: photoURL,
      email: email,
      emailVerified: emailVerified
    });
    return result.user;
  }

  async function signOut() {
    await auth.signOut();
    setUser(null);
    window.location.href = "/";
    return;
  }

  async function passwordRecover(email) {
    await auth.sendPasswordResetEmail(email);
    return;
  }

  async function createUserWithEmailAndPassword(email, password, name) {
    let userCredential = await auth.createUserWithEmailAndPassword(email, password);
    let user = userCredential.user;
    user.updateProfile({
      displayName: name
    });
    return userCredential;
  }

  async function updatePhoto(photo) {
    const localUser = auth.currentUser;
    await localUser.updateProfile({ photoURL: photo });
    return;
  }

  async function updateName(name) {
    const localUser = auth.currentUser;
    await localUser.updateProfile({ displayName: name });
    return;
  }

  async function sendEmailVerification() {
    try {
      await auth.currentUser.sendEmailVerification();
      return;
    } catch (error) {
      console.error(error);
      throw new Error(error.message);
    }
  }

  return (
    <>
      <AuthContext.Provider
        value={{
          user,
          signInWithEmailAndPassword,
          signOut,
          passwordRecover,
          createUserWithEmailAndPassword,
          updatePhoto,
          updateName,
          sendEmailVerification
        }}>
        {props.children}
      </AuthContext.Provider>
    </>
  );
}
