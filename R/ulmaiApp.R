example = function() {
  library(ulmai)
  restore.point.options(display.restore.point = TRUE)
  main_dir = "C:/libraries/ulmai/ulmai_main"
  app = ulmaiApp(main_dir)
  viewApp(app)

}


ulmaiApp = function(main_dir, uses_fake_ai=TRUE) {
  app = eventsApp()
  glob = app$glob
  glob$main_dir = main_dir
  glob$uses_fake_ai = uses_fake_ai


  app$ui = fluidPage(
    #selectizeHeaders(),
    #jqueryLayoutHeader(),
    #tags$head(tags$style(HTML())),
    #fontawesomeDependency(),
    tags$h2("Ulm AI App"),
    uiOutput("main_ui")
  )

  #lomo = loginModule(container.id = "mainUI", ..., login.fun = stuko.login.fun)

  appInitHandler(function(...) {
    restore.point("ulmai_init")
    uai_init_app()
    #initLoginDispatch(lomo)
  })
  app
}

# uai stands for ai app
uai_init_app = function(app=getApp()) {
  restore.point("ulmai_init_app")
  uai_set_teacher_ui()
}


uai_set_teacher_ui = function(app=getApp()) {
  ui = tagList(
    tags$p("Text input"),
    textInput("chat1","Enter your question", value="")
  )
  setUI("main_ui", ui)
  dsetUI("main_ui", ui)
}

uai_uses_fake_ai = function() {
  app = getApp()
  isTRUE(app$glob$uses_fake_ai)
}


