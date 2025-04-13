"use client"

import { useState, useEffect } from "react"
import { NavigationContainer } from "@react-navigation/native"
import { createStackNavigator } from "@react-navigation/stack"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { AppProvider } from "./context/AppContext"
import HomeScreen from "./screens/HomeScreen"
import ShiftListScreen from "./screens/ShiftListScreen"
import ShiftDetailScreen from "./screens/ShiftDetailScreen"
import SettingsScreen from "./screens/SettingsScreen"
import CheckInOutScreen from "./screens/CheckInOutScreen"
import WeatherScreen from "./screens/WeatherScreen"
import BackupRestoreScreen from "./screens/BackupRestoreScreen"
import NotesScreen from "./screens/NotesScreen"
import { COLORS } from "./constants/colors"
import { initI18n } from "./i18n/i18n"
import { useTranslation } from "./i18n/useTranslation"
import { View, Text, ActivityIndicator } from "react-native"
import { MaterialIcons } from "@expo/vector-icons"

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

// Component tạm thời hiển thị khi đang tải i18n
const LoadingScreen = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
    <Text style={{ marginTop: 16, color: COLORS.darkGray }}>Đang tải ứng dụng...</Text>
  </View>
)

// Stack Navigator cho Home
const HomeStack = () => {
  const { t } = useTranslation()
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ title: t("common.appName") }} />
      <Stack.Screen
        name="CheckInOut"
        component={CheckInOutScreen}
        options={{ title: `${t("attendance.checkIn")} / ${t("attendance.checkOut")}` }}
      />
    </Stack.Navigator>
  )
}

// Stack Navigator cho Shifts
const ShiftsStack = () => {
  const { t } = useTranslation()
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen name="ShiftList" component={ShiftListScreen} options={{ title: t("shifts.shiftList") }} />
      <Stack.Screen
        name="ShiftDetail"
        component={ShiftDetailScreen}
        options={({ route }) => ({
          title: route.params?.isNew ? t("shifts.addShift") : t("shifts.shiftDetails"),
        })}
      />
    </Stack.Navigator>
  )
}

// Stack Navigator cho Settings
const SettingsStack = () => {
  const { t } = useTranslation()
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primary,
        },
        headerTintColor: COLORS.white,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen name="SettingsScreen" component={SettingsScreen} options={{ title: t("settings.settings") }} />
      <Stack.Screen
        name="BackupRestore"
        component={BackupRestoreScreen}
        options={{ title: t("backup.backupRestore") }}
      />
    </Stack.Navigator>
  )
}

// Tab Navigator
const TabNavigator = () => {
  const { t } = useTranslation()
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.lightGray,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t("common.appName"),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Shifts"
        component={ShiftsStack}
        options={{
          tabBarLabel: t("shifts.shiftList"),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="work" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          tabBarLabel: t("notes.notes"),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="note" size={size} color={color} />,
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerShown: true,
          title: t("notes.notes"),
        }}
      />
      <Tab.Screen
        name="Weather"
        component={WeatherScreen}
        options={{
          tabBarLabel: t("weather.weather"),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="cloud" size={size} color={color} />,
          headerStyle: {
            backgroundColor: COLORS.primary,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: "bold",
          },
          headerShown: true,
          title: t("weather.weather"),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStack}
        options={{
          tabBarLabel: t("settings.settings"),
          tabBarIcon: ({ color, size }) => <MaterialIcons name="settings" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}

// Component chính sau khi đã tải i18n
const AppWithNavigation = () => {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <TabNavigator />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  )
}

// Component gốc của ứng dụng
export default function App() {
  const [i18nInitialized, setI18nInitialized] = useState(false)

  useEffect(() => {
    // Khởi tạo i18n
    const initialize = async () => {
      await initI18n()
      setI18nInitialized(true)
    }

    initialize()
  }, [])

  // Hiển thị màn hình loading khi đang khởi tạo i18n
  if (!i18nInitialized) {
    return <LoadingScreen />
  }

  // Hiển thị ứng dụng sau khi đã khởi tạo i18n
  return <AppWithNavigation />
}
