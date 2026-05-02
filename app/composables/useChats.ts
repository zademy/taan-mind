import { isToday, isYesterday, subMonths } from 'date-fns'

/** Represents a chat entry displayed in the sidebar navigation. */
export interface UIChat {
  id: string
  label: string
  icon: string
  createdAt: string
}

/**
 * Composable that groups chats by date for sidebar navigation.
 *
 * Categorizes chats into "Today", "Yesterday", "Last week", "Last month",
 * and monthly groups (e.g. "January 2025") for older chats.
 *
 * @param chats - Reactive reference to the list of chats to group.
 * @returns An object containing the computed `groups` array.
 */
export function useChats(chats: Ref<UIChat[] | undefined>) {
  const groups = computed(() => {
    // Bucket definitions for date-based grouping
    const today: UIChat[] = []
    const yesterday: UIChat[] = []
    const lastWeek: UIChat[] = []
    const lastMonth: UIChat[] = []
    const older: Record<string, UIChat[]> = {}

    // Calculate boundary dates for group classification
    const oneWeekAgo = subMonths(new Date(), 0.25) // ~7 days ago
    const oneMonthAgo = subMonths(new Date(), 1)

    chats.value?.forEach(chat => {
      const chatDate = new Date(chat.createdAt)

      if (isToday(chatDate)) {
        today.push(chat)
      } else if (isYesterday(chatDate)) {
        yesterday.push(chat)
      } else if (chatDate >= oneWeekAgo) {
        lastWeek.push(chat)
      } else if (chatDate >= oneMonthAgo) {
        lastMonth.push(chat)
      } else {
        // Format: "January 2023", "February 2023", etc.
        const monthYear = chatDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        })

        if (!older[monthYear]) {
          older[monthYear] = []
        }

        older[monthYear].push(chat)
      }
    })

    // Sort older chats by month-year in descending order (newest first)
    const sortedMonthYears = Object.keys(older).sort((a, b) => {
      const dateA = new Date(a)
      const dateB = new Date(b)
      return dateB.getTime() - dateA.getTime()
    })

    // Build the final ordered list of non-empty groups
    const formattedGroups = [] as Array<{
      id: string
      label: string
      items: Array<UIChat>
    }>

    // Add groups that have chats
    if (today.length) {
      formattedGroups.push({
        id: 'today',
        label: 'Today',
        items: today
      })
    }

    if (yesterday.length) {
      formattedGroups.push({
        id: 'yesterday',
        label: 'Yesterday',
        items: yesterday
      })
    }

    if (lastWeek.length) {
      formattedGroups.push({
        id: 'last-week',
        label: 'Last week',
        items: lastWeek
      })
    }

    if (lastMonth.length) {
      formattedGroups.push({
        id: 'last-month',
        label: 'Last month',
        items: lastMonth
      })
    }

    // Add each month-year group
    sortedMonthYears.forEach(monthYear => {
      if (older[monthYear]?.length) {
        formattedGroups.push({
          id: monthYear,
          label: monthYear,
          items: older[monthYear]
        })
      }
    })

    return formattedGroups
  })

  return {
    groups
  }
}
