const COMMON_DOMAIN_TYPOS = {
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahoo.co": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "outlok.com": "outlook.com",
  "outllok.com": "outlook.com",
  "hotnail.com": "hotmail.com",
  "hotmial.com": "hotmail.com",
  "icloud.con": "icloud.com"
};

const BASIC_EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

export const validateEmailAddress = (email) => {
  const normalizedEmail = (email || "").trim().toLowerCase();

  if (!normalizedEmail) {
    return {
      isValid: false,
      normalizedEmail,
      message: "Email is required"
    };
  }

  if (
    normalizedEmail.length > 254 ||
    !BASIC_EMAIL_PATTERN.test(normalizedEmail) ||
    normalizedEmail.includes("..")
  ) {
    return {
      isValid: false,
      normalizedEmail,
      message: "Enter a valid email address such as name@gmail.com or name@yahoo.com"
    };
  }

  const [localPart, domain] = normalizedEmail.split("@");

  if (
    !localPart ||
    !domain ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    domain.startsWith("-") ||
    domain.endsWith("-")
  ) {
    return {
      isValid: false,
      normalizedEmail,
      message: "Enter a valid email address such as name@gmail.com or name@yahoo.com"
    };
  }

  const domainParts = domain.split(".");

  if (
    domainParts.some(
      (part) => !part || part.length > 63 || part.startsWith("-") || part.endsWith("-")
    ) ||
    domainParts[domainParts.length - 1].length < 2
  ) {
    return {
      isValid: false,
      normalizedEmail,
      message: "Enter a valid email address such as name@gmail.com or name@yahoo.com"
    };
  }

  if (COMMON_DOMAIN_TYPOS[domain]) {
    return {
      isValid: false,
      normalizedEmail,
      message: `Email domain looks mistyped. Did you mean ${localPart}@${COMMON_DOMAIN_TYPOS[domain]}?`
    };
  }

  return {
    isValid: true,
    normalizedEmail,
    message: ""
  };
};

export const validateUsername = (username) => {
  const normalizedUsername = (username || "").trim();

  if (!normalizedUsername) {
    return {
      isValid: false,
      normalizedUsername,
      message: "Username is required"
    };
  }

  if (!/^[a-zA-Z0-9._-]{3,30}$/.test(normalizedUsername)) {
    return {
      isValid: false,
      normalizedUsername,
      message:
        "Username must be 3 to 30 characters and may only include letters, numbers, dots, underscores, or hyphens"
    };
  }

  return {
    isValid: true,
    normalizedUsername,
    message: ""
  };
};

export const validateName = (name) => {
  const normalizedName = (name || "").trim();

  if (!normalizedName) {
    return {
      isValid: false,
      normalizedName,
      message: "Full name is required"
    };
  }

  if (normalizedName.length < 2 || normalizedName.length > 80) {
    return {
      isValid: false,
      normalizedName,
      message: "Full name must be between 2 and 80 characters"
    };
  }

  return {
    isValid: true,
    normalizedName,
    message: ""
  };
};

export const validatePasswordStrength = (password, { label = "Password" } = {}) => {
  const value = password || "";

  if (!value) {
    return {
      isValid: false,
      message: `${label} is required`
    };
  }

  if (value.length < 8) {
    return {
      isValid: false,
      message: `${label} must be at least 8 characters long`
    };
  }

  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return {
      isValid: false,
      message: `${label} must include at least one uppercase letter, one lowercase letter, and one number`
    };
  }

  return {
    isValid: true,
    message: ""
  };
};
