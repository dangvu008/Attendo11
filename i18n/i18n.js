import i18next from "i18next"
import { initReactI18next } from "react-i18next"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { STORAGE_KEYS } from "../constants/storage"

import en from "./translations/en"
import vi from "./translations/vi"

// Hàm lấy ngôn ngữ từ AsyncStorage
const getStoredLanguage = async () => {
  try {
    const userSettings = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS)
    if (userSettings) {
      const { language } = JSON.parse(userSettings)
      return language || "vi" // Mặc định là tiếng Việt nếu không có
    }
    return "vi" // Mặc định là tiếng Việt
  } catch (error) {
    console.error("Error getting stored language:", error)
    return "vi" // Mặc định là tiếng Việt nếu có lỗi
  }
}

// Khởi tạo i18next
const initI18n = async () => {
  const language = await getStoredLanguage()

  i18next.use(initReactI18next).init({
    compatibilityJSON: "v3",
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: language,
    fallbackLng: "vi",
    interpolation: {
      escapeValue: false,
    },
  })

  return i18next
}

export { initI18n }
export default i18next
