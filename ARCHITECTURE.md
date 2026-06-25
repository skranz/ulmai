# UlmAI Chat Architecture

## UI Ownership

The chat screen is intentionally client-heavy. R builds a stable HTML shell and loads `inst/www/ulmai-chat.css` and `inst/www/ulmai-chat.js`; the browser owns transient UI state such as draft text, local image previews, message insertion, the thinking placeholder, composer resizing, model selection, and the voice button state.

This keeps the Shiny server focused on work that actually needs R: storing uploaded files, calling the AI backend, and sending the final assistant answer back to the browser.

## R / shinyEvents Boundary

The app uses `eventsApp()` and registers explicit shinyEvents handlers in `uai_register_handlers()`.

- `uai_submit_chat_event`: sent by JavaScript when the user submits a message. The payload includes the text, selected model, client message id, assistant placeholder id, and upload metadata.
- `uai_image_upload`: handled through Shiny's file input binding when the hidden file input changes. The server copies uploaded image files into `main_dir/uploads`.

The fake AI answer still comes from `uai_ask_ai()`. When a real AI backend is added, `uai_handle_chat_submit()` is the main integration point.

## Message Flow

1. JavaScript appends the user message immediately.
2. JavaScript appends an assistant placeholder with the matching `assistantMessageId`.
3. JavaScript sends `uai_submit_chat_event` to Shiny.
4. R calls `uai_ask_ai()`.
5. R calls `window.UlmAI.receiveAssistantMessage(assistantMessageId, answer)`.
6. JavaScript replaces the placeholder text and adds assistant action buttons.

The first assistant message is created through `uai_intro_msg()`. It is currently simple on purpose so it can later become course-, user-, or context-specific.

## Upload Storage

Uploaded images are copied under:

```text
main_dir/uploads/<session-token>/<upload-id>_<clean-file-name>
```

The app exposes `main_dir/uploads` as the Shiny resource path `ulmai-uploads`, so stored files can later be referenced from the browser if needed. The current UI uses local `FileReader` previews immediately and then records the server-side upload id once R confirms storage.

## Current Placeholders

The model selector and voice button are UI-ready but intentionally light. The selected model is included in the submit payload, while voice recording currently only toggles a recording state in the client. Both can be connected to server-side behavior without changing the chat layout.

Assistant messages keep enough client-side metadata to support local action buttons. Copy reads the rendered answer text, while redo resends the saved submit payload and replaces the existing assistant answer when the server returns.

The sidebar is also client-owned. Its hide/show state toggles a class on the app shell, letting CSS move the main chat window and composer into the freed space without a server round-trip.
