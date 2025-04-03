"use client"

import { useContext } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useNavigation } from "@react-navigation/native"
import { AppContext } from "../context/AppContext"

/**
 * NotesList Component
 *
 * This component displays a list of notes with options to edit and delete.
 * It includes confirmation dialogs for delete actions to prevent accidental data loss.
 *
 * @param {boolean} darkMode - Whether dark mode is enabled
 */
export default function NotesList({ darkMode }) {
  const { notes, deleteNote, t } = useContext(AppContext)
  const navigation = useNavigation()

  // Sort notes by reminder time
  const sortedNotes = [...notes].sort((a, b) => {
    return new Date(a.reminderTime) - new Date(b.reminderTime)
  })

  // Get only the first 3 notes
  const displayNotes = sortedNotes.slice(0, 3)

  // Format time
  const formatTime = (timeString) => {
    const date = new Date(timeString)
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  // Edit note
  const handleEditNote = (note) => {
    navigation.navigate("AddNote", { note })
  }

  // Delete note with confirmation
  const handleDeleteNote = (noteId, noteTitle) => {
    Alert.alert(
      t("delete_note") || "Delete Note",
      t("delete_note_confirmation", { title: noteTitle }) || `Are you sure you want to delete "${noteTitle}"?`,
      [
        {
          text: t("cancel") || "Cancel",
          style: "cancel",
        },
        {
          text: t("delete") || "Delete",
          onPress: () => {
            deleteNote(noteId)
              .then((success) => {
                if (!success) {
                  Alert.alert(
                    t("error") || "Error",
                    t("error_deleting_note") || "There was an error deleting the note. Please try again.",
                  )
                }
              })
              .catch((error) => {
                console.error("Error deleting note:", error)
                Alert.alert(
                  t("error") || "Error",
                  t("unexpected_error") || "An unexpected error occurred. Please try again.",
                )
              })
          },
          style: "destructive",
        },
      ],
    )
  }

  if (displayNotes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: darkMode ? "#bbb" : "#777" }]}>{t("no_notes")}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {displayNotes.map((note) => (
        <View key={note.id} style={[styles.noteCard, { backgroundColor: darkMode ? "#2d2d2d" : "#f0f0f0" }]}>
          <View style={styles.noteHeader}>
            <Text style={[styles.noteTitle, { color: darkMode ? "#fff" : "#000" }]}>{note.title}</Text>
            <Text style={[styles.noteTime, { color: darkMode ? "#bbb" : "#777" }]}>
              {formatTime(note.reminderTime)}
            </Text>
          </View>
          <Text style={[styles.noteContent, { color: darkMode ? "#bbb" : "#555" }]} numberOfLines={2}>
            {note.content}
          </Text>
          <View style={styles.noteActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditNote(note)}
              accessibilityLabel={t("edit") || "Edit"}
            >
              <Ionicons name="pencil-outline" size={18} color={darkMode ? "#6a5acd" : "#6a5acd"} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteNote(note.id, note.title)}
              accessibilityLabel={t("delete") || "Delete"}
            >
              <Ionicons name="trash-outline" size={18} color={darkMode ? "#ff6b6b" : "#ff6b6b"} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  emptyContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
  },
  noteCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
  },
  noteTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  noteContent: {
    fontSize: 14,
    marginBottom: 8,
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
})

