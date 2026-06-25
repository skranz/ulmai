example = function() {
  restore.point("example")
  library(ulmai)
  restore.point.options(display.restore.point = TRUE)
  main_dir = "C:/libraries/ulmai/ulmai_main"
  app = ulmaiApp(main_dir)
  viewApp(app)
}


ulmaiApp = function(main_dir, uses_fake_ai=TRUE) {
  restore.point("ulmaiApp")
  app = eventsApp()
  glob = app$glob
  glob$main_dir = main_dir
  glob$uses_fake_ai = uses_fake_ai
  glob$uploads_dir = uai_uploads_dir(main_dir)

  uai_add_resource_paths(main_dir=main_dir)
  app$ui = uai_app_ui()
  uai_register_handlers(app=app)

  appInitHandler(function(...) {
    restore.point("ulmai_init")
    uai_init_app()
  })
  app
}


uai_add_resource_paths = function(main_dir) {
  restore.point("uai_add_resource_paths")
  www_dir = uai_www_dir()
  uploads_dir = uai_uploads_dir(main_dir)
  dir.create(uploads_dir, recursive=TRUE, showWarnings=FALSE)

  shiny::addResourcePath(prefix="ulmai", directoryPath=www_dir)
  shiny::addResourcePath(prefix="ulmai-uploads", directoryPath=uploads_dir)
  invisible(TRUE)
}


uai_www_dir = function() {
  restore.point("uai_www_dir")
  www_dir = system.file("www", package="ulmai")
  if (nzchar(www_dir)) return(www_dir)

  src_dir = file.path(getwd(), "inst", "www")
  if (dir.exists(src_dir)) return(normalizePath(src_dir, winslash="/"))

  stop("Cannot find ulmai www assets.")
}


uai_uploads_dir = function(main_dir) {
  restore.point("uai_uploads_dir")
  file.path(main_dir, "uploads")
}


uai_init_storage = function(main_dir, app=getApp()) {
  restore.point("uai_init_storage")
  dir.create(main_dir, recursive=TRUE, showWarnings=FALSE)
  dir.create(app$glob$uploads_dir, recursive=TRUE, showWarnings=FALSE)
  invisible(TRUE)
}


uai_register_handlers = function(app=getApp()) {
  restore.point("uai_register_handlers")
  eventHandler(
    eventId = "uai_submit_chat_event",
    id = NULL,
    fun = uai_handle_chat_submit,
    app = app
  )
  changeHandler(
    id = "uai_image_upload",
    fun = uai_handle_image_upload,
    app = app
  )
  invisible(TRUE)
}


uai_app_ui = function() {
  restore.point("uai_app_ui")
  intro = uai_intro_msg()
  tagList(
    tags$head(
      tags$meta(name="viewport", content="width=device-width, initial-scale=1"),
      tags$link(rel="stylesheet", type="text/css", href="ulmai/ulmai-chat.css"),
      tags$script(src="ulmai/ulmai-chat.js")
    ),
    tags$div(
      class = "uai-fluid",
      tags$div(
        id = "uai_app",
        class = "uai-app",
        tags$aside(
          class = "uai-sidebar",
          tags$button(
            id = "uai_sidebar_close",
            class = "uai-icon-button uai-sidebar-close",
            type = "button",
            `aria-label` = "Hide sidebar",
            title = "Hide sidebar",
            HTML(uai_icon_svg("panel"))
          ),
          tags$div(
            class = "uai-brand",
            tags$div(class="uai-brand-title", "UlmAI"),
            tags$div(class="uai-brand-note", "created by Sebastian Kranz")
          )
        ),
        tags$main(
          class = "uai-main",
          tags$header(
            class = "uai-topbar",
            tags$button(
              id = "uai_sidebar_toggle",
              class = "uai-icon-button uai-sidebar-toggle",
              type = "button",
              `aria-label` = "Toggle sidebar",
              title = "Show sidebar",
              HTML(uai_icon_svg("panel"))
            ),
            tags$div(class="uai-chat-title", "Example chat"),
            tags$div(class="uai-topbar-actions")
          ),
          tags$section(
            id = "uai_chat_messages",
            class = "uai-chat-messages",
            `data-intro-role` = intro$role,
            `data-intro-text` = intro$text,
            `data-intro-meta` = intro$meta
          ),
          uai_composer_ui()
        ),
        tags$input(
          id = "uai_image_upload",
          class = "uai-file-input",
          type = "file",
          accept = "image/*",
          multiple = "multiple"
        )
      )
    )
  )
}


uai_intro_msg = function() {
  restore.point("uai_intro_msg")
  list(
    role = "assistant",
    meta = "Thought for a couple of seconds",
    text = "Hi! I am UlmAI. What would you like to try today?"
  )
}


uai_composer_ui = function() {
  restore.point("uai_composer_ui")
  tags$footer(
    class = "uai-composer-wrap",
    tags$div(
      id = "uai_upload_preview",
      class = "uai-upload-preview",
      `aria-live` = "polite"
    ),
    tags$div(
      class = "uai-composer",
      tags$button(
        id = "uai_upload_btn",
        class = "uai-icon-button",
        type = "button",
        `aria-label` = "Upload image",
        title = "Upload image",
        HTML(uai_icon_svg("image"))
      ),
      tags$textarea(
        id = "uai_chat_input",
        class = "uai-chat-input",
        rows = "1",
        placeholder = "Ask anything",
        `aria-label` = "Chat message"
      ),
      tags$select(
        id = "uai_model_select",
        class = "uai-model-select",
        `aria-label` = "Model",
        title = "Choose model",
        tags$option(value="high", selected="selected", "High"),
        tags$option(value="fast", "Fast"),
        tags$option(value="local", "Local")
      ),
      tags$button(
        id = "uai_voice_btn",
        class = "uai-icon-button",
        type = "button",
        `aria-label` = "Voice recording",
        title = "Voice input",
        HTML(uai_icon_svg("mic"))
      ),
      tags$button(
        id = "uai_submit_btn",
        class = "uai-submit-button",
        type = "button",
        `aria-label` = "Submit chat",
        title = "Send message",
        HTML(uai_icon_svg("send"))
      )
    )
  )
}


uai_icon_svg = function(name) {
  restore.point("uai_icon_svg")
  icons = list(
    panel = '<svg class="uai-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="3"></rect><path d="M9 4v16"></path></svg>',
    image = '<svg class="uai-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"></rect><circle cx="8.5" cy="10" r="1.5"></circle><path d="M21 15l-5-5L5 19"></path></svg>',
    mic = '<svg class="uai-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><path d="M12 19v3"></path></svg>',
    send = '<svg class="uai-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>'
  )
  icons[[name]]
}


uai_init_app = function(app=getApp()) {
  restore.point("uai_init_app")
  uai_init_storage(main_dir=app$glob$main_dir, app=app)
}


uai_handle_chat_submit = function(id=NULL, text="", model=NULL, uploads=NULL,
                                  clientMessageId=NULL, assistantMessageId=NULL,
                                  session=NULL, app=getApp(), ...) {
  restore.point("uai_handle_chat_submit")
  text = paste0(text, collapse="\n")
  has_uploads = length(uploads) > 0
  if (!nzchar(trimws(text)) && !has_uploads) return(invisible(NULL))

  ai_input = if (nzchar(trimws(text))) text else "[uploaded image]"
  answer = uai_ask_ai(input=ai_input, uses_fake_ai=uai_uses_fake_ai(app=app))
  if (is.null(assistantMessageId) || !nzchar(assistantMessageId)) {
    assistantMessageId = paste0("assistant_", as.integer(runif(1, 1, 1e9)))
  }
  callJS(
    .fun = "window.UlmAI.receiveAssistantMessage",
    .args = list(assistantMessageId, answer),
    .app = app
  )
  invisible(answer)
}


uai_handle_image_upload = function(id, value, session, app=getApp(), ...) {
  restore.point("uai_handle_image_upload")
  if (is.null(value) || NROW(value) == 0) return(invisible(NULL))

  upload_dir = uai_session_upload_dir(session=session, app=app)
  dir.create(upload_dir, recursive=TRUE, showWarnings=FALSE)

  clean_names = uai_clean_file_name(value$name)
  upload_ids = paste0(
    "img_",
    format(Sys.time(), "%Y%m%d%H%M%S"),
    "_",
    seq_len(NROW(value))
  )
  target_names = paste0(upload_ids, "_", clean_names)
  target_paths = file.path(upload_dir, target_names)
  copied = file.copy(value$datapath, target_paths, overwrite=TRUE)
  if (!any(copied)) return(invisible(NULL))

  session_dir = basename(upload_dir)
  urls = paste("ulmai-uploads", session_dir, target_names, sep="/")
  records = Map(
    f = uai_upload_record,
    id = upload_ids[copied],
    name = clean_names[copied],
    size = value$size[copied],
    type = value$type[copied],
    path = normalizePath(target_paths[copied], winslash="/", mustWork=FALSE),
    url = urls[copied]
  )

  callJS(
    .fun = "window.UlmAI.receiveStoredUploads",
    .args = list(records),
    .app = app
  )
  invisible(records)
}


uai_upload_record = function(id, name, size, type, path, url) {
  restore.point("uai_upload_record")
  list(
    id = id,
    name = name,
    size = size,
    type = type,
    path = path,
    url = url
  )
}


uai_session_upload_dir = function(session, app=getApp()) {
  restore.point("uai_session_upload_dir")
  file.path(app$glob$uploads_dir, uai_session_dir_name(session=session))
}


uai_session_dir_name = function(session) {
  restore.point("uai_session_dir_name")
  token = session$token
  if (is.null(token) || !nzchar(token)) token = "session"
  uai_clean_file_name(token)
}


uai_clean_file_name = function(x) {
  restore.point("uai_clean_file_name")
  x = basename(x)
  x = gsub("[^A-Za-z0-9._-]+", "_", x)
  x = gsub("^_+|_+$", "", x)
  x[!nzchar(x)] = "upload"
  x
}


uai_uses_fake_ai = function(app=getApp()) {
  restore.point("uai_uses_fake_ai")
  isTRUE(app$glob$uses_fake_ai)
}
