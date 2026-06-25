uai_audio_dir = function(main_dir) {
  restore.point("uai_audio_dir")
  file.path(main_dir, "audio")
}


uai_register_audio_handlers = function(app=getApp()) {
  restore.point("uai_register_audio_handlers")
  changeHandler(
    id = "uai_audio_upload",
    fun = uai_handle_audio_upload,
    app = app
  )
  invisible(TRUE)
}


uai_handle_audio_upload = function(id, value, session, app=getApp(), ...) {
  restore.point("uai_handle_audio_upload")
  if (is.null(value) || NROW(value) == 0) return(invisible(NULL))

  audio_dir = uai_session_audio_dir(session=session, app=app)
  dir.create(audio_dir, recursive=TRUE, showWarnings=FALSE)

  clean_names = uai_clean_file_name(value$name)
  audio_ids = paste0(
    "audio_",
    format(Sys.time(), "%Y%m%d%H%M%S"),
    "_",
    seq_len(NROW(value))
  )
  target_names = paste0(audio_ids, "_", clean_names)
  target_paths = file.path(audio_dir, target_names)
  copied = file.copy(value$datapath, target_paths, overwrite=TRUE)
  if (!any(copied)) return(invisible(NULL))

  session_dir = basename(audio_dir)
  urls = paste("ulmai-audio", session_dir, target_names, sep="/")
  records = Map(
    f = uai_audio_record,
    id = audio_ids[copied],
    name = clean_names[copied],
    size = value$size[copied],
    type = value$type[copied],
    path = normalizePath(target_paths[copied], winslash="/", mustWork=FALSE),
    url = urls[copied]
  )

  app$glob$last_audio_recording = records[[length(records)]]
  callJS(
    .fun = "window.UlmAIAudio.receiveStoredAudio",
    .args = list(records),
    .app = app
  )
  invisible(records)
}


uai_audio_record = function(id, name, size, type, path, url) {
  restore.point("uai_audio_record")
  list(
    id = id,
    name = name,
    size = size,
    type = type,
    path = path,
    url = url
  )
}


uai_session_audio_dir = function(session, app=getApp()) {
  restore.point("uai_session_audio_dir")
  file.path(app$glob$audio_dir, uai_session_dir_name(session=session))
}
