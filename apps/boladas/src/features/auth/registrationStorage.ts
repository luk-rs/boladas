export const REGISTRATION_STORAGE_KEY = "boladas:registration_data";
export const REGISTRATION_ERROR_KEY = "boladas:registration_error";
export const REGISTRATION_LOCK_KEY = "boladas:registration_lock";

export type PendingRegistrationData = {
  name: string;
  seasonStart: string;
  holidayStart: string;
  gameDefinitions: { dayOfWeek: number; startTime: string }[];
};

export function clearRegistrationErrorAndLock() {
  localStorage.removeItem(REGISTRATION_ERROR_KEY);
  localStorage.removeItem(REGISTRATION_LOCK_KEY);
}

export function clearPendingRegistrationData() {
  localStorage.removeItem(REGISTRATION_STORAGE_KEY);
}

export function clearAllPendingRegistrationStorage() {
  clearPendingRegistrationData();
  clearRegistrationErrorAndLock();
}

export function persistPendingRegistrationData(
  registrationData: PendingRegistrationData,
) {
  clearRegistrationErrorAndLock();
  localStorage.setItem(
    REGISTRATION_STORAGE_KEY,
    JSON.stringify(registrationData),
  );
}
