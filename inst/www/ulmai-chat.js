(function () {
  var state = {
    uploads: [],
    messageIndex: 0,
    isRecording: false,
    assistantRequests: {}
  };

  var icons = {
    copy: '<svg class="uai-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M5 15V5h10"></path></svg>',
    retry: '<svg class="uai-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.35-5.65"></path><path d="M20 4v6h-6"></path></svg>',
    more: '<svg class="uai-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h.01"></path><path d="M12 12h.01"></path><path d="M18 12h.01"></path></svg>'
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function nextId(prefix) {
    state.messageIndex = state.messageIndex + 1;
    return prefix + "_" + Date.now() + "_" + state.messageIndex;
  }

  function init() {
    var messages = byId("uai_chat_messages");
    var input = byId("uai_chat_input");
    var submitButton = byId("uai_submit_btn");
    var uploadButton = byId("uai_upload_btn");
    var fileInput = byId("uai_image_upload");
    var voiceButton = byId("uai_voice_btn");
    var sidebarClose = byId("uai_sidebar_close");
    var sidebarToggle = byId("uai_sidebar_toggle");

    if (!messages || !input || !submitButton) return;

    mountIntro(messages);
    resizeInput(input);
    updateSubmitState();

    input.addEventListener("input", function () {
      resizeInput(input);
      updateSubmitState();
    });

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitChat();
      }
    });

    submitButton.addEventListener("click", submitChat);

    if (uploadButton && fileInput) {
      uploadButton.addEventListener("click", function () {
        fileInput.click();
      });
      fileInput.addEventListener("change", function () {
        addLocalUploads(Array.prototype.slice.call(fileInput.files || []));
        updateSubmitState();
      });
    }

    if (voiceButton) {
      voiceButton.addEventListener("click", toggleVoiceButton);
    }

    if (sidebarClose) {
      sidebarClose.addEventListener("click", function () {
        setSidebarHidden(true);
      });
    }

    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", function () {
        setSidebarHidden(false);
      });
    }
  }

  function mountIntro(messages) {
    var text = messages.getAttribute("data-intro-text") || "";
    var meta = messages.getAttribute("data-intro-meta") || "";
    if (!text) return;
    appendAssistantMessage({
      id: "uai_intro_message",
      text: text,
      meta: meta
    });
  }

  function resizeInput(input) {
    input.style.height = "auto";
    var minHeight = parseFloat(window.getComputedStyle(input).minHeight) || 38;
    input.style.height = Math.max(minHeight, Math.min(input.scrollHeight, 170)) + "px";
  }

  function updateSubmitState() {
    var input = byId("uai_chat_input");
    var submitButton = byId("uai_submit_btn");
    if (!input || !submitButton) return;
    submitButton.disabled = input.value.trim().length === 0 && state.uploads.length === 0;
  }

  function submitChat() {
    var input = byId("uai_chat_input");
    var modelSelect = byId("uai_model_select");
    if (!input) return;

    var text = input.value.trim();
    var uploads = state.uploads.slice();
    if (!text && uploads.length === 0) return;

    var clientMessageId = nextId("user");
    var assistantMessageId = nextId("assistant");
    var payload = {
      id: "uai_submit_chat",
      clientMessageId: clientMessageId,
      assistantMessageId: assistantMessageId,
      text: text,
      model: modelSelect ? modelSelect.value : null,
      uploads: uploads.map(function (upload) {
        return {
          id: upload.serverId || upload.localId,
          name: upload.name,
          size: upload.size,
          type: upload.type
        };
      }),
      nonce: Math.random()
    };

    appendUserMessage({
      id: clientMessageId,
      text: text,
      uploads: uploads
    });
    appendAssistantMessage({
      id: assistantMessageId,
      text: "Thinking...",
      meta: "Thinking",
      thinking: true
    });

    input.value = "";
    resizeInput(input);
    clearUploads();
    updateSubmitState();
    scrollMessagesToBottom();

    state.assistantRequests[assistantMessageId] = payload;
    sendChatEvent(payload);
  }

  function sendChatEvent(payload) {
    if (window.Shiny && Shiny.setInputValue) {
      Shiny.setInputValue("uai_submit_chat_event", payload, { priority: "event" });
      return;
    }
    if (window.Shiny && Shiny.onInputChange) {
      Shiny.onInputChange("uai_submit_chat_event", payload);
      return;
    }
    window.setTimeout(function () {
      receiveAssistantMessage(payload.assistantMessageId, "Fake AI answer to:\n" + payload.text);
    }, 450);
  }

  function appendUserMessage(message) {
    var messages = byId("uai_chat_messages");
    var article = document.createElement("article");
    var bubble = document.createElement("div");

    article.id = message.id;
    article.className = "uai-message uai-message-user";
    bubble.className = "uai-bubble";

    if (message.uploads && message.uploads.length) {
      bubble.appendChild(renderAttachments(message.uploads));
    }
    if (message.text) {
      bubble.appendChild(textBlock(message.text));
    }

    article.appendChild(bubble);
    messages.appendChild(article);
    scrollMessagesToBottom();
  }

  function appendAssistantMessage(message) {
    var messages = byId("uai_chat_messages");
    var article = document.createElement("article");
    var bubble = document.createElement("div");
    var text = document.createElement("div");

    article.id = message.id;
    article.className = "uai-message uai-message-assistant";
    if (message.thinking) article.classList.add("uai-thinking");

    bubble.className = "uai-bubble";

    if (message.meta) {
      var meta = document.createElement("div");
      meta.className = "uai-message-meta";
      meta.textContent = message.meta;
      bubble.appendChild(meta);
    }

    text.className = "uai-message-text";
    text.textContent = message.text || "";
    bubble.appendChild(text);

    if (!message.thinking) {
      bubble.appendChild(renderAssistantActions(message.id, message.text || ""));
    }

    article.appendChild(bubble);
    messages.appendChild(article);
    scrollMessagesToBottom();
  }

  function renderAssistantActions(messageId, text) {
    var actions = document.createElement("div");
    var canRetry = Boolean(state.assistantRequests[messageId]);
    actions.className = "uai-message-actions";
    actions.appendChild(miniAction("Copy", icons.copy, function () {
      copyText(text);
    }));
    actions.appendChild(miniAction("Redo", icons.retry, function () {
      retryAssistantMessage(messageId);
    }, !canRetry));
    actions.appendChild(miniAction("More", icons.more, function () {}));
    return actions;
  }

  function miniAction(label, icon, onClick, disabled) {
    var button = document.createElement("button");
    button.className = "uai-mini-action";
    button.type = "button";
    button.setAttribute("aria-label", label);
    button.innerHTML = icon;
    button.disabled = Boolean(disabled);
    if (!disabled) button.addEventListener("click", onClick);
    return button;
  }

  function copyText(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      return;
    }

    var textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  function retryAssistantMessage(messageId) {
    var payload = state.assistantRequests[messageId];
    var article = byId(messageId);
    if (!payload || !article) return;

    var messageText = article.querySelector(".uai-message-text");
    var actions = article.querySelector(".uai-message-actions");
    var meta = article.querySelector(".uai-message-meta");

    article.classList.add("uai-thinking");
    if (meta) meta.remove();
    if (actions) actions.remove();
    if (messageText) messageText.textContent = "Thinking...";

    payload.nonce = Math.random();
    sendChatEvent(payload);
  }

  function textBlock(text) {
    var block = document.createElement("div");
    block.textContent = text;
    return block;
  }

  function renderAttachments(uploads) {
    var wrap = document.createElement("div");
    wrap.className = "uai-attachments";
    uploads.forEach(function (upload) {
      if (!upload.previewUrl) return;
      var image = document.createElement("img");
      image.className = "uai-attachment-thumb";
      image.alt = upload.name || "Uploaded image";
      image.src = upload.previewUrl;
      wrap.appendChild(image);
    });
    return wrap;
  }

  function addLocalUploads(files) {
    files
      .filter(function (file) {
        return /^image\//.test(file.type || "");
      })
      .forEach(function (file) {
        var localId = nextId("upload");
        var reader = new FileReader();
        var upload = {
          localId: localId,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl: ""
        };
        state.uploads.push(upload);
        reader.onload = function (event) {
          upload.previewUrl = event.target.result;
          renderUploadPreview();
        };
        reader.readAsDataURL(file);
      });
    renderUploadPreview();
  }

  function renderUploadPreview() {
    var preview = byId("uai_upload_preview");
    if (!preview) return;

    preview.innerHTML = "";
    preview.classList.toggle("has-items", state.uploads.length > 0);

    state.uploads.forEach(function (upload) {
      var item = document.createElement("div");
      var image = document.createElement("img");
      var remove = document.createElement("button");

      item.className = "uai-preview-item";
      image.alt = upload.name || "Upload preview";
      image.src = upload.previewUrl || "";
      remove.className = "uai-preview-remove";
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove upload");
      remove.textContent = "x";
      remove.addEventListener("click", function () {
        state.uploads = state.uploads.filter(function (candidate) {
          return candidate.localId !== upload.localId;
        });
        renderUploadPreview();
        updateSubmitState();
      });

      item.appendChild(image);
      item.appendChild(remove);
      preview.appendChild(item);
    });
  }

  function clearUploads() {
    var fileInput = byId("uai_image_upload");
    state.uploads = [];
    if (fileInput) fileInput.value = "";
    renderUploadPreview();
  }

  function receiveStoredUploads(records) {
    if (!records || !records.length) return;
    records.forEach(function (record) {
      var match = state.uploads.find(function (upload) {
        return !upload.serverId && upload.size === record.size;
      });
      if (match) {
        match.serverId = record.id;
        match.storedUrl = record.url;
      }
    });
  }

  function receiveAssistantMessage(messageId, text) {
    var article = byId(messageId);
    if (!article) {
      appendAssistantMessage({
        id: messageId || nextId("assistant"),
        text: text || "",
        meta: ""
      });
      return;
    }

    article.classList.remove("uai-thinking");
    var meta = article.querySelector(".uai-message-meta");
    var messageText = article.querySelector(".uai-message-text");
    var bubble = article.querySelector(".uai-bubble");

    if (meta) meta.remove();
    if (messageText) messageText.textContent = text || "";
    if (bubble && !bubble.querySelector(".uai-message-actions")) {
      bubble.appendChild(renderAssistantActions(messageId, text || ""));
    }
    scrollMessagesToBottom();
  }

  function setSidebarHidden(hidden) {
    var app = byId("uai_app");
    if (!app) return;
    app.classList.toggle("uai-sidebar-hidden", Boolean(hidden));
  }

  function toggleVoiceButton() {
    var voiceButton = byId("uai_voice_btn");
    if (!voiceButton) return;
    state.isRecording = !state.isRecording;
    voiceButton.classList.toggle("uai-voice-active", state.isRecording);
    voiceButton.setAttribute("aria-pressed", state.isRecording ? "true" : "false");
  }

  function scrollMessagesToBottom() {
    var messages = byId("uai_chat_messages");
    if (!messages) return;
    messages.scrollTop = messages.scrollHeight;
  }

  window.UlmAI = window.UlmAI || {};
  window.UlmAI.receiveAssistantMessage = receiveAssistantMessage;
  window.UlmAI.receiveStoredUploads = receiveStoredUploads;
  window.UlmAI.setSidebarHidden = setSidebarHidden;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
