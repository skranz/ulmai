uai_clean_user_name = function(username) {
  restore.point("uai_clean_user_name")
  username = paste0(username)[1]
  username = gsub("[^A-Za-z0-9._-]+", "_", username)
  username = gsub("^_+|_+$", "", username)
  if (!nzchar(username)) username = "user"
  username
}


uai_normalize_role = function(role) {
  restore.point("uai_normalize_role")
  role = tolower(paste0(role)[1])
  if (!role %in% c("teacher", "student")) {
    stop("role must be 'teacher' or 'student'.")
  }
  role
}


uai_user_dir = function(main_dir, username) {
  restore.point("uai_user_dir")
  file.path(main_dir, "users", username)
}


uai_role_user_dir = function(main_dir, username, role) {
  restore.point("uai_role_user_dir")
  file.path(main_dir, paste0(role, "s"), username)
}


uai_init_user_dirs = function(app=getApp()) {
  restore.point("uai_init_user_dirs")
  dirs = c(
    app$glob$user_dir,
    uai_role_user_dir(main_dir=app$glob$main_dir, username=app$glob$username, role="teacher"),
    uai_role_user_dir(main_dir=app$glob$main_dir, username=app$glob$username, role="student")
  )
  vapply(dirs, dir.create, logical(1), recursive=TRUE, showWarnings=FALSE)
  invisible(dirs)
}
