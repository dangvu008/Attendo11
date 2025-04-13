"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native"
import { useAppContext } from "../context/AppContext"
import { COLORS } from "../constants/colors"
import { MaterialIcons } from "@expo/vector-icons"
import NoteItem from "../components/NoteItem"
import NoteForm from "../components/NoteForm"
import { useTranslation } from "../i18n/useTranslation"

const NotesScreen = () => {
  const { notes, deleteNote, getNextReminderDate } = useAppContext()
  const { t } = useTranslation()

  const [showNoteForm, setShowNoteForm] = useState(false)
  const [noteToEdit, setNoteToEdit] = useState(null)
  const [sortedNotes, setSortedNotes] = useState([])

  // Sắp xếp ghi chú theo thời gian nhắc nhở gần nhất
  useEffect(() => {
    const sortNotes = () => {
      const sorted = [...notes].sort((a, b) => {
        const dateA = getNextReminderDate(a)
        const dateB = getNextReminderDate(b)

        // Nếu không có ngày nhắc nhở, sắp xếp theo updatedAt
        if (!dateA && !dateB) {
          return new Date(b.updatedAt) - new Date(a.updatedAt)
        }
        if (!dateA) return 1
        if (!dateB) return -1

        return dateA.getTime() - dateB.getTime()
      })

      setSortedNotes(sorted)
    }

    sortNotes()
  }, [notes, getNextReminderDate])

  // Xử lý thêm ghi chú mới
  const handleAddNote = () => {
    setNoteToEdit(null)
    setShowNoteForm(true)
  }

  // Xử lý sửa ghi chú
  const handleEditNote = (note) => {
    setNoteToEdit(note)
    setShowNoteForm(true)
  }

  // Xử lý xóa ghi chú
  const handleDeleteNote = (note) => {
    Alert.alert(t("common.confirm"), t("notes.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        onPress: () => deleteNote(note.id),
        style: "destructive",
      },
    ])
  }

  // Render item cho FlatList
  const renderNoteItem = ({ item }) => <NoteItem note={item} onEdit={handleEditNote} onDelete={handleDeleteNote} />

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedNotes}
        renderItem={renderNoteItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t("notes.noNotes")}</Text>
            <Text style={styles.emptySubText}>{t("notes.addNotePrompt")}</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={handleAddNote}>
        <MaterialIcons name="add" size={24} color={COLORS.white} />
      </TouchableOpacity>

      <NoteForm
        visible={showNoteForm}
        onClose={() => {
          setShowNoteForm(false)
          setNoteToEdit(null)
        }}
        noteToEdit={noteToEdit}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.darkGray,
    marginBottom: 8,
  },
  emptySubText: {
    color: COLORS.gray,
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
})

export default NotesScreen
