"use client"
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as DocumentPicker from "expo-document-picker"
import { useTranslation } from "../i18n/useTranslation"

const SettingsScreen = ({ navigation }) => {
  const { userSettings, updateSettings, exportData, importData } = useAppContext()
  const { t } = useTranslation()

  const toggleSetting = (key) => {
    updateSettings({ [key]: !userSettings[key] })
  }

  const handleMultiButtonModeChange = () => {
    const newMode = userSettings.multiButtonMode === "full" ? "simple" : "full"
    updateSettings({ multiButtonMode: newMode })
  }

  const handleFirstDayOfWeekChange = () => {
    const newDay = userSettings.firstDayOfWeek === "Mon" ? "Sun" : "Mon"
    updateSettings({ firstDayOfWeek: newDay })
  }

  const handleTimeFormatChange = () => {
    const newFormat = userSettings.timeFormat === "24h" ? "12h" : "24h"
    updateSettings({ timeFormat: newFormat })
  }

  const handleChangeShiftReminderModeChange = () => {
    const modes = ["ask_weekly", "rotate", "disabled"]
    const currentIndex = modes.indexOf(userSettings.changeShiftReminderMode)
    const newIndex = (currentIndex + 1) % modes.length
    updateSettings({ changeShiftReminderMode: modes[newIndex] })
  }

  const handleLanguageChange = () => {
    const newLanguage = userSettings.language === "vi" ? "en" : "vi"
    updateSettings({ language: newLanguage })
  }

  const handleThemeChange = () => {
    const newTheme = userSettings.theme === "light" ? "dark" : "light"
    updateSettings({ theme: newTheme })
  }

  const handleExportData = async () => {
    try {
      const data = await exportData()
      const fileName = `attendo_backup_${new Date().toISOString().split("T")[0]}.json`
      const filePath = `${FileSystem.documentDirectory}${fileName}`

      await FileSystem.writeAsStringAsync(filePath, data)

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath)
      } else {
        Alert.alert(t("backup.sharingNotAvailable"), t("backup.sharingNotAvailableMessage"))
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      Alert.alert(t("common.error"), t("backup.exportError"))
    }
  }

  const handleImportData = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      })

      if (result.type === "success") {
        const fileContent = await FileSystem.readAsStringAsync(result.uri)

        Alert.alert(t("backup.confirmRestore"), t("backup.confirmRestoreMessage"), [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("backup.importData"),
            onPress: async () => {
              try {
                await importData(fileContent)
                Alert.alert(t("common.success"), t("backup.importSuccess"))
              } catch (error) {
                console.error("Error importing data:", error)
                Alert.alert(t("common.error"), t("backup.importError"))
              }
            },
          },
        ])
      }
    } catch (error) {
      console.error("Error picking document:", error)
      Alert.alert(t("common.error"), t("backup.importError"))
    }
  }

  const renderSwitchSetting = (title, key, description = "") => (
    <View style={styles.settingItem}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={userSettings[key]}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
        thumbColor={userSettings[key] ? COLORS.accent : COLORS.white}
      />
    </View>
  )

  const renderChoiceSetting = (title, value, onPress, description = "") => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      <View style={styles.choiceValue}>
        <Text style={styles.choiceText}>{value}</Text>
        <MaterialIcons name="chevron-right" size={24} color={COLORS.gray} />
      </View>
    </TouchableOpacity>
  )

  const renderActionSetting = (title, icon, onPress, description = "") => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {description ? <Text style={styles.settingDescription}>{description}</Text> : null}
      </View>
      <MaterialIcons name={icon} size={24} color={COLORS.primary} />
    </TouchableOpacity>
  )

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.interface")}</Text>

        {renderChoiceSetting(
          t("settings.multiButtonMode"),
          userSettings.multiButtonMode === "full" ? t("settings.options.full") : t("settings.options.simple"),
          handleMultiButtonModeChange,
          t("settings.descriptions.multiButton"),
        )}

        {renderChoiceSetting(
          t("settings.firstDayOfWeek"),
          userSettings.firstDayOfWeek === "Mon" ? t("settings.options.monday") : t("settings.options.sunday"),
          handleFirstDayOfWeekChange,
        )}

        {renderChoiceSetting(
          t("settings.timeFormat"),
          userSettings.timeFormat === "24h" ? t("settings.options.hour24") : t("settings.options.hour12"),
          handleTimeFormatChange,
        )}

        {renderChoiceSetting(
          t("settings.theme"),
          userSettings.theme === "light" ? t("settings.options.light") : t("settings.options.dark"),
          handleThemeChange,
        )}
        {renderChoiceSetting(
          t("settings.onlyGoWorkMode"),
          userSettings.onlyGoWorkMode ? t("settings.options.enabled") : t("settings.options.disabled"),
          () => {
            updateSettings({ onlyGoWorkMode: !userSettings.onlyGoWorkMode })
          },
          t("settings.descriptions.onlyGoWorkMode"),
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.notifications")}</Text>

        {renderSwitchSetting(t("settings.alarmSound"), "alarmSoundEnabled", t("settings.descriptions.alarmSound"))}

        {renderSwitchSetting(
          t("settings.alarmVibration"),
          "alarmVibrationEnabled",
          t("settings.descriptions.alarmVibration"),
        )}

        {renderChoiceSetting(
          t("settings.shiftChangeReminder"),
          userSettings.changeShiftReminderMode === "ask_weekly"
            ? t("settings.options.askWeekly")
            : userSettings.changeShiftReminderMode === "rotate"
              ? t("settings.options.autoRotate")
              : t("settings.options.disabled"),
          handleChangeShiftReminderModeChange,
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.weather")}</Text>

        {renderSwitchSetting(
          t("settings.weatherWarning"),
          "weatherWarningEnabled",
          t("settings.descriptions.weatherWarning"),
        )}

        {renderActionSetting(
          t("settings.updateLocation"),
          "location-on",
          () => {
            // This would typically use geolocation
            Alert.alert(t("common.notification"), t("settings.descriptions.updateLocation"))
          },
          t("settings.descriptions.updateLocation"),
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.data")}</Text>

        {renderActionSetting(
          t("settings.backupData"),
          "backup",
          handleExportData,
          t("settings.descriptions.backupData"),
        )}

        {renderActionSetting(
          t("settings.restoreData"),
          "restore",
          handleImportData,
          t("settings.descriptions.restoreData"),
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("settings.other")}</Text>

        {renderChoiceSetting(
          t("settings.language"),
          userSettings.language === "vi" ? t("settings.options.vietnamese") : t("settings.options.english"),
          handleLanguageChange,
        )}

        {renderActionSetting(t("settings.about"), "info", () => {
          Alert.alert(t("common.appName"), "Phiên bản 1.0.0\n\nỨng dụng quản lý lịch trình ca làm việc cá nhân.")
        })}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    marginVertical: 8,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    overflow: "hidden",
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    color: COLORS.text,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    color: COLORS.text,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  choiceValue: {
    flexDirection: "row",
    alignItems: "center",
  },
  choiceText: {
    color: COLORS.primary,
    marginRight: 4,
  },
})

export default SettingsScreen
