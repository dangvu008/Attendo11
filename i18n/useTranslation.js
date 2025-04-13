import { useTranslation as useI18nTranslation } from "react-i18next"

export const useTranslation = () => {
  const { t, i18n } = useI18nTranslation()

  // Hàm thay đổi ngôn ngữ
  const changeLanguage = (language) => {
    i18n.changeLanguage(language)
  }

  // Hàm lấy ngôn ngữ hiện tại
  const getCurrentLanguage = () => {
    return i18n.language
  }

  // Hàm dịch với thay thế biến
  const translate = (key, options) => {
    return t(key, options)
  }

  return {
    t: translate,
    changeLanguage,
    getCurrentLanguage,
  }
}
