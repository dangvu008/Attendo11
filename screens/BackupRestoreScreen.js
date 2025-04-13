"use client"

import { useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import * as FileSystem from "expo-file-system"
import * as Sharing from "expo-sharing"
import * as DocumentPicker from "expo-document-picker"

const BackupRestoreScreen = () => {
  const { exportData, importData } = useAppContext()
  const [loading, setLoading] = useState(false)

  const handleExportData = async () => {
    try {
      setLoading(true)
      const data = await exportData()
      const fileName = `attendo_backup_${new Date().toISOString().split("T")[0]}.json`
      const filePath = `${FileSystem.documentDirectory}${fileName}`

      await FileSystem.writeAsStringAsync(filePath, data)

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath)
      } else {
        Alert.alert("Chia sẻ không khả dụng", "Thiết bị của bạn không hỗ trợ chia sẻ tệp.")
      }
    } catch (error) {
      console.error("Error exporting data:", error)
      Alert.alert("Lỗi", "Không thể xuất dữ liệu. Vui lòng thử lại sau.")
    } finally {
      setLoading(false)
    }
  }

  const handleImportData = async () => {
    try {
      setLoading(true)
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      })

      if (result.type === "success") {
        const fileContent = await FileSystem.readAsStringAsync(result.uri)

        Alert.alert("Xác nhận nhập dữ liệu", "Dữ liệu hiện tại sẽ bị ghi đè. Bạn có chắc chắn muốn tiếp tục?", [
          { text: "Hủy", style: "cancel" },
          {
            text: "Nhập",
            onPress: async () => {
              try {
                await importData(fileContent)
                Alert.alert("Thành công", "Dữ liệu đã được nhập thành công.")
              } catch (error) {
                console.error("Error importing data:", error)
                Alert.alert("Lỗi", "Không thể nhập dữ liệu. Tệp có thể bị hỏng hoặc không đúng định dạng.")
              } finally {
                setLoading(false)
              }
            },
          },
        ])
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error("Error picking document:", error)
      Alert.alert("Lỗi", "Không thể chọn tệp. Vui lòng thử lại sau.")
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang xử lý...</Text>
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sao lưu dữ liệu</Text>
            <Text style={styles.sectionDescription}>
              Xuất dữ liệu của bạn để sao lưu hoặc chuyển sang thiết bị khác. Tệp sao lưu sẽ bao gồm tất cả cài đặt, ca
              làm việc, dữ liệu chấm công và ghi chú.
            </Text>
            <TouchableOpacity style={styles.actionButton} onPress={handleExportData}>
              <MaterialIcons name="backup" size={24} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Xuất dữ liệu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phục hồi dữ liệu</Text>
            <Text style={styles.sectionDescription}>
              Nhập dữ liệu từ tệp sao lưu đã xuất trước đó. Lưu ý: Dữ liệu hiện tại sẽ bị ghi đè khi bạn nhập dữ liệu
              mới.
            </Text>
            <TouchableOpacity style={[styles.actionButton, styles.restoreButton]} onPress={handleImportData}>
              <MaterialIcons name="restore" size={24} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Nhập dữ liệu</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.warningSection}>
            <MaterialIcons name="warning" size={24} color={COLORS.warning} />
            <Text style={styles.warningText}>
              Hãy sao lưu dữ liệu thường xuyên để tránh mất dữ liệu khi thay đổi thiết bị hoặc gỡ cài đặt ứng dụng.
            </Text>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.darkGray,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: COLORS.text,
  },
  sectionDescription: {
    color: COLORS.darkGray,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButton: {
    backgroundColor: COLORS.accent,
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
    marginLeft: 8,
  },
  warningSection: {
    backgroundColor: COLORS.warning + "20",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  warningText: {
    marginLeft: 8,
    color: COLORS.darkGray,
    flex: 1,
  },
})

export default BackupRestoreScreen
