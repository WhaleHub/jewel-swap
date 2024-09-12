import { useEffect, useState } from "react";

const useLocalStorage = (key: string) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  });

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        setStoredValue(event.newValue ? JSON.parse(event.newValue) : null);
      }
    };

    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail.key === key) {
        setStoredValue(event.detail.value);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // @ts-ignore
    window.addEventListener("localStorageUpdate", handleCustomStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      // @ts-ignore
      window.removeEventListener(
        "localStorageUpdate",
        handleCustomStorageChange
      );
    };
  }, [key]);

  return storedValue;
};

const updateLocalStorage = (key: any, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
  const event = new CustomEvent("localStorageUpdate", {
    detail: { key, value },
  });
  window.dispatchEvent(event);
};

export { useLocalStorage, updateLocalStorage };
