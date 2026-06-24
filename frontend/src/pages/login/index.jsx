import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/router";
import UserLayout from "@/layout/UserLayout";
import {
  registerUser,
  loginUser,
  forgotPasswordOtp,
  resetPasswordWithOtp
} from "@/config/redux/action/authAction";
import styles from "./style.module.css";
import { resetForgotPasswordFlow } from "@/config/redux/reducer/authReducer";
import { getAccessToken } from "@/config";

const validateEmailInput = (email) => {
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return "Email is required";
  }

  if (
    !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/.test(
      normalizedEmail
    ) ||
    normalizedEmail.includes("..")
  ) {
    return "Enter a valid email address such as name@gmail.com or name@yahoo.com";
  }

  return "";
};

const validateUsernameInput = (username) => {
  if (!/^[a-zA-Z0-9._-]{3,30}$/.test((username || "").trim())) {
    return "Username must be 3 to 30 characters using letters, numbers, dots, underscores, or hyphens";
  }

  return "";
};

const validatePasswordInput = (password, label = "Password") => {
  const value = password || "";

  if (value.length < 8) {
    return `${label} must be at least 8 characters long`;
  }

  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return `${label} must include uppercase, lowercase, and a number`;
  }

  return "";
};

function LoginComponent() {
  const authState = useSelector((state) => state.auth);
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formMessageMode, setFormMessageMode] = useState("signin");

  const authMode = useMemo(() => {
    const requestedMode = router.query.mode;

    if (
      requestedMode === "signin" ||
      requestedMode === "signup" ||
      requestedMode === "forgot"
    ) {
      return requestedMode;
    }

    return "signin";
  }, [router.query.mode]);

  const setAuthMode = (nextMode) => {
    setFormMessageMode(nextMode);
    setFormMessage("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    router.replace(
      {
        pathname: router.pathname,
        query: {
          ...router.query,
          mode: nextMode
        }
      },
      undefined,
      {
        shallow: true
      }
    );
  };

  const modeTitle = useMemo(() => {
    if (authMode === "signup") {
      return "Sign Up";
    }

    if (authMode === "forgot") {
      return authState.otpRequested ? "Reset Password" : "Forgot Password";
    }

    return "Sign In";
  }, [authMode, authState.otpRequested]);

  const modeDescription = useMemo(() => {
    if (authMode === "signup") {
      return "New user? Create your LinkVerse account to get started.";
    }

    if (authMode === "forgot") {
      return authState.otpRequested
        ? "Enter the OTP we sent and choose a new password."
        : "Forgot your password? Request a one-time code to reset it.";
    }

    return "Already have an account? Sign in with your email and password.";
  }, [authMode, authState.otpRequested]);

  const modeOptions = [
    {
      mode: "signin",
      prompt: "Already have an account?",
      label: "Sign In"
    },
    {
      mode: "signup",
      prompt: "New user?",
      label: "Sign Up"
    },
    {
      mode: "forgot",
      prompt: "Forgot your password?",
      label: "Reset Password"
    }
  ];

  const showFormMessage = (message) => {
    setFormMessageMode(authMode);
    setFormMessage(message);
  };

  const clearFormMessage = () => {
    setFormMessageMode(authMode);
    setFormMessage("");
  };

  const visibleFormMessage = formMessageMode === authMode ? formMessage : "";

  const handleLogin = () => {
    const emailError = validateEmailInput(email);

    if (!email || !password) {
      showFormMessage("All fields are required");
      return;
    }

    if (emailError) {
      showFormMessage(emailError);
      return;
    }

    const passwordError = validatePasswordInput(password);

    if (passwordError) {
      showFormMessage(passwordError);
      return;
    }

    clearFormMessage();
    dispatch(loginUser({ email, password }));
  };

  const handleRegister = () => {
    const emailError = validateEmailInput(email);
    const usernameError = validateUsernameInput(username);
    const passwordError = validatePasswordInput(password);

    if (!username || !password || !email || !name) {
      showFormMessage("All fields are required");
      return;
    }

    if (name.trim().length < 2) {
      showFormMessage("Full name must be at least 2 characters long");
      return;
    }

    if (emailError || usernameError || passwordError) {
      showFormMessage(emailError || usernameError || passwordError);
      return;
    }

    clearFormMessage();
    dispatch(registerUser({ username, password, email, name }));
  };

  const handleForgotPassword = () => {
    const emailError = validateEmailInput(email);

    if (!email) {
      showFormMessage("Email is required");
      return;
    }

    if (emailError) {
      showFormMessage(emailError);
      return;
    }

    clearFormMessage();
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    dispatch(forgotPasswordOtp({ email }));
  };

  const handleResetPassword = () => {
    const emailError = validateEmailInput(email);
    const passwordError = validatePasswordInput(newPassword, "New password");

    if (!email || !otp || !newPassword || !confirmPassword) {
      showFormMessage("All fields are required");
      return;
    }

    if (emailError) {
      showFormMessage(emailError);
      return;
    }

    if (!/^\d{6}$/.test(otp.trim())) {
      showFormMessage("OTP must be a 6-digit code");
      return;
    }

    if (passwordError) {
      showFormMessage(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      showFormMessage("Passwords do not match");
      return;
    }

    clearFormMessage();
    dispatch(
      resetPasswordWithOtp({
        email,
        otp: otp.trim(),
        newPassword
      })
    ).then((action) => {
      if (resetPasswordWithOtp.fulfilled.match(action)) {
        setOtp("");
        setNewPassword("");
        setConfirmPassword("");
      }
    });
  };

  useEffect(() => {
    if (authState.loggedIn && authState.token) {
      router.push("/dashboard");
    }
  }, [authState.loggedIn, authState.token, router]);

  useEffect(() => {
    if (getAccessToken()) {
      router.push("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    dispatch(resetForgotPasswordFlow());
  }, [authMode, dispatch]);

  return (
    <UserLayout>
      <div className={styles.container}>
        <div className={styles.cardContainer}>
          <div className={styles.cardContainer__left}>
            <p className={styles.cardleft_heading}>{modeTitle}</p>
            <p className={styles.modeDescription}>{modeDescription}</p>

            <p
              style={{
                color: visibleFormMessage
                  ? "red"
                  : authState.isError
                  ? "red"
                  : authState.isSuccess
                  ? "green"
                  : "#344054"
              }}
            >
              {visibleFormMessage || authState?.message?.message || authState.message}
            </p>

            {authMode === "forgot" && authState.devOtp && (
              <p
                style={{
                  marginTop: "12px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "#eef6ff",
                  color: "#0a66c2",
                  fontWeight: 600
                }}
              >
                Development OTP: {authState.devOtp}
              </p>
            )}

            <div className={styles.inputContainers}>
              {authMode === "signup" && (
                <>
                  <input
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    className={styles.inputField}
                    type="text"
                    placeholder="Username"
                  />

                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={styles.inputField}
                    type="text"
                    placeholder="Full Name"
                  />
                </>
              )}

              <input
                value={email}
                onChange={(event) => setEmailAddress(event.target.value)}
                className={styles.inputField}
                type="email"
                placeholder="Email"
                autoComplete="email"
              />

              {authMode !== "forgot" && (
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={styles.inputField}
                  type="password"
                  placeholder="Password"
                  autoComplete={
                    authMode === "signup" ? "new-password" : "current-password"
                  }
                />
              )}

              {authMode === "forgot" && authState.otpRequested && (
                <>
                  <input
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className={styles.inputField}
                    type="text"
                    placeholder="Enter OTP"
                    inputMode="numeric"
                    maxLength={6}
                  />

                  <input
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className={styles.inputField}
                    type="password"
                    placeholder="New Password"
                    autoComplete="new-password"
                  />

                  <input
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={styles.inputField}
                    type="password"
                    placeholder="Confirm New Password"
                    autoComplete="new-password"
                  />
                </>
              )}
            </div>

            <div className={styles.inputContainers}>
              {authMode === "signup" && (
                <div onClick={handleRegister} className={styles.buttonWithOutline}>
                  <p>Sign Up</p>
                </div>
              )}

              {authMode === "signin" && (
                <>
                  <div onClick={handleLogin} className={styles.buttonWithOutline}>
                    <p>Sign In</p>
                  </div>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => setAuthMode("forgot")}
                  >
                    Forgot password?
                  </button>
                </>
              )}

              {authMode === "forgot" && !authState.otpRequested && (
                <div onClick={handleForgotPassword} className={styles.buttonWithOutline}>
                  <p>{authState.authFlowLoading ? "Sending OTP..." : "Send OTP"}</p>
                </div>
              )}

              {authMode === "forgot" && authState.otpRequested && (
                <div onClick={handleResetPassword} className={styles.buttonWithOutline}>
                  <p>{authState.authFlowLoading ? "Resetting..." : "Reset Password"}</p>
                </div>
              )}
            </div>
          </div>

          <div className={styles.cardContainer__right}>
            <div className={styles.modePanel}>
              <p className={styles.modePanelTitle}>Choose the right option</p>

              {modeOptions.map((option) => (
                <div
                  key={option.mode}
                  onClick={() => setAuthMode(option.mode)}
                  className={`${styles.modeButton} ${
                    authMode === option.mode
                      ? styles.buttonSolid
                      : styles.buttonWithOutline
                  }`}
                  aria-current={authMode === option.mode ? "page" : undefined}
                >
                  <span className={styles.modeButtonPrompt}>{option.prompt}</span>
                  <p className={styles.modeButtonLabel}>{option.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}

export default LoginComponent;
