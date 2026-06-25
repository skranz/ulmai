(function () {
  var state = {
    mediaRecorder: null,
    stream: null,
    chunks: [],
    startedAt: null,
    timerId: null,
    shouldSave: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function init() {
    var cancelButton = byId("uai_recording_cancel");
    var finishButton = byId("uai_recording_finish");

    if (cancelButton) {
      cancelButton.addEventListener("click", cancelRecording);
    }
    if (finishButton) {
      finishButton.addEventListener("click", finishRecording);
    }
  }

  async function startRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === "recording") return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
      showRecordingNotice("Recording is not supported in this browser.");
      return;
    }

    try {
      state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.chunks = [];
      state.shouldSave = false;
      state.mediaRecorder = new MediaRecorder(state.stream, mediaRecorderOptions());
      state.mediaRecorder.addEventListener("dataavailable", function (event) {
        if (event.data && event.data.size > 0) {
          state.chunks.push(event.data);
        }
      });
      state.mediaRecorder.addEventListener("stop", handleRecordingStopped);
      state.mediaRecorder.start();
      showRecordingUi();
      startTimer();
    } catch (error) {
      showRecordingNotice("Microphone access was denied.");
    }
  }

  function mediaRecorderOptions() {
    var types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4"
    ];
    var match = types.find(function (type) {
      return MediaRecorder.isTypeSupported(type);
    });
    return match ? { mimeType: match } : {};
  }

  function finishRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") return;
    state.shouldSave = true;
    setAudioStatus("Saving...");
    state.mediaRecorder.stop();
  }

  function cancelRecording() {
    if (!state.mediaRecorder || state.mediaRecorder.state !== "recording") {
      resetRecordingUi();
      return;
    }
    state.shouldSave = false;
    state.mediaRecorder.stop();
  }

  function handleRecordingStopped() {
    stopTimer();
    stopStream();

    if (!state.shouldSave) {
      state.chunks = [];
      resetRecordingUi();
      return;
    }

    var blob = new Blob(state.chunks, { type: recordingType() });
    state.chunks = [];
    uploadRecording(blob);
  }

  function uploadRecording(blob) {
    var input = byId("uai_audio_upload");
    if (!input) {
      setAudioStatus("Audio upload input is missing.");
      resetRecordingUiSoon();
      return;
    }

    var file = new File(
      [blob],
      "recording-" + timestampForFileName() + recordingExtension(blob.type),
      { type: blob.type || "audio/webm" }
    );

    if (typeof DataTransfer === "undefined") {
      setAudioStatus("Audio upload is not supported in this browser.");
      resetRecordingUiSoon();
      return;
    }

    var transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function recordingType() {
    if (state.mediaRecorder && state.mediaRecorder.mimeType) {
      return state.mediaRecorder.mimeType;
    }
    return "audio/webm";
  }

  function recordingExtension(type) {
    if (/mp4/.test(type)) return ".m4a";
    if (/ogg/.test(type)) return ".ogg";
    return ".webm";
  }

  function timestampForFileName() {
    return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  }

  function showRecordingUi() {
    var composer = document.querySelector(".uai-composer");
    var voiceButton = byId("uai_voice_btn");
    if (composer) composer.classList.add("uai-composer-recording");
    if (voiceButton) {
      voiceButton.classList.add("uai-voice-active");
      voiceButton.setAttribute("aria-pressed", "true");
    }
    setAudioStatus("Recording");
  }

  function showRecordingNotice(text) {
    showRecordingUi();
    stopTimer();
    setTimerText("0:00");
    setAudioStatus(text);
    resetRecordingUiSoon();
  }

  function resetRecordingUi() {
    var composer = document.querySelector(".uai-composer");
    var voiceButton = byId("uai_voice_btn");
    if (composer) composer.classList.remove("uai-composer-recording");
    if (voiceButton) {
      voiceButton.classList.remove("uai-voice-active");
      voiceButton.setAttribute("aria-pressed", "false");
    }
    state.mediaRecorder = null;
    state.shouldSave = false;
    setTimerText("0:00");
    setAudioStatus("Recording");
  }

  function resetRecordingUiSoon() {
    window.setTimeout(resetRecordingUi, 1400);
  }

  function startTimer() {
    state.startedAt = Date.now();
    setTimerText("0:00");
    stopTimer();
    state.timerId = window.setInterval(function () {
      var elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
      var minutes = Math.floor(elapsed / 60);
      var seconds = String(elapsed % 60).padStart(2, "0");
      setTimerText(minutes + ":" + seconds);
    }, 250);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function setTimerText(text) {
    var timer = byId("uai_recording_timer");
    if (timer) timer.textContent = text;
  }

  function setAudioStatus(text) {
    var label = document.querySelector(".uai-recording-label");
    if (label) label.textContent = text;
  }

  function stopStream() {
    if (!state.stream) return;
    state.stream.getTracks().forEach(function (track) {
      track.stop();
    });
    state.stream = null;
  }

  function receiveStoredAudio(records) {
    var record = records && records.length ? records[records.length - 1] : null;
    if (record) {
      setAudioStatus("Saved");
      window.UlmAI = window.UlmAI || {};
      window.UlmAI.lastAudioRecording = record;
    }
    resetRecordingUiSoon();
  }

  window.UlmAIAudio = window.UlmAIAudio || {};
  window.UlmAIAudio.startRecording = startRecording;
  window.UlmAIAudio.cancelRecording = cancelRecording;
  window.UlmAIAudio.finishRecording = finishRecording;
  window.UlmAIAudio.receiveStoredAudio = receiveStoredAudio;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
