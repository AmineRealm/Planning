// Global variables
let currentWeekStart = new Date()
currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1) // Set to Monday of current week
let interventions = JSON.parse(localStorage.getItem("interventions")) || []
let currentInterventionId = null
let isDuplicating = false

// DOM elements
const planningTable = document.getElementById("planning-table")
const dateRangeElement = document.getElementById("date-range")
const prevWeekBtn = document.getElementById("prev-week")
const nextWeekBtn = document.getElementById("next-week")
const currentWeekBtn = document.getElementById("current-week")
const addInterventionBtn = document.getElementById("add-intervention")
const duplicateWeekBtn = document.getElementById("duplicate-week")
const interventionModal = document.getElementById("intervention-modal")
const duplicateWeekModal = document.getElementById("duplicate-week-modal")
const confirmModal = document.getElementById("confirm-modal")
const modalTitle = document.getElementById("modal-title")
const interventionForm = document.getElementById("intervention-form")
const duplicateWeekForm = document.getElementById("duplicate-week-form")
const closeModalBtns = document.querySelectorAll(".close")
const cancelBtns = document.querySelectorAll(".btn-cancel")
const confirmDeleteBtn = document.getElementById("confirm-delete")
const cancelDeleteBtn = document.getElementById("cancel-delete")
const timeSlotSelect = document.getElementById("time-slot")
const customTimeContainer = document.getElementById("custom-time-container")
const duplicationOptions = document.getElementById("duplication-options")

// Initialize the application
function init() {
  renderPlanning()
  setupEventListeners()
}

// Set up event listeners
function setupEventListeners() {
  prevWeekBtn.addEventListener("click", navigateToPreviousWeek)
  nextWeekBtn.addEventListener("click", navigateToNextWeek)
  currentWeekBtn.addEventListener("click", navigateToCurrentWeek)
  addInterventionBtn.addEventListener("click", openAddInterventionModal)
  duplicateWeekBtn.addEventListener("click", openDuplicateWeekModal)

  closeModalBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeAllModals()
    })
  })

  cancelBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      closeAllModals()
    })
  })

  interventionForm.addEventListener("submit", saveIntervention)
  duplicateWeekForm.addEventListener("submit", duplicateWeek)
  cancelDeleteBtn.addEventListener("click", closeConfirmModal)
  confirmDeleteBtn.addEventListener("click", deleteConfirmedIntervention)
  timeSlotSelect.addEventListener("change", toggleCustomTimeField)

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === interventionModal || e.target === duplicateWeekModal || e.target === confirmModal) {
      closeAllModals()
    }
  })
}

// Close all modals
function closeAllModals() {
  interventionModal.style.display = "none"
  duplicateWeekModal.style.display = "none"
  confirmModal.style.display = "none"
  isDuplicating = false
}

// Toggle custom time field visibility
function toggleCustomTimeField() {
  if (timeSlotSelect.value === "custom") {
    customTimeContainer.style.display = "block"
  } else {
    customTimeContainer.style.display = "none"
  }
}

// Format date as DD/MM/YYYY
function formatDate(date) {
  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Update the date range display
function updateDateRange() {
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  dateRangeElement.textContent = `${formatDate(currentWeekStart)} au ${formatDate(weekEnd)}`
}

// Navigate to previous week
function navigateToPreviousWeek() {
  currentWeekStart.setDate(currentWeekStart.getDate() - 7)
  renderPlanning()
}

// Navigate to next week
function navigateToNextWeek() {
  currentWeekStart.setDate(currentWeekStart.getDate() + 7)
  renderPlanning()
}

// Navigate to current week
function navigateToCurrentWeek() {
  const today = new Date()
  currentWeekStart = new Date(today)
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1) // Set to Monday of current week
  renderPlanning()
}

// Render the planning table
function renderPlanning() {
  updateDateRange()

  // Create table structure
  let tableHTML = '<table class="planning">'

  // Create header row with days of the week
  tableHTML += "<tr><th>Heure</th>"

  const daysOfWeek = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
  const currentWeekDates = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart)
    date.setDate(date.getDate() + i)
    currentWeekDates.push(date)

    const dayNumber = date.getDate()
    tableHTML += `<th class="day-header">${daysOfWeek[i]} ${dayNumber}</th>`
  }

  tableHTML += "</tr>"

  // Create rows for morning and afternoon
  const timeSlots = ["Matin", "Après-midi"]

  timeSlots.forEach((timeSlot) => {
    tableHTML += `<tr><td>${timeSlot}</td>`

    for (let i = 0; i < 7; i++) {
      const dayInterventions = getInterventionsForDayAndTime(i, timeSlot.toLowerCase())
      tableHTML += `<td class="day-cell" data-day="${i}" data-time="${timeSlot.toLowerCase()}">`

      dayInterventions.forEach((intervention) => {
        tableHTML += createInterventionCard(intervention)
      })

      tableHTML += "</td>"
    }

    tableHTML += "</tr>"
  })

  tableHTML += "</table>"
  planningTable.innerHTML = tableHTML

  // Add event listeners to edit, delete and duplicate buttons
  document.querySelectorAll(".btn-edit").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const interventionId = e.target.closest(".intervention-card").dataset.id
      openEditInterventionModal(interventionId)
    })
  })

  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const interventionId = e.target.closest(".intervention-card").dataset.id
      openConfirmDeleteModal(interventionId)
    })
  })

  document.querySelectorAll(".btn-duplicate").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const interventionId = e.target.closest(".intervention-card").dataset.id
      openDuplicateInterventionModal(interventionId)
    })
  })
}

// Get interventions for a specific day and time slot
function getInterventionsForDayAndTime(dayIndex, timeSlot) {
  const weekStart = new Date(currentWeekStart)
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return interventions.filter((intervention) => {
    const interventionDate = new Date(intervention.date)
    const isInCurrentWeek = interventionDate >= weekStart && interventionDate <= weekEnd
    const isDayMatch = interventionDate.getDay() === (dayIndex + 1) % 7 // Convert to JS day (0 = Sunday)

    let isTimeMatch = false
    if (timeSlot === "matin" && intervention.timeSlot === "matin") {
      isTimeMatch = true
    } else if (
      timeSlot === "après-midi" &&
      (intervention.timeSlot === "aprem" || intervention.timeSlot === "après-midi")
    ) {
      isTimeMatch = true
    } else if (intervention.timeSlot === "journee") {
      isTimeMatch = true
    }

    return isInCurrentWeek && isDayMatch && isTimeMatch
  })
}

// Get all interventions for the current week
function getCurrentWeekInterventions() {
  const weekStart = new Date(currentWeekStart)
  const weekEnd = new Date(currentWeekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  return interventions.filter((intervention) => {
    const interventionDate = new Date(intervention.date)
    return interventionDate >= weekStart && interventionDate <= weekEnd
  })
}

// Create HTML for an intervention card
function createInterventionCard(intervention) {
  const typeClass = intervention.type || "default"
  let timeDisplay = ""

  if (intervention.timeSlot === "matin") {
    timeDisplay = "Matin"
  } else if (intervention.timeSlot === "aprem" || intervention.timeSlot === "après-midi") {
    timeDisplay = "Après-midi"
  } else if (intervention.timeSlot === "journee") {
    timeDisplay = "Journée"
  } else if (intervention.timeSlot === "custom" && intervention.customTime) {
    timeDisplay = intervention.customTime
  }

  // Format the intervention date for display
  const interventionDate = new Date(intervention.date)
  const dateDisplay = formatDate(interventionDate)

  return `
        <div class="intervention-card ${typeClass}" data-id="${intervention.id}">
            <div class="card-header">
                <div class="organization">${intervention.organization}</div>
                <div class="technicians">${intervention.technicians || ""}</div>
            </div>
            <div class="description">${intervention.description || ""}</div>
            <div class="group-numbers">${intervention.groupNumbers ? "GR " + intervention.groupNumbers : ""}</div>
            <div class="city">${intervention.city || ""}</div>
            <div class="card-footer">
                <div class="intervention-info">
                    <div class="time-slot">${timeDisplay}</div>
                    <div class="intervention-date">${dateDisplay}</div>
                </div>
                <div class="card-actions">
                    <button class="btn-duplicate" title="Dupliquer"><i class="fas fa-copy"></i></button>
                    <button class="btn-edit" title="Modifier"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        </div>
    `
}

// Open modal to add a new intervention
function openAddInterventionModal() {
  modalTitle.textContent = "Ajouter une intervention"
  interventionForm.reset()
  document.getElementById("intervention-date").value = ""
  currentInterventionId = null
  document.getElementById("intervention-id").value = ""
  duplicationOptions.style.display = "none"
  isDuplicating = false
  interventionModal.style.display = "block"
  customTimeContainer.style.display = "none"
}

// Open modal to edit an existing intervention
function openEditInterventionModal(interventionId) {
  const intervention = interventions.find((item) => item.id === interventionId)
  if (!intervention) return

  modalTitle.textContent = "Modifier une intervention"
  currentInterventionId = interventionId
  document.getElementById("intervention-id").value = interventionId
  document.getElementById("organization").value = intervention.organization || ""
  document.getElementById("sector").value = intervention.sector || ""
  document.getElementById("intervention-type").value = intervention.type || ""
  document.getElementById("group-numbers").value = intervention.groupNumbers || ""
  document.getElementById("technicians").value = intervention.technicians || ""
  document.getElementById("city").value = intervention.city || ""
  document.getElementById("description").value = intervention.description || ""

  // Set day value (convert from JS day format if needed)
  const day = intervention.day !== undefined ? intervention.day : new Date(intervention.date).getDay()
  document.getElementById("day").value = day === 0 ? "0" : day.toString()

  document.getElementById("time-slot").value = intervention.timeSlot || "matin"

  // Set the specific date if available
  const dateInput = document.getElementById("intervention-date")
  if (intervention.date) {
    const date = new Date(intervention.date)
    // Format date as YYYY-MM-DD for the input
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    dateInput.value = `${year}-${month}-${day}`
  } else {
    dateInput.value = ""
  }

  if (intervention.timeSlot === "custom") {
    customTimeContainer.style.display = "block"
    document.getElementById("custom-time").value = intervention.customTime || ""
  } else {
    customTimeContainer.style.display = "none"
  }

  duplicationOptions.style.display = "none"
  isDuplicating = false
  interventionModal.style.display = "block"
}

// Open modal to duplicate an existing intervention
function openDuplicateInterventionModal(interventionId) {
  const intervention = interventions.find((item) => item.id === interventionId)
  if (!intervention) return

  modalTitle.textContent = "Dupliquer une intervention"
  currentInterventionId = null // Set to null because we're creating a new intervention
  document.getElementById("intervention-id").value = "" // Clear ID to create a new one
  document.getElementById("organization").value = intervention.organization || ""
  document.getElementById("sector").value = intervention.sector || ""
  document.getElementById("intervention-type").value = intervention.type || ""
  document.getElementById("group-numbers").value = intervention.groupNumbers || ""
  document.getElementById("technicians").value = intervention.technicians || ""
  document.getElementById("city").value = intervention.city || ""
  document.getElementById("description").value = intervention.description || ""

  // Set day value (convert from JS day format if needed)
  const day = intervention.day !== undefined ? intervention.day : new Date(intervention.date).getDay()
  document.getElementById("day").value = day === 0 ? "0" : day.toString()

  document.getElementById("time-slot").value = intervention.timeSlot || "matin"

  // Set the specific date if available
  const dateInput = document.getElementById("intervention-date")
  if (intervention.date) {
    const date = new Date(intervention.date)
    // Format date as YYYY-MM-DD for the input
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const day = date.getDate().toString().padStart(2, "0")
    dateInput.value = `${year}-${month}-${day}`
  } else {
    dateInput.value = ""
  }

  if (intervention.timeSlot === "custom") {
    customTimeContainer.style.display = "block"
    document.getElementById("custom-time").value = intervention.customTime || ""
  } else {
    customTimeContainer.style.display = "none"
  }

  // Show duplication options
  duplicationOptions.style.display = "block"
  isDuplicating = true

  // Reset duplication options
  document.querySelector('input[name="duplication-type"][value="none"]').checked = true
  document.getElementById("duplication-end-date").value = ""
  document.getElementById("duplication-occurrences").value = ""

  interventionModal.style.display = "block"
}

// Open modal to duplicate a week
function openDuplicateWeekModal() {
  duplicateWeekForm.reset()

  // Set default target date to next week
  const nextWeekDate = new Date(currentWeekStart)
  nextWeekDate.setDate(nextWeekDate.getDate() + 7)
  const year = nextWeekDate.getFullYear()
  const month = (nextWeekDate.getMonth() + 1).toString().padStart(2, "0")
  const day = nextWeekDate.getDate().toString().padStart(2, "0")
  document.getElementById("target-week-date").value = `${year}-${month}-${day}`

  duplicateWeekModal.style.display = "block"
}

// Duplicate the current week to a target week
function duplicateWeek(e) {
  e.preventDefault()

  const targetDateStr = document.getElementById("target-week-date").value
  const repeatCount = Number.parseInt(document.getElementById("repeat-count").value) || 1

  if (!targetDateStr) {
    alert("Veuillez sélectionner une date cible pour la duplication.")
    return
  }

  // Get the Monday of the target week
  const targetDate = new Date(targetDateStr)
  const targetWeekStart = new Date(targetDate)
  const dayOfWeek = targetDate.getDay() || 7 // Convert Sunday (0) to 7
  targetWeekStart.setDate(targetDate.getDate() - dayOfWeek + 1) // Set to Monday

  // Get all interventions from the current week
  const weekInterventions = getCurrentWeekInterventions()

  if (weekInterventions.length === 0) {
    alert("Aucune intervention à dupliquer dans la semaine actuelle.")
    return
  }

  const newInterventions = []

  // Create duplicates for each repeat
  for (let r = 0; r < repeatCount; r++) {
    const weekOffset = r * 7 // Days to add for each repeat

    weekInterventions.forEach((intervention) => {
      const originalDate = new Date(intervention.date)
      const dayDiff = (originalDate - currentWeekStart) / (1000 * 60 * 60 * 24) // Difference in days

      const newDate = new Date(targetWeekStart)
      newDate.setDate(newDate.getDate() + dayDiff + weekOffset)

      const newIntervention = {
        ...JSON.parse(JSON.stringify(intervention)), // Deep copy
        id: generateId(),
        date: newDate.toISOString(),
      }

      newInterventions.push(newIntervention)
    })
  }

  // Add the new interventions
  interventions = [...interventions, ...newInterventions]
  saveInterventionsToLocalStorage()

  // Navigate to the target week
  currentWeekStart = new Date(targetWeekStart)
  renderPlanning()
  closeAllModals()

  alert(`${newInterventions.length} interventions ont été dupliquées avec succès.`)
}

// Close the intervention modal
function closeModal() {
  interventionModal.style.display = "none"
  isDuplicating = false
}

// Open confirmation modal for deleting an intervention
function openConfirmDeleteModal(interventionId) {
  currentInterventionId = interventionId
  confirmModal.style.display = "block"
}

// Close the confirmation modal
function closeConfirmModal() {
  confirmModal.style.display = "none"
}

// Delete the confirmed intervention
function deleteConfirmedIntervention() {
  if (currentInterventionId) {
    interventions = interventions.filter((item) => item.id !== currentInterventionId)
    saveInterventionsToLocalStorage()
    renderPlanning()
    closeConfirmModal()
  }
}

// Create recurring interventions based on duplication options
function createRecurringInterventions(baseIntervention, startDate) {
  const duplicationTypeValue = document.querySelector('input[name="duplication-type"]:checked').value
  if (duplicationTypeValue === "none") {
    return [baseIntervention]
  }

  const endDateStr = document.getElementById("duplication-end-date").value
  const occurrences = Number.parseInt(document.getElementById("duplication-occurrences").value) || 0

  let endDate = null
  if (endDateStr) {
    endDate = new Date(endDateStr)
  }

  const maxOccurrences = occurrences || (endDate ? 100 : 10) // Default to 10 if no end criteria

  const recurringInterventions = [baseIntervention]
  const baseDate = new Date(startDate)

  for (let i = 1; i < maxOccurrences; i++) {
    const nextDate = new Date(baseDate)

    // Calculate next date based on duplication type
    switch (duplicationTypeValue) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + i)
        break
      case "weekly":
        nextDate.setDate(nextDate.getDate() + i * 7)
        break
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + i)
        break
      case "yearly":
        nextDate.setFullYear(nextDate.getFullYear() + i)
        break
    }

    // Stop if we've reached the end date
    if (endDate && nextDate > endDate) {
      break
    }

    // Create a new intervention with the calculated date
    const newIntervention = {
      ...JSON.parse(JSON.stringify(baseIntervention)),
      id: generateId(),
      date: nextDate.toISOString(),
      day: nextDate.getDay() === 0 ? 0 : nextDate.getDay(), // Update day of week
    }

    recurringInterventions.push(newIntervention)
  }

  return recurringInterventions
}

// Save intervention data from the form
function saveIntervention(e) {
  e.preventDefault()

  const form = e.target
  const interventionId = document.getElementById("intervention-id").value || generateId()
  const organization = document.getElementById("organization").value
  const sector = document.getElementById("sector").value
  const type = document.getElementById("intervention-type").value
  const groupNumbers = document.getElementById("group-numbers").value
  const technicians = document.getElementById("technicians").value
  const city = document.getElementById("city").value
  const description = document.getElementById("description").value
  const day = Number.parseInt(document.getElementById("day").value)
  const timeSlot = document.getElementById("time-slot").value
  const customTime = document.getElementById("custom-time").value

  // Get the specific date if provided
  const specificDateInput = document.getElementById("intervention-date").value
  let date

  if (specificDateInput) {
    // Use the specific date provided by the user
    date = new Date(specificDateInput)
    // Ensure the date is valid
    if (isNaN(date.getTime())) {
      // If invalid, fall back to calculating from the current week
      date = new Date(currentWeekStart)
      if (day === 0) {
        // Sunday
        date.setDate(date.getDate() + 6)
      } else {
        date.setDate(date.getDate() + day - 1)
      }
    }
  } else {
    // Calculate date from the selected day in the current week
    date = new Date(currentWeekStart)
    if (day === 0) {
      // Sunday
      date.setDate(date.getDate() + 6)
    } else {
      date.setDate(date.getDate() + day - 1)
    }
  }

  const intervention = {
    id: interventionId,
    organization,
    sector,
    type,
    groupNumbers,
    technicians,
    city,
    description,
    day,
    timeSlot,
    customTime: timeSlot === "custom" ? customTime : "",
    date: date.toISOString(),
  }

  // Handle duplication if needed
  if (isDuplicating) {
    const recurringInterventions = createRecurringInterventions(intervention, date)

    // Add all recurring interventions
    interventions = [...interventions, ...recurringInterventions]
  } else {
    // Update existing or add new intervention
    if (currentInterventionId) {
      const index = interventions.findIndex((item) => item.id === currentInterventionId)
      if (index !== -1) {
        interventions[index] = intervention
      }
    } else {
      interventions.push(intervention)
    }
  }

  saveInterventionsToLocalStorage()
  renderPlanning()
  closeAllModals()
}

// Save interventions to local storage
function saveInterventionsToLocalStorage() {
  localStorage.setItem("interventions", JSON.stringify(interventions))
}

// Generate a unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

// Initialize the application when the DOM is loaded
document.addEventListener("DOMContentLoaded", init)

// Add some sample data if no interventions exist
if (interventions.length === 0) {
  // Create dates for this week
  const monday = new Date(currentWeekStart)
  const tuesday = new Date(currentWeekStart)
  tuesday.setDate(tuesday.getDate() + 1)

  // Sample interventions
  interventions = [
    {
      id: generateId(),
      organization: "VALOPHIS - AG Choisy",
      sector: "MS/CA",
      type: "desinsect-desinfect",
      groupNumbers: "1224-1239-1243-1245-1278",
      technicians: "MS/CA",
      city: "CHOISY",
      description: "DS 203 LOGTS + AUDIT DRSOW",
      day: 1, // Monday
      timeSlot: "matin",
      date: monday.toISOString(),
    },
    {
      id: generateId(),
      organization: "VALOPHIS - AG Choisy",
      sector: "MS/CA",
      type: "derat-desouris",
      groupNumbers: "1204",
      technicians: "MS/CA",
      city: "CHOISY",
      description: "DS 49 LOGTS + AUDIT DRSOW",
      day: 1, // Monday
      timeSlot: "matin",
      date: monday.toISOString(),
    },
    {
      id: generateId(),
      organization: "VALOPHIS - AG Choisy",
      sector: "BD/NAP2",
      type: "vo-containers",
      groupNumbers: "1205-1220-1266",
      technicians: "BD/NAP2",
      city: "CHOISY",
      description: "DS 279 LOGTS + AUDIT DRMG",
      day: 1, // Monday
      timeSlot: "matin",
      date: monday.toISOString(),
    },
    {
      id: generateId(),
      organization: "VALOPHIS - AG Choisy",
      sector: "MS/CA",
      type: "ts-te-divers",
      groupNumbers: "1212-1227",
      technicians: "MS/CA",
      city: "CHOISY",
      description: "DS 169 LOGTS + AUDIT DRSOW",
      day: 2, // Tuesday
      timeSlot: "matin",
      date: tuesday.toISOString(),
    },
  ]

  saveInterventionsToLocalStorage()
}
