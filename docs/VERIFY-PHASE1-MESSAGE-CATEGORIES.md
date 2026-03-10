# How to verify Phase 1: Message categories

Use this checklist to confirm the new category UI is visible and working.

## Prerequisites

- App running: from `next-app` run `npm run dev`, then open **http://localhost:3000**

---

## 1. Teacher messages

1. Log in as **Teacher** (ID: `teacher`, PIN: `5678`).
2. Go to **Messages** (sidebar or bottom nav “Messages”).
3. Click **any student** in the list so the chat opens on the right (or full screen on mobile).
4. You should see:
   - **Filter bar** under the chat header: label “Filter by category” and a dropdown (All, General, Question, Weekly report, etc.).
   - **Message input row**: a **Category** dropdown (General, Question, …) to the left of the text input, then the input, then the send button.
5. Send a message with category **Question**. The message should appear; if you change the filter to “Question”, only that message should stay visible.
6. (Optional) In DevTools, search for `data-testid="teacher-message-category-filter"` and `data-testid="teacher-send-category"` to confirm the new elements are in the DOM.

---

## 2. Student chat

1. Log out or use an incognito window. Log in as **Student** (choose a student, PIN as set for that student, e.g. `1234`).
2. Go to **Chat / Messages** (e.g. from dashboard or bottom nav).
3. You should see:
   - **Category** dropdown next to the message input (General, Question, Weekly report, etc.), then the text field, then the Send button.
4. Send a message with a non‑General category (e.g. **Help request**). The message bubble can show a small **category badge** above the text (e.g. “Help request”) when the category is not General.
5. (Optional) In DevTools, search for `data-testid="student-send-category"` to confirm the dropdown is in the DOM.

---

## 3. Backward compatibility

- Old messages (no category in the database) should still show and not crash.
- They should appear as “General” (no badge) and remain visible when filter is “All”.

---

## If something is not visible

- Hard refresh (Ctrl+F5 or Cmd+Shift+R).
- Confirm you are on the **Messages** screen and (for teacher) that **a student is selected**; the category filter and send category dropdown only appear when the chat is open.
- Check the browser console for errors.
- Confirm you are on the latest code (Phase 1 changes in `teacher/messages/page.tsx`, `student/chat/page.tsx`, and `messaging.css`).
